import { BatteryCharging, ClipboardList, Clock3, Cpu, FolderOpen, HardDrive, PlaySquare, Settings, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { DeviceStatus } from '../../services/deviceApi'
import { useI18n } from '../../shared/i18n/I18n'
import { cn } from '../../shared/lib/cn'
import type { MainTab } from '../../app/navigation'
import type { View } from '../../app/navigation'
import { TopbarPortalContext } from '../../app/TopbarPortal'

type MobileShellProps = {
  active: MainTab
  online: boolean
  status: DeviceStatus
  toast: string
  userName: string
  children: ReactNode
  onSelect: (tab: MainTab) => void
  onAdminSelect: (view: Extract<View, 'settings' | 'device-list'>) => void
}

const tabs: Array<[MainTab, typeof ClipboardList, string]> = [
  ['tasks', ClipboardList, '任务'],
  ['capture', PlaySquare, '采集'],
  ['records', FolderOpen, '数据'],
  ['profile', UserRound, '我的'],
]

export function MobileShell({ active, status, toast, userName, children, onSelect, onAdminSelect }: MobileShellProps) {
  const { localizeNode, t } = useI18n()
  const [now, setNow] = useState(() => new Date())
  const [headingPortal, setHeadingPortal] = useState<HTMLDivElement | null>(null)
  const [actionPortal, setActionPortal] = useState<HTMLDivElement | null>(null)
  const portals = useMemo(
    () => ({ heading: headingPortal, action: actionPortal }),
    [actionPortal, headingPortal],
  )
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div
      className="app-shell grid h-dvh min-h-0 grid-rows-[calc(3.75rem+env(safe-area-inset-top))_minmax(0,1fr)_calc(4.125rem+env(safe-area-inset-bottom))] overflow-hidden bg-background text-foreground"
    >
      <header className="relative z-30 flex min-w-0 items-end gap-2 border-b border-border bg-background/95 px-3 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center gap-2"><strong className="truncate text-sm">Mango · {userName}</strong><div className="hidden" ref={setHeadingPortal} /></div>
        <div className="flex shrink-0 items-center empty:hidden" ref={setActionPortal} />
        <span className="inline-flex items-center gap-1 text-xs"><BatteryCharging className="size-4" />{status.battery.pct}%</span>
        <span className="inline-flex items-center gap-1 text-xs"><HardDrive className="size-4" />{status.storage.pct}%</span>
        <time className="inline-flex items-center gap-1 text-xs" dateTime={now.toISOString()}><Clock3 className="size-4" />{now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
        <Button size="icon-touch" variant="ghost" aria-label="设置（需管理员密码）" onClick={() => onAdminSelect('settings')}><Settings /></Button>
        <Button size="icon-touch" variant="ghost" aria-label="设备（需管理员密码）" onClick={() => onAdminSelect('device-list')}><Cpu /></Button>
      </header>

      <TopbarPortalContext.Provider value={portals}>
        <main key={active} className="device-content min-h-0 overflow-x-hidden overflow-y-auto px-3 py-3 [overscroll-behavior:contain]">
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
