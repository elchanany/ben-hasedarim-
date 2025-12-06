
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center bg-red-50 rounded-lg m-4 border border-red-200">
                    <h2 className="text-2xl font-bold text-red-800 mb-2">אופס! משהו השתבש.</h2>
                    <p className="text-red-600 mb-4">{this.state.error?.message || 'שגיאה לא צפויה התרחשה.'}</p>
                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        רענן את הדף
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
