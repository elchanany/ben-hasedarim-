
import React, { Component, ErrorInfo, ReactNode } from 'react';

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
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '2rem', 
          textAlign: 'center',
          fontFamily: 'Assistant, sans-serif',
          backgroundColor: '#F8F9FA',
          color: '#212529'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0A2463' }}>משהו השתבש.</h1>
          <p style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>אירעה שגיאה בלתי צפויה באפליקציה.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: '#0A2463',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#081c4a')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0A2463')}
          >
            טען מחדש
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
