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
import type { DeviceStatus } from '../services/deviceApi'
import { Brand } from '../shared/ui/DevicePrimitives'
import { useI18n } from '../shared/i18n/I18n'
import type { MainTab } from './navigation'
import { TopbarPortalContext } from './TopbarPortal'

export function DeviceShell({
  active,
  online,
  status,
  toast,
  children,
  onSelect,
}: {
  active: MainTab
  online: boolean
  status: DeviceStatus
  toast: string
  children: ReactNode
  onSelect: (tab: MainTab) => void
}) {
  const { locale, localizeNode, t, toggleLocale } = useI18n()
  const [immersive, setImmersive] = useState(
    () => window.localStorage.getItem('sensorhub-immersive') === 'true',
  )
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('sensorhub-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })
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
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light'
      window.localStorage.setItem('sensorhub-theme', next)
      return next
    })
  }

  const tabs: Array<[MainTab, typeof Home, string]> = [
    ['home', Home, '主页'],
    ['data', Camera, '数据'],
    ['records', FolderOpen, '记录'],
    ['profile', UserRound, '我的'],
  ]

  return (
    <div
      className={`device-shell ${immersive ? 'is-immersive' : ''}`}
      data-locale={locale}
      data-theme={theme}
    >
      {!immersive && (
        <header className="device-topbar">
          <Brand />
          <div className="topbar-page-slot" ref={setHeadingPortal} />
          <div className={`device-connection ${online ? 'online' : ''}`}>
            <span className="status-dot" />
            {online ? '在线' : '离线'}
          </div>
          <div className="topbar-spacer" />
          <div className="device-metric">
            <BatteryCharging />
            <span>{status.battery.pct}%</span>
          </div>
          <time className="device-clock" dateTime={now.toISOString()}>
            {now.toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </time>
          <div className="topbar-action-slot" ref={setActionPortal} />
          <button
            className="chrome-button language-button"
            onClick={toggleLocale}
            aria-label={locale === 'zh' ? 'Switch to English' : '切换为简体中文'}
          >
            <Languages />
            <span>{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <button
            className="chrome-button theme-button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          >
            {theme === 'light' ? <Moon /> : <Sun />}
            <span>{t(theme === 'light' ? '深色' : '浅色')}</span>
          </button>
          <button
            className="chrome-button"
            onClick={() => setImmersiveMode(true)}
            aria-label="隐藏顶部和底部导航"
          >
            <ChevronUp />
            <span>全屏</span>
          </button>
        </header>
      )}

      <TopbarPortalContext.Provider value={topbarPortals}>
        <main className="device-content">{localizeNode(children)}</main>
      </TopbarPortalContext.Provider>

      {!immersive && (
        <nav className="device-tabbar" aria-label="主导航">
          {tabs.map(([id, Icon, label]) => (
            <button
              key={id}
              className={active === id ? 'active' : ''}
              onClick={() => onSelect(id)}
            >
              <Icon />
              <span>{t(label)}</span>
            </button>
          ))}
          <button
            className="tabbar-hide"
            onClick={() => setImmersiveMode(true)}
            aria-label="隐藏顶部和底部导航"
          >
            <ChevronDown />
            <span>{t('全屏')}</span>
          </button>
        </nav>
      )}

      {immersive && (
        <>
          <button
            className="chrome-restore chrome-restore-top"
            onClick={() => setImmersiveMode(false)}
            aria-label="恢复导航"
          >
            <ChevronDown />
            <span>{t('显示导航')}</span>
          </button>
          <button
            className="chrome-restore chrome-restore-bottom"
            onClick={() => setImmersiveMode(false)}
            aria-label="恢复导航"
          >
            <ChevronUp />
            <span>{t('显示导航')}</span>
          </button>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
