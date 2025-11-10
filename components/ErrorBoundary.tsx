
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { XCircleIcon } from './icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
            <XCircleIcon className="w-20 h-20 text-red-600 mx-auto mb-6"/>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">משהו השתבש</h1>
            <p className="text-lg text-gray-600 mb-8">אירעה שגיאה בלתי צפויה באפליקציה</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              טען מחדש
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
