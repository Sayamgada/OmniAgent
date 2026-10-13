import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[OmniAgent ErrorBoundary caught an unhandled error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center">
          <div className="relative max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive border border-destructive/30">
              <AlertTriangle className="size-6" />
            </div>
            <h2 className="mb-2 text-lg font-bold tracking-tight text-foreground">
              Workspace Component Exception
            </h2>
            <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
              An unexpected error occurred while rendering this view. You can reload the component or navigate back to the overview.
            </p>
            {this.state.error && (
              <div className="mb-4 max-h-32 overflow-y-auto rounded-lg bg-background/80 p-2.5 font-mono text-[11px] text-destructive/90 text-left border border-border">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleReset}
                className="gap-1.5 border-border text-xs text-foreground hover:bg-card"
              >
                <RotateCcw className="size-3.5" />
                <span>Retry</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  this.handleReset();
                  window.location.href = "/dashboard";
                }}
                className="bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
