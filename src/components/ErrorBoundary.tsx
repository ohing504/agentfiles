import { Component } from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="mx-auto max-w-md space-y-4 p-8 text-center">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-2 rounded-md bg-muted p-4 text-left text-xs text-muted-foreground overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
