import {
  Activity,
  Bluetooth,
  BookOpenCheck,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Database,
  HelpCircle,
  Info,
  LogOut,
  Settings,
  ShieldCheck,
  Wifi,
} from 'lucide-react'
import type { ScreenCommonProps } from '../../../app/model'
import { PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '../../../shared/lib/cn'

type MobileProfileProps = Pick<ScreenCommonProps, 'status' | 'online' | 'go' | 'notify'>

export function MobileProfileView({ status, online, go, notify }: MobileProfileProps) {
  return (
    <div className="page flex min-h-full flex-col gap-4 pb-[calc(1.75rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-2 md:content-start">
      <PageHeader title="我的" subtitle="账户、设备与系统服务" />
      <Card className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 overflow-hidden border-sky-500/25 bg-sky-500/5 p-5 md:col-span-2">
        <div className="grid size-14 place-items-center rounded-[1.15rem] bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-blue-500/20"><CircleUserRound className="size-8" /></div>
        <div className="min-w-0"><h2 className="m-0 text-xl font-bold">设备操作员</h2><p className="mt-1 text-xs text-muted-foreground">采集员 · 本地离线账户</p></div>
        <button className="inline-flex min-h-11 items-center gap-0.5 border-0 bg-transparent px-1 text-sm font-semibold text-primary" onClick={() => go('account')}>个人资料<ChevronRight className="size-4" /></button>
        <div className="col-span-3 mt-1 flex items-center justify-between border-t border-border pt-3">
          <span className="grid gap-0.5 text-[11px] text-muted-foreground">当前设备<strong className="text-sm text-foreground">RK3588-LOCAL</strong></span>
          <Badge className={cn(online && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500')} variant={online ? 'outline' : 'secondary'}>{online ? '设备在线' : '设备离线'}</Badge>
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-2.5 md:col-span-2">
        <StatusTile tone="violet" icon={<Database />} label="设备套件" value={online ? '1 台在线' : '等待连接'} onClick={() => go('device-list')} />
        <StatusTile tone="sky" icon={<Wifi />} label="网络" value={status.wifi.connected ? status.wifi.ssid : '未连接'} onClick={() => go('wifi')} />
      </section>

      <MobileMenu title="设备与连接" items={[
        { icon: <Activity />, tone: 'sky', label: '设备管理', note: '绑定、状态与更新', action: () => go('device-list') },
        { icon: <Wifi />, tone: 'cyan', label: 'WiFi 与热点', note: status.wifi.connected ? status.wifi.ssid : '未连接', action: () => go('wifi') },
        { icon: <Bluetooth />, tone: 'blue', label: '手套与蓝牙', note: status.bluetooth.connected ? '已连接' : '未连接', action: () => go('bluetooth') },
        { icon: <Cloud />, tone: 'violet', label: '数据存储', note: '本地与对象存储', action: () => go('cloud-settings') },
      ]} />

      <MobileMenu title="服务与系统" items={[
        { icon: <BookOpenCheck />, tone: 'amber', label: '套件指南与考试', note: '穿戴、安全与操作规范', action: () => go('suite-guide') },
        { icon: <ShieldCheck />, tone: 'emerald', label: '采集诊断', note: 'IMU、Tracker 与 Topic', action: () => go('diagnostics') },
        { icon: <HelpCircle />, tone: 'orange', label: '帮助与反馈', note: '常见问题与问题上报', action: () => go('help-feedback') },
        { icon: <Settings />, tone: 'slate', label: '系统设置', note: '语言、存储与采集', action: () => go('settings') },
        { icon: <Info />, tone: 'indigo', label: '关于 SensorHub', note: '版本与更新记录', action: () => go('about') },
      ]} />

      <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 text-sm font-semibold text-destructive md:col-span-2" onClick={() => notify('账户退出接口待接入')}><LogOut className="size-4" />退出登录</button>
    </div>
  )
}

const menuTones = {
  sky: 'bg-sky-500/12 text-sky-500',
  cyan: 'bg-cyan-500/12 text-cyan-500',
  blue: 'bg-blue-500/12 text-blue-500',
  violet: 'bg-violet-500/12 text-violet-500',
  amber: 'bg-amber-500/12 text-amber-500',
  emerald: 'bg-emerald-500/12 text-emerald-500',
  orange: 'bg-orange-500/12 text-orange-500',
  slate: 'bg-slate-500/12 text-slate-500',
  indigo: 'bg-indigo-500/12 text-indigo-500',
} as const

function MobileMenu({ title, items }: { title: string; items: Array<{ icon: React.ReactNode; tone: keyof typeof menuTones; label: string; note: string; action: () => void }> }) {
  return (
    <section className="w-full self-stretch lg:self-start">
      <h3 className="mb-2 ml-1 text-xs font-semibold text-muted-foreground">{title}</h3>
      <Card className="overflow-hidden rounded-[1.25rem] shadow-none">
        {items.map((item) => (
          <button
            key={item.label}
            className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-0 border-b border-border bg-transparent px-3.5 py-3 text-left last:border-b-0 hover:bg-secondary"
            onClick={item.action}
          >
            <span className={cn('grid size-10 place-items-center rounded-xl [&>svg]:size-5', menuTones[item.tone])}>{item.icon}</span>
            <span className="grid min-w-0 gap-0.5"><strong className="text-[15px] text-foreground">{item.label}</strong><small className="truncate text-xs text-muted-foreground">{item.note}</small></span>
            <ChevronRight className="size-[18px] text-muted-foreground" />
          </button>
        ))}
      </Card>
    </section>
  )
}

function StatusTile({ icon, tone, label, value, onClick }: { icon: React.ReactNode; tone: 'sky' | 'violet'; label: string; value: string; onClick: () => void }) {
  return (
    <button className={cn('grid min-w-0 grid-cols-[auto_1fr] items-center gap-2.5 rounded-[1.1rem] border bg-card p-3.5 text-left', tone === 'sky' ? 'border-sky-500/20' : 'border-violet-500/20')} onClick={onClick}>
      <span className={cn('[&>svg]:size-5', tone === 'sky' ? 'text-sky-500' : 'text-violet-500')}>{icon}</span>
      <span className="grid min-w-0 gap-0.5 text-[11px] text-muted-foreground"><span>{label}</span><strong className="truncate text-sm text-foreground">{value}</strong></span>
    </button>
  )
}
