import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      let isOfflineError = errorMessage.includes('client is offline');
      
      try {
        // Try to parse as JSON in case it's our custom Firestore error
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
          isOfflineError = errorMessage.includes('client is offline');
        }
      } catch (e) {
        // Not JSON, use as is
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full border border-red-100">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            
            {isOfflineError ? (
              <div className="text-slate-600 mb-6 space-y-3">
                <p><strong>Could not connect to Firebase Firestore.</strong></p>
                <p>This usually means that the Firestore Database has not been created yet in your Firebase project.</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Firebase Console</a></li>
                  <li>Select your project (<code>commission-b0f06</code>)</li>
                  <li>Click on <strong>Firestore Database</strong> in the left sidebar</li>
                  <li>Click <strong>Create database</strong></li>
                  <li>Start in <strong>Test mode</strong> or <strong>Production mode</strong></li>
                  <li>Choose a location and click <strong>Enable</strong></li>
                </ol>
              </div>
            ) : (
              <p className="text-slate-600 mb-6">{errorMessage}</p>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
