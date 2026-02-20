
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches any unhandled render errors and shows a clean recovery screen
// instead of a blank white page.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[TradeFlow ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '32px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: '#f5f5f5', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{
            fontWeight: '900', fontSize: '20px', color: '#111',
            marginBottom: '8px', letterSpacing: '-0.02em',
          }}>
            Something went wrong
          </h2>
          <p style={{
            color: '#888', fontSize: '13px', marginBottom: '8px',
            maxWidth: '340px', lineHeight: '1.6',
          }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <p style={{ color: '#bbb', fontSize: '11px', marginBottom: '28px' }}>
            Your trade data is safe — this is a display error only.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px', background: '#111', color: '#fff',
                border: 'none', borderRadius: '12px', fontWeight: '700',
                fontSize: '13px', cursor: 'pointer', letterSpacing: '0.02em',
              }}
            >
              Reload App
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                padding: '12px 24px', background: '#fff', color: '#888',
                border: '1px solid #e0e0e0', borderRadius: '12px', fontWeight: '700',
                fontSize: '13px', cursor: 'pointer', letterSpacing: '0.02em',
              }}
            >
              Clear Cache &amp; Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Mount ────────────────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
