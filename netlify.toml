# ── TradeFlow Studio — Netlify Configuration ──────────────────────────────────

[build]
  command = "npm run build"
  publish = "dist"

# SPA routing: all paths serve index.html (required for React Router)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

# Cache icons and assets aggressively
[[headers]]
  for = "/icon.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=86400"
    Content-Type = "application/manifest+json"

# ── Scheduled Functions ───────────────────────────────────────────────────────
[functions."weekly-insights"]
  schedule = "0 18 * * 5"
  # Runs every Friday at 18:00 UTC (after US market close = 1pm EST / 2pm EDT)
  # Generates AI insights for all Pro users automatically
