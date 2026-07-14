import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    // Later: send to observability if needed
    console.error('ErrorBoundary caught error', error);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 16, color: '#ff6b6b' }}>Something went wrong: {this.state.message}</div>;
    }
    return this.props.children;
  }
}
