import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Database,
  Video,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTopbarPortal } from '../../app/TopbarPortal'
import type { Recording } from '../../services/deviceApi'
import { formatBytes } from '../format'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark"><Activity /></span>
      <span>SensorHub</span>
    </div>
  )
}

export function PageHeader({
  title,
  back,
  action,
}: {
  title: string
  subtitle?: string
  back?: () => void
  action?: ReactNode
}) {
  const portals = useTopbarPortal()
  const heading = (
    <div className={`topbar-page-heading ${back ? 'has-back' : ''} ${title === 'SensorHub' ? 'brand-title' : ''}`}>
      {back && (
        <button className="icon-button back-button" onClick={back} aria-label="返回">
          <ArrowLeft />
        </button>
      )}
      <h1>{title}</h1>
    </div>
  )

  return (
    <>
      {portals.heading && createPortal(heading, portals.heading)}
      {portals.action && action && createPortal(action, portals.action)}
    </>
  )
}

export function LiveBadge({ online }: { online: boolean }) {
  return (
    <span className={`live-badge ${online ? 'online' : ''}`}>
      <span className="status-dot" />
      {online ? '设备在线' : '设备离线'}
    </span>
  )
}

export function SensorBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`sensor-badge ${ok ? 'ok' : ''}`}>
      <span className="status-dot" />
      {label} · {ok ? '在线' : '离线'}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function HandSkeleton({ active, flipped = false }: { active: boolean; flipped?: boolean }) {
  return (
    <svg className={`hand-skeleton ${active ? 'active' : ''} ${flipped ? 'flipped' : ''}`} viewBox="0 0 240 150">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 111 C62 92, 80 75, 104 61 C132 45, 155 26, 170 9" />
        <path d="M39 118 C74 109, 104 94, 130 78 C158 60, 187 47, 215 41" />
        <path d="M40 121 C79 121, 110 113, 140 104 C171 95, 201 92, 226 94" />
        <path d="M38 124 C75 132, 106 133, 137 132 C169 132, 198 139, 219 147" />
        <path d="M32 121 C61 139, 86 145, 111 147 C137 149, 156 151, 174 157" />
        <path d="M28 116 C18 122, 16 136, 21 144 C37 144, 50 137, 61 129" />
        <path d="M34 111 C43 100, 46 85, 42 69" />
      </g>
      {[30, 104, 170, 130, 215, 140, 226, 137, 219, 111, 174].map((x, index) => (
        <circle
          key={`${x}-${index}`}
          cx={x}
          cy={[111, 61, 9, 78, 41, 104, 94, 132, 147, 147, 157][index]}
          r="3.2"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

export function HumanFigure() {
  return (
    <svg className="human-figure" viewBox="0 0 240 470" aria-label="穿戴设备示意">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#3a3f48" />
          <stop offset="1" stopColor="#0a0c10" />
        </linearGradient>
        <radialGradient id="core">
          <stop stopColor="#18c8ff" />
          <stop offset="1" stopColor="#055da8" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="48" r="34" fill="url(#body)" />
      <path d="M83 86 Q120 69 157 86 L174 207 Q149 235 120 242 Q91 235 66 207 Z" fill="url(#body)" />
      <path d="M74 94 L42 118 L18 251 L43 260 L70 159" fill="url(#body)" />
      <path d="M166 94 L198 118 L222 251 L197 260 L170 159" fill="url(#body)" />
      <path d="M94 237 L65 437 L101 442 L120 292 L139 442 L175 437 L146 237" fill="url(#body)" />
      <circle cx="120" cy="142" r="24" fill="url(#core)" />
      <path d="M83 104 Q120 132 157 104 M76 137 Q120 168 164 137 M71 173 Q120 204 169 173" fill="none" stroke="#8b929e" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}

export function RecordingRow({
  item,
  compact = false,
  selected = false,
  onClick,
}: {
  item: Recording
  compact?: boolean
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button className={`record-row ${compact ? 'compact' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="record-row-icon"><Database /></span>
      <span className="record-row-main">
        <strong>{item.name.replace('recording_', '')}</strong>
        <small>{formatBytes(item.size)} · {new Date(item.mtime).toLocaleString('zh-CN')}</small>
      </span>
      <span className={`record-state ${item.transferred ? 'done' : ''}`}>
        {item.transferring ? `${item.transferPct}%` : item.transferred ? '已传输' : '本地'}
      </span>
      {!compact && <ChevronRight />}
    </button>
  )
}

export function CameraFeed({
  title,
  connected,
  src,
  note,
  large = false,
}: {
  title: string
  connected: boolean
  src?: string
  note?: string
  large?: boolean
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (connected && src) setFailed(false)
  }, [connected, src])

  return (
    <section className={`camera-feed card ${large ? 'large' : ''}`}>
      <div className="feed-title">
        <span>{title}</span>
        <SensorBadge label={connected && !failed ? '有信号' : '无信号'} ok={connected && !failed} />
      </div>
      <div className="feed-viewport">
        {connected && src && !failed ? (
          <img src={src} alt={`${title} 预览`} onError={() => setFailed(true)} />
        ) : (
          <div className="empty-feed"><Video /><span>{note || '无信号'}</span></div>
        )}
      </div>
    </section>
  )
}
