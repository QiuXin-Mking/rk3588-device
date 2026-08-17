import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Database,
  Video,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTopbarPortal } from '../../app/TopbarPortal'
import { useUiMode } from '../../app/uiModeContext'
import type { Recording } from '../../services/deviceApi'
import { formatBytes } from '../format'
import { cn } from '../lib/cn'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-4 text-[30px] font-bold tracking-tight', compact && 'gap-2.5 text-xl')}>
      <span className={cn('grid size-[62px] place-items-center rounded-[18px] bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/25 [&>svg]:size-9', compact && 'size-10 rounded-xl [&>svg]:size-6')}><Activity /></span>
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
  const mode = useUiMode()
  const heading = (
    <div className={cn('flex min-w-0 items-center', mode === 'device' ? 'gap-[18px]' : 'w-full gap-2', back && 'has-back', title === 'SensorHub' && mode === 'device' && 'hidden')}>
      {back && (
        <Button className={cn('back-button', mode === 'device' && 'size-20 rounded-xl')} size="icon-touch" variant="outline" onClick={back} aria-label="返回">
          <ArrowLeft />
        </Button>
      )}
      <h1 className={cn('m-0 truncate font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-xl')}>{title}</h1>
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
  const mode = useUiMode()
  return (
    <span className={cn('inline-flex items-center rounded-full border font-semibold', mode === 'device' ? 'min-h-[62px] gap-3.5 px-[22px] text-[length:var(--device-text-sm)]' : 'min-h-8 gap-2 px-3 text-xs', online ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-border bg-muted text-muted-foreground')}>
      <span className={cn('rounded-full bg-muted-foreground', mode === 'device' ? 'size-4' : 'size-2', online && 'bg-emerald-500')} />
      {online ? '设备在线' : '设备离线'}
    </span>
  )
}

export function SensorBadge({ label, ok }: { label: string; ok: boolean }) {
  const mode = useUiMode()
  return (
    <div className={cn('inline-flex items-center rounded-full border font-semibold', mode === 'device' ? 'min-h-12 gap-3 px-4 text-[length:var(--device-text-xs)]' : 'min-h-8 gap-2 px-3 text-xs', ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-border bg-muted text-muted-foreground')}>
      <span className={cn('rounded-full bg-muted-foreground', mode === 'device' ? 'size-3.5' : 'size-2', ok && 'bg-emerald-500')} />
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
  const mode = useUiMode()
  return (
    <Empty className={mode === 'device' ? 'gap-6 p-8' : undefined}>
      <EmptyHeader className={mode === 'device' ? 'max-w-xl gap-3' : undefined}>
        <EmptyMedia className={mode === 'device' ? 'mb-3 size-16 rounded-2xl [&_svg]:size-8!' : undefined} variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className={mode === 'device' ? 'text-[length:var(--device-text-md)] font-bold' : undefined}>{title}</EmptyTitle>
        {description && <EmptyDescription className={mode === 'device' ? 'text-[length:var(--device-text-xs)] leading-relaxed' : undefined}>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent className={mode === 'device' ? 'max-w-lg gap-4 text-[length:var(--device-text-xs)]' : undefined}>{action}</EmptyContent>}
    </Empty>
  )
}

export function HandSkeleton({ active, flipped = false }: { active: boolean; flipped?: boolean }) {
  return (
    <svg className={cn('max-h-[250px] w-full text-muted-foreground', active && 'text-emerald-500 drop-shadow-md', flipped && '-scale-x-100')} viewBox="0 0 240 150">
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
          key={x}
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
    <svg className="h-full max-h-[570px] w-full" viewBox="0 0 240 470" aria-label="穿戴设备示意">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--muted-foreground)" />
          <stop offset="1" stopColor="var(--muted)" />
        </linearGradient>
        <radialGradient id="core">
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary)" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="48" r="34" fill="url(#body)" />
      <path d="M83 86 Q120 69 157 86 L174 207 Q149 235 120 242 Q91 235 66 207 Z" fill="url(#body)" />
      <path d="M74 94 L42 118 L18 251 L43 260 L70 159" fill="url(#body)" />
      <path d="M166 94 L198 118 L222 251 L197 260 L170 159" fill="url(#body)" />
      <path d="M94 237 L65 437 L101 442 L120 292 L139 442 L175 437 L146 237" fill="url(#body)" />
      <circle cx="120" cy="142" r="24" fill="url(#core)" />
      <path d="M83 104 Q120 132 157 104 M76 137 Q120 168 164 137 M71 173 Q120 204 169 173" fill="none" stroke="var(--muted-foreground)" strokeWidth="7" strokeLinecap="round" />
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
  const mode = useUiMode()
  return (
    <button className={cn('grid w-full items-center border-0 border-b border-border bg-transparent text-left text-foreground last:border-b-0', mode === 'device' ? 'min-h-28 grid-cols-[76px_minmax(0,1fr)_auto_42px] gap-[18px] px-6 py-3' : 'min-h-[68px] grid-cols-[44px_minmax(0,1fr)_auto] gap-2 px-0 py-2', compact && (mode === 'device' ? 'min-h-[88px] grid-cols-[58px_minmax(0,1fr)_auto] px-0 py-2' : 'min-h-16'), selected && 'bg-blue-500/10')} onClick={onClick}>
      <span className={cn('grid place-items-center rounded-xl bg-sky-500/10 text-sky-500', mode === 'device' && !compact ? 'size-[68px] [&>svg]:size-[34px]' : 'size-[54px] [&>svg]:size-7')}><Database /></span>
      <span className="grid min-w-0 gap-1.5">
        <strong className={cn('truncate', mode === 'device' ? 'text-[length:var(--device-text-md)]' : 'text-sm')}>{item.name.replace('recording_', '')}</strong>
        <small className={cn('truncate text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-xs')}>{formatBytes(item.size)} · {new Date(item.mtime).toLocaleString('zh-CN')}</small>
      </span>
      <span className={cn('rounded-full bg-muted px-3.5 py-2 font-semibold text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-xs', item.transferred && 'bg-emerald-500/10 text-emerald-500')}>
        {item.transferring ? `${item.transferPct}%` : item.transferred ? '已传输' : '本地'}
      </span>
      {!compact && <ChevronRight className={cn('text-muted-foreground', mode === 'device' && 'size-8')} />}
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
  const mode = useUiMode()
  const sourceKey = `${connected}:${src ?? ''}`
  const [failedSource, setFailedSource] = useState('')
  const failed = failedSource === sourceKey

  return (
    <section className={cn('camera-feed flex min-h-0 flex-col overflow-hidden border border-border bg-card', mode === 'device' ? 'rounded-[var(--device-radius)] p-[18px]' : 'rounded-xl p-3', large && 'row-span-2')}>
      <div className={cn('flex items-center justify-between gap-4 font-bold', mode === 'device' ? 'min-h-[60px] text-[length:var(--device-text-md)]' : 'min-h-11 text-sm')}>
        <span>{title}</span>
        <SensorBadge label={connected && !failed ? '有信号' : '无信号'} ok={connected && !failed} />
      </div>
      <div className={cn('relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-black', mode === 'device' ? 'rounded-[18px]' : 'rounded-lg')}>
        {connected && src && !failed ? (
          <img className="size-full object-contain" src={src} alt={`${title} 预览`} onError={() => setFailedSource(sourceKey)} />
        ) : (
          <div className={cn('grid place-items-center gap-3 text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-sm)] [&>svg]:size-[66px]' : 'text-sm [&>svg]:size-10')}><Video /><span>{note || '无信号'}</span></div>
        )}
      </div>
    </section>
  )
}
