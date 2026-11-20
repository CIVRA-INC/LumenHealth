import React from "react";

export interface AbdulrcrtwErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: { componentStack?: string }) => void;
  fallback?: React.ReactNode;
}

interface State { hasError: boolean }

export class AbdulrcrtwRootErrorBoundary extends React.Component<AbdulrcrtwErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>The app hit an unexpected error. You can try again safely.</p>
          <button type="button" onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function createAbdulrcrtwErrorBoundaryElement(props: AbdulrcrtwErrorBoundaryProps) {
  return React.createElement(AbdulrcrtwRootErrorBoundary, props);
}
