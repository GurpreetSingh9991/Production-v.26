// components/ErrorBoundary.tsx
// Catches errors and prevents white screen crashes

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error Boundary caught error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Log to your error tracking service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-black/5">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black tracking-tight text-black text-center mb-2">
              Something Went Wrong
            </h1>
            
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest text-center mb-6">
              Application Error
            </p>

            {/* Error Message */}
            <div className="bg-red-50 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-red-900 mb-2">
                Error Details:
              </p>
              <p className="text-xs text-red-700 font-mono break-words">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            {/* Developer Info (only in dev mode) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="text-xs font-bold text-black/60 cursor-pointer hover:text-black mb-2">
                  Stack Trace (Dev Mode)
                </summary>
                <pre className="text-[10px] bg-black/5 rounded-xl p-3 overflow-auto max-h-40 text-black/60">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform shadow-lg"
              >
                Reload App
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  this.handleReset();
                }}
                className="flex-1 px-6 py-4 bg-white text-black border-2 border-black/10 rounded-2xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform"
              >
                Clear & Reload
              </button>
            </div>

            {/* Help Text */}
            <p className="text-[10px] text-black/40 text-center mt-6">
              If this keeps happening, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
