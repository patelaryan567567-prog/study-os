import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "@/utils/errors";

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(`Unhandled render error${info.componentStack ?? ""}`, error);
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="glass max-w-md rounded-2xl p-6 text-center">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {this.props.title ?? "Something went wrong"}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
