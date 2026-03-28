import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.setState({ errorInfo: info.componentStack || "" });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-semibold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: "" })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
