import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  children: ReactNode;
  /** Optional fallback UI. If omitted, the built-in error card is shown. */
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * React error boundary that catches unhandled rendering errors in its
 * subtree and displays a graceful fallback instead of a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface errors to the console so monitoring tools (Sentry, etc.) can pick
    // them up without crashing the whole application.
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          padding: "2rem",
          gap: "1rem",
          color: "var(--text-primary, #e2e8f0)",
          background: "var(--bg-darker, #0f172a)",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "2.5rem" }} role="img" aria-label="Error">⚡</span>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
          Something went wrong
        </h2>
        <p style={{ margin: 0, color: "rgba(200,220,255,0.6)", maxWidth: 420 }}>
          {error?.message ?? "An unexpected error occurred in this section."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 6,
              border: "1px solid rgba(136,204,255,0.35)",
              background: "rgba(136,204,255,0.08)",
              color: "#88ccff",
              cursor: "pointer",
              fontSize: "0.9rem",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(136,204,255,0.45)"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          >
            Try again
          </button>
          <Link
            to="/"
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 6,
              border: "1px solid rgba(136,204,255,0.2)",
              background: "transparent",
              color: "rgba(200,220,255,0.7)",
              textDecoration: "none",
              fontSize: "0.9rem",
              outline: "none",
            }}
            onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 3px rgba(136,204,255,0.45)"; }}
            onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }
}
