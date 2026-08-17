import { Camera, FolderOpen, Home, Moon, Sun, UserRound } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import type { DeviceStatus } from '../../services/deviceApi'
import { useI18n } from '../../shared/i18n/I18n'
import { cn } from '../../shared/lib/cn'
import type { MainTab } from '../../app/navigation'
import { TopbarPortalContext } from '../../app/TopbarPortal'

type MobileShellProps = {
  active: MainTab
  online: boolean
  status: DeviceStatus
  toast: string
  children: ReactNode
  onSelect: (tab: MainTab) => void
  productName: string
}

const tabs: Array<[MainTab, typeof Home, string]> = [
  ['home', Home, '主页'],
  ['data', Camera, '数据'],
  ['records', FolderOpen, '记录'],
  ['profile', UserRound, '我的'],
]

export function MobileShell({ active, toast, children, onSelect }: MobileShellProps) {
  const { localizeNode, t } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [headingPortal, setHeadingPortal] = useState<HTMLDivElement | null>(null)
  const [actionPortal, setActionPortal] = useState<HTMLDivElement | null>(null)
  const portals = useMemo(
    () => ({ heading: headingPortal, action: actionPortal }),
    [actionPortal, headingPortal],
  )

  return (
    <div
      className="app-shell grid h-dvh min-h-0 grid-rows-[calc(3.75rem+env(safe-area-inset-top))_minmax(0,1fr)_calc(4.125rem+env(safe-area-inset-bottom))] overflow-hidden bg-background text-foreground"
    >
      <header className="relative z-30 flex min-w-0 items-end gap-2 border-b border-border bg-background/95 px-3 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center" ref={setHeadingPortal} />
        <div className="flex shrink-0 items-center empty:hidden" ref={setActionPortal} />
        <Button size="icon-touch" variant="outline" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>{resolvedTheme === 'dark' ? <Sun /> : <Moon />}<span className="sr-only">切换主题</span></Button>
      </header>

      <TopbarPortalContext.Provider value={portals}>
        <main className="device-content min-h-0 overflow-x-hidden overflow-y-auto px-3 py-3 [overscroll-behavior:contain]">
          {localizeNode(children)}
        </main>
      </TopbarPortalContext.Provider>

      <nav
        className="relative z-40 grid grid-cols-4 border-t border-border bg-background/95 px-1.5 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xl"
        aria-label="主导航"
      >
        {tabs.map(([id, Icon, label]) => {
          const selected = active === id
          return (
            <button
              key={id}
              className={cn(
                'relative grid min-h-14 place-items-center content-center gap-0.5 rounded-2xl border-0 bg-transparent text-[11px] font-semibold text-muted-foreground transition-colors',
                selected && 'text-foreground',
              )}
              onClick={() => onSelect(id)}
            >
              <Icon className={cn('size-6', selected && 'text-primary')} />
              <span>{t(label)}</span>
              {selected && <i className="absolute bottom-0 h-0.5 w-7 rounded-full bg-primary shadow-sm" />}
            </button>
          )
        })}
      </nav>

      {toast && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-[200] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-primary/30 bg-secondary/95 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
