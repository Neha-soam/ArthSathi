import { Component } from 'react'
// Last line of defence: a rendering bug shows a calm screen instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('UI crash:', error, info?.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="card mx-auto mt-16 max-w-md space-y-3 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-slate-600">This page hit an unexpected problem. Your saved data is not affected. Please reload to try again.</p>
        <button className="btn" onClick={() => window.location.assign('/')}>Reload ArthSathi</button>
        <details className="text-left text-xs text-slate-500"><summary className="cursor-pointer">Technical details (for support)</summary><p className="mt-1 break-words font-mono">{String(this.state.error?.message || this.state.error)}</p></details>
      </div>
    )
  }
}
