import {
  BatteryCharging,
  Camera,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Home,
  Languages,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import type { DeviceStatus } from '../../services/deviceApi'
import { Brand } from '../../shared/ui/DevicePrimitives'
import { useI18n } from '../../shared/i18n/I18n'
import type { MainTab } from '../../app/navigation'
import { TopbarPortalContext } from '../../app/TopbarPortal'
import { cn } from '../../shared/lib/cn'

type DeviceShellProps = {
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

export function DeviceShell({ active, online, status, toast, children, onSelect, productName }: DeviceShellProps) {
  const { locale, localizeNode, t, toggleLocale } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [immersive, setImmersive] = useState(
    () => window.localStorage.getItem('sensorhub-immersive') === 'true',
  )
  const [now, setNow] = useState(() => new Date())
  const [headingPortal, setHeadingPortal] = useState<HTMLDivElement | null>(null)
  const [actionPortal, setActionPortal] = useState<HTMLDivElement | null>(null)
  const topbarPortals = useMemo(
    () => ({ heading: headingPortal, action: actionPortal }),
    [actionPortal, headingPortal],
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const setImmersiveMode = (enabled: boolean) => {
    setImmersive(enabled)
    window.localStorage.setItem('sensorhub-immersive', String(enabled))
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className={cn('device-shell grid h-full w-full grid-rows-[var(--chrome-top)_minmax(0,1fr)_var(--chrome-bottom)] overflow-hidden bg-background text-foreground', immersive && 'is-immersive grid-rows-[minmax(0,1fr)]')} data-locale={locale}>
      {!immersive && (
        <header className="device-topbar z-30 flex min-w-0 items-center gap-[18px] border-b border-border bg-background/95 px-8 backdrop-blur-xl [&:has(.has-back)>.device-brand]:hidden">
          <div className="device-brand"><Brand /></div>
          <span className="ml-3 whitespace-nowrap text-[length:var(--device-text-sm)] font-bold text-muted-foreground">产品：{productName}</span>
          <div className="flex min-w-0 shrink-0 items-center" ref={setHeadingPortal} />
          <div className={cn('device-connection inline-flex min-h-[72px] items-center gap-3.5 rounded-xl border border-border bg-secondary px-6 text-[length:var(--device-text-sm)] font-semibold text-muted-foreground', online && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500')}><span className={cn('size-4 rounded-full bg-muted-foreground', online && 'bg-emerald-500')} />{online ? '在线' : '离线'}</div>
          <div className="topbar-spacer flex-1" />
          <div className={cn('device-metric inline-flex min-h-[72px] items-center gap-3.5 rounded-xl border px-6 text-[length:var(--device-text-sm)] font-semibold [&>svg]:size-[36px]', status.battery.pct <= 20 ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-sky-500/25 bg-sky-500/10 text-sky-500')}><BatteryCharging /><span>{status.battery.pct}%</span></div>
          <time className="device-clock inline-flex min-h-[72px] items-center rounded-xl border border-violet-500/25 bg-violet-500/10 px-6 text-[length:var(--device-text-sm)] font-semibold tabular-nums text-violet-500" dateTime={now.toISOString()}>{now.toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
          <div className="flex shrink-0 items-center empty:hidden" ref={setActionPortal} />
          <Button className="chrome-button" size="chrome" variant="outline" onClick={toggleLocale} aria-label={locale === 'zh' ? 'Switch to English' : '切换为简体中文'}><Languages data-icon="inline-start" /><span>{locale === 'zh' ? 'EN' : '中文'}</span></Button>
          <Button className="chrome-button" size="chrome" variant="outline" onClick={toggleTheme} aria-label={resolvedTheme === 'light' ? '切换到深色模式' : '切换到浅色模式'}>{resolvedTheme === 'light' ? <Moon data-icon="inline-start" /> : <Sun data-icon="inline-start" />}<span>{t(resolvedTheme === 'light' ? '深色' : '浅色')}</span></Button>
          <Button className="chrome-button" size="chrome" variant="outline" onClick={() => setImmersiveMode(true)} aria-label="隐藏顶部和底部导航"><ChevronUp data-icon="inline-start" /><span>全屏</span></Button>
        </header>
      )}

      <TopbarPortalContext.Provider value={topbarPortals}>
        <main className="device-content min-h-0 min-w-0 overflow-hidden px-[30px] pb-[22px] pt-5">{localizeNode(children)}</main>
      </TopbarPortalContext.Provider>

      {!immersive && (
        <nav className="device-tabbar z-40 grid min-w-0 grid-cols-[repeat(4,minmax(0,1fr))_170px] gap-2.5 border-t border-border bg-background/95 px-6 py-2.5 backdrop-blur-xl" aria-label="主导航">
          {tabs.map(([id, Icon, label]) => <Button key={id} className={cn('relative min-w-0', active === id && 'active bg-blue-500/10 text-blue-500')} size="tab" variant={active === id ? 'secondary' : 'ghost'} onClick={() => onSelect(id)}><Icon data-icon="inline-start" /><span>{t(label)}</span></Button>)}
          <Button className="tabbar-hide ml-2" size="tab" variant="outline" onClick={() => setImmersiveMode(true)} aria-label="隐藏顶部和底部导航"><ChevronDown data-icon="inline-start" /><span>{t('全屏')}</span></Button>
        </nav>
      )}

      {immersive && <><Button className="fixed left-1/2 top-0 z-50 min-h-[92px] w-[260px] -translate-x-1/2 rounded-t-none rounded-b-3xl border-sky-500/30 bg-popover/90 text-[length:var(--device-text-sm)] text-sky-500 opacity-80 shadow-lg backdrop-blur-xl" variant="outline" onClick={() => setImmersiveMode(false)} aria-label="恢复导航"><ChevronDown data-icon="inline-start" /><span>{t('显示导航')}</span></Button><Button className="fixed bottom-0 left-1/2 z-50 min-h-[92px] w-[260px] -translate-x-1/2 rounded-t-3xl rounded-b-none border-sky-500/30 bg-popover/90 text-[length:var(--device-text-sm)] text-sky-500 opacity-80 shadow-lg backdrop-blur-xl" variant="outline" onClick={() => setImmersiveMode(false)} aria-label="恢复导航"><ChevronUp data-icon="inline-start" /><span>{t('显示导航')}</span></Button></>}
      {toast && <div className={cn('toast fixed bottom-[calc(var(--chrome-bottom)+24px)] right-[34px] z-[200] max-w-[680px] rounded-[20px] border border-primary/35 bg-popover px-[30px] py-6 text-[length:var(--device-text-sm)] text-popover-foreground shadow-lg', immersive && 'bottom-7')}>{toast}</div>}
    </div>
  )
}
