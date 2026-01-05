
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorKey: number; // Used to force reset
}

class ErrorBoundary extends Component<Props, State> {
    private lastHash: string = '';

    public state: State = {
        hasError: false,
        errorKey: 0
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public componentDidMount() {
        // Listen for hash changes to reset error state
        this.lastHash = window.location.hash;
        window.addEventListener('hashchange', this.handleHashChange);
    }

    public componentWillUnmount() {
        window.removeEventListener('hashchange', this.handleHashChange);
    }

    private handleHashChange = () => {
        // Reset error state when navigating to a different page
        if (this.lastHash !== window.location.hash) {
            this.lastHash = window.location.hash;
            if (this.state.hasError) {
                this.setState({ hasError: false, error: undefined, errorKey: this.state.errorKey + 1 });
            }
        }
    };

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorKey: this.state.errorKey + 1 });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center bg-red-50 rounded-lg m-4 border border-red-200">
                    <h2 className="text-2xl font-bold text-red-800 mb-2">אופס! משהו השתבש.</h2>
                    <p className="text-red-600 mb-4">{this.state.error?.message || 'שגיאה לא צפויה התרחשה.'}</p>
                    <div className="flex gap-3">
                        <button
                            className="px-4 py-2 bg-royal-blue text-white rounded hover:bg-blue-700 transition-colors"
                            onClick={this.handleRetry}
                        >
                            נסה שוב
                        </button>
                        <button
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            רענן את הדף
                        </button>
                    </div>
                </div>
            );
        }

        return <React.Fragment key={this.state.errorKey}>{this.props.children}</React.Fragment>;
    }
}

export default ErrorBoundary;

