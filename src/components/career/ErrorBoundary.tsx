import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the full-page error screen. Use for non-critical widgets. */
  fallback?: ReactNode;
  /** Label used in the console so the failing surface is identifiable. */
  label?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Unexpected application error${this.props.label ? ` (${this.props.label})` : ""}`, error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;


    return (
      <main className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not load this view. Refresh the page or return home and try again.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }
}
