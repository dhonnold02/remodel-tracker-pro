import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import SightlineLogo from "@/components/SightlineLogo";

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
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 space-y-6">
          <SightlineLogo size={40} />
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Something went wrong
              </h3>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
            </div>
            <Button
              onClick={() => { window.location.href = "/"; }}
              className="h-11 rounded-xl w-full"
            >
              Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
