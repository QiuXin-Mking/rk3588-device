import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type State = { error: Error | null }

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SensorHub UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
        <section className="grid w-full max-w-lg justify-items-center gap-4 rounded-xl border border-destructive/25 bg-card p-8 text-center shadow-sm">
          <span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-7" /></span>
          <div><h1 className="text-xl font-bold">页面暂时无法显示</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">前端发生异常，设备服务不会因此停止。可以重新加载页面恢复。</p></div>
          <Button variant="default" onClick={() => window.location.reload()}><RotateCcw className="size-4" />重新加载</Button>
          {import.meta.env.DEV && <pre className="max-h-32 w-full overflow-auto rounded-lg bg-secondary p-3 text-left text-xs text-destructive">{this.state.error.message}</pre>}
        </section>
      </main>
    )
  }
}
