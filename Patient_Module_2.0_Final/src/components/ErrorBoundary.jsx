import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SwasthSetu ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            maxWidth: '540px',
            margin: '40px auto',
            padding: '28px',
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--main-text)', margin: '0 0 8px 0' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted-text)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            We encountered a temporary issue while loading this consultation view. Your saved session data is preserved.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '10px 18px' }}
            >
              <RotateCcw size={15} />
              <span>Reload Screen</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '10px 18px' }}
            >
              <Home size={15} />
              <span>Back to Portal</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
