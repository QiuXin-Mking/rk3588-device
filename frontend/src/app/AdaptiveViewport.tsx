import { type PropsWithChildren, useEffect, useState } from 'react'
import { FixedCanvas } from './FixedCanvas'
import { UiModeContext } from './uiModeContext'
import { resolveUiMode, type UiMode } from './viewportMode'

export function AdaptiveViewport({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<UiMode>(resolveUiMode)

  useEffect(() => {
    const update = () => setMode(resolveUiMode())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.uiMode = mode
    return () => { delete document.documentElement.dataset.uiMode }
  }, [mode])

  const content = mode === 'device'
    ? <FixedCanvas>{children}</FixedCanvas>
    : <div className="mobile-viewport h-dvh min-h-0 w-full overflow-hidden bg-background">{children}</div>

  return <UiModeContext.Provider value={mode}>{content}</UiModeContext.Provider>
}
