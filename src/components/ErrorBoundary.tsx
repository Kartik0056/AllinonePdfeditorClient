/**
 * ErrorBoundary - Catch and display user-friendly recovery UI instead of blank screen
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6 text-center">
          <div className="card max-w-md w-full p-8 border-red-500/20 shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-surface-400 text-xs mb-6">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Page
              </button>
              <a
                href="/"
                className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 text-surface-300"
              >
                <Home className="w-3.5 h-3.5" /> Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
