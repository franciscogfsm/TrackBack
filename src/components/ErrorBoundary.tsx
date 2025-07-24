import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "./ThemeProvider";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
}

function DefaultErrorFallback({ error }: DefaultErrorFallbackProps) {
  const { theme } = useTheme();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div
      className={clsx(
        "min-h-screen flex items-center justify-center p-4",
        theme === "dark" ? "bg-slate-900" : "bg-gray-50"
      )}
    >
      <div
        className={clsx(
          "max-w-md w-full rounded-2xl p-8 text-center shadow-xl",
          theme === "dark"
            ? "bg-slate-800 border border-slate-700"
            : "bg-white border border-gray-200"
        )}
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h3
          className={clsx(
            "text-lg font-semibold mb-2",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          Something went wrong
        </h3>

        <p
          className={clsx(
            "text-sm mb-6",
            theme === "dark" ? "text-slate-400" : "text-gray-600"
          )}
        >
          {error?.message ||
            "An unexpected error occurred. Please try refreshing the page."}
        </p>

        <button
          onClick={handleRetry}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-blue-600 hover:bg-blue-700 text-white"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
