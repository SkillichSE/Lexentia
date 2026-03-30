import { IdeShell } from '../components/ide/IdeShell'
import { Component, type ReactNode } from 'react'

type UiErrorState = {
  hasError: boolean
  errorMessage: string
}

class UiErrorBoundary extends Component<{ children: ReactNode }, UiErrorState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError() {
    return { hasError: true, errorMessage: 'Unknown UI error' }
  }

  override componentDidCatch(error: unknown) {
    // Keep renderer visible if some panel throws.
    console.error('Lexentia UI crashed:', error)
    const message = error instanceof Error ? error.message : String(error)
    this.setState({ hasError: true, errorMessage: message })
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <div className="lex-sectionTitle">UI Error</div>
          <div className="lex-subtle">The UI caught an error: {this.state.errorMessage}</div>
          <div className="lex-subtle" style={{ marginTop: 8 }}>
            Restart the window or reset layout in localStorage.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  return (
    <UiErrorBoundary>
      <IdeShell />
    </UiErrorBoundary>
  )
}

