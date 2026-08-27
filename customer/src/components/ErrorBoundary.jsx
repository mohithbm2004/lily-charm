import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[LILY CHARM] Runtime crash — error.message:', error?.message)
    console.error('[LILY CHARM] error.stack:', error?.stack)
    console.error('[LILY CHARM] componentStack:', errorInfo?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#212B1C] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-[#E5DFD5] p-8 sm:p-10 rounded-3xl shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#2D402B]/10 text-[#2D402B] flex items-center justify-center mx-auto text-sm font-bold font-mono">
              LC
            </div>
            
            <div className="space-y-2">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#2D402B] font-mono">
                Lily Charm Floral Studio
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-display)]">
                Something Went Temporarily Wrong
              </h2>
              <p className="text-xs text-[#5A6553] leading-relaxed">
                We encountered an unexpected display issue. Your saved bag and account data are completely safe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-[#2D402B] hover:bg-[#1E2B1D] text-white py-3 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 border border-[#E5DFD5] hover:bg-[#FAF7F2] text-[#212B1C] py-3 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
