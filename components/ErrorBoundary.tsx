import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI crash:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
          <div className="max-w-md border border-red-800 bg-red-950/40 p-6 text-center font-mono text-sm">
            <p className="text-red-300">SYSTEM FAILURE DETECTED.</p>
            <p className="mt-2 text-neutral-400">Reload to reinitialize core processes.</p>
            <button
              onClick={this.handleReload}
              className="mt-4 rounded border border-red-600 px-4 py-2 text-xs text-red-200 hover:bg-red-900/40"
            >
              RELOAD SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
