import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, {
      componentStack: info?.componentStack || null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#111827' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Something went wrong</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            The error was written to the backend log file. Please refresh the page and try again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
