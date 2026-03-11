/**
 * TradeFlow Image Upload Worker
 * Cloudflare Worker that:
 *  1. Verifies the user's Supabase JWT
 *  2. Returns a presigned R2 URL for direct browser upload
 *  3. Handles CORS for web + iOS
 *
 * Deploy: wrangler deploy
 * Env vars to set in Cloudflare dashboard (or wrangler.toml secrets):
 *   - SUPABASE_JWT_SECRET   → from Supabase: Settings > API > JWT Secret
 *   - R2_BUCKET             → bound R2 bucket (set in wrangler.toml)
 *   - R2_PUBLIC_BASE_URL    → your R2 public bucket URL or custom domain
 *                             e.g. https://pub-xxxx.r2.dev  OR  https://images.yourapp.com
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  SUPABASE_JWT_SECRET: string;
  R2_PUBLIC_BASE_URL: string;
}

// ─── CORS headers (allow web app + iOS app) ──────────────────────────────────
const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
});

// ─── JWT verification (Supabase uses HS256) ──────────────────────────────────
async function verifySupabaseJWT(token: string, secret: string): Promise<{ sub: string; email: string } | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    // Verify signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = base64UrlDecode(sigB64);
    const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, dataBytes);
    if (!valid) return null;

    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const cors = corsHeaders(origin);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Auth: extract Bearer token
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'No authorization token' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // Verify Supabase JWT
    const user = await verifySupabaseJWT(token, env.SUPABASE_JWT_SECRET);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // ── POST /upload-url → generate presigned URL ──────────────────────────
    if (request.method === 'POST' && url.pathname === '/upload-url') {
      const body = await request.json() as {
        tradeId: string;
        fileName: string;
        contentType: string;
      };

      const { tradeId, fileName, contentType } = body;

      // Validate inputs
      if (!tradeId || !fileName || !contentType) {
        return new Response(JSON.stringify({ error: 'Missing tradeId, fileName, or contentType' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // Only allow images
      if (!contentType.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'Only image uploads are allowed' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // Build the R2 key: userId/tradeId/timestamp-filename
      // This double-links the image to both user and trade
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const safeFileName = `${Date.now()}.${ext}`;
      const r2Key = `${user.sub}/${tradeId}/${safeFileName}`;

      // Generate presigned URL (valid for 5 minutes — enough for upload)
      const presignedUrl = await env.R2_BUCKET.createMultipartUpload
        ? await generatePresignedUrl(env, r2Key, contentType)
        : null;

      // Fallback: use direct upload via worker proxy (see /upload endpoint below)
      // The public URL the image will be accessible at after upload
      const publicUrl = `${env.R2_PUBLIC_BASE_URL}/${r2Key}`;

      return new Response(JSON.stringify({
        uploadUrl: presignedUrl || `${url.origin}/upload`,
        r2Key,
        publicUrl,
        // If no presigned URL support, client should POST to /upload with this key
        useProxy: !presignedUrl,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // ── PUT /upload → proxy upload to R2 (fallback if presigned not available) ──
    if (request.method === 'PUT' && url.pathname === '/upload') {
      const r2Key = url.searchParams.get('key');
      if (!r2Key) {
        return new Response(JSON.stringify({ error: 'Missing key param' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // Ensure the key belongs to this user (security check)
      if (!r2Key.startsWith(`${user.sub}/`)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      const contentType = request.headers.get('Content-Type') || 'image/jpeg';
      const body = request.body;
      if (!body) {
        return new Response(JSON.stringify({ error: 'No body' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      await env.R2_BUCKET.put(r2Key, body, {
        httpMetadata: { contentType },
      });

      const publicUrl = `${env.R2_PUBLIC_BASE_URL}/${r2Key}`;
      return new Response(JSON.stringify({ publicUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // ── DELETE /delete → remove image from R2 ─────────────────────────────
    if (request.method === 'DELETE' && url.pathname === '/delete') {
      const body = await request.json() as { r2Key: string };
      const { r2Key } = body;

      if (!r2Key) {
        return new Response(JSON.stringify({ error: 'Missing r2Key' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // Security: only allow deleting own files
      if (!r2Key.startsWith(`${user.sub}/`)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      await env.R2_BUCKET.delete(r2Key);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
};

// R2 presigned URL generation (requires R2 public bucket)
async function generatePresignedUrl(env: Env, key: string, contentType: string): Promise<string | null> {
  try {
    // @ts-ignore — createPresignedUrl is available in newer CF runtime
    const url = await env.R2_BUCKET.createPresignedUrl('PUT', key, {
      expiresIn: 300, // 5 minutes
      httpMetadata: { contentType },
    });
    return url;
  } catch {
    return null;
  }
}
