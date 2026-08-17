import {
  Activity,
  Camera,
  ChevronRight,
  ClipboardCheck,
  CloudUpload,
  Database,
  FileClock,
  Pause,
  Play,
  MapPin,
  Clock3,
  Target,
  RadioTower,
  Square,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Navigate, Notify } from '../../../app/model'
import type { FilesResponse, RecordStatus } from '../../../services/deviceApi'
import { cn } from '../../../shared/lib/cn'
import { PageHeader, RecordingRow } from '../../../shared/ui/DevicePrimitives'
import { formatTime } from '../../../shared/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ProductDeviceStatus } from '../dataModel'

export function MobileTaskClaimView({
  back,
  device,
  scene,
  project,
  task,
  setDevice,
  setScene,
  setProject,
  setTask,
  claim,
}: {
  back: () => void
  device: string
  scene: string
  project: string
  task: string
  setDevice: (value: string) => void
  setScene: (value: string) => void
  setProject: (value: string) => void
  setTask: (value: string) => void
  claim: () => void
}) {
  const selectClass = 'min-h-11 w-full rounded-[.85rem] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary/60'
  return <div className="page detail-page flex min-h-full flex-col gap-3.5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(18.75rem,.8fr)_minmax(26.25rem,1.2fr)] lg:content-start">
    <PageHeader title="领取任务" subtitle="选择适合当前设备的采集任务" back={back} />
    <section className="grid grid-cols-2 gap-2.5 lg:col-span-2">
      <label className="grid gap-1.5 text-[11px] text-muted-foreground"><span>设备类型</span><select className={selectClass} value={device} onChange={event => setDevice(event.target.value)}><option>iSuit</option><option>HSuit</option></select></label>
      <label className="grid gap-1.5 text-[11px] text-muted-foreground"><span>场景类型</span><select className={selectClass} value={scene} onChange={event => setScene(event.target.value)}><option>家庭收纳</option><option>办公场景</option><option>工业装配</option></select></label>
    </section>
    <Card className="p-4 shadow-none"><SectionKicker>项目</SectionKicker><h2 className="mb-3 mt-1 text-xl font-bold">选择项目</h2><div>{['收纳盒@紫竹家具馆5', '桌面整理采集'].map(item => <button key={item} className={cn('grid w-full grid-cols-[1fr_auto] items-center gap-2 border-0 border-b border-border bg-transparent py-3 text-left text-foreground last:border-b-0', project === item && 'text-primary')} onClick={() => setProject(item)}><span className="grid gap-1"><strong className="text-sm">{item}</strong><small className="text-xs text-muted-foreground">上海 · 数据采集项目</small></span><ChevronRight className="size-4" /></button>)}</div></Card>
    <Card className="p-4 shadow-none"><SectionKicker>可领取任务</SectionKicker><h2 className="mb-3 mt-1 text-xl font-bold">选择任务</h2>{[
      { name: '把药盒、药瓶、空药瓶分类', count: '30 次', duration: '45–90 秒' },
      { name: '桌面物品归位', count: '20 次', duration: '30–60 秒' },
    ].map(item => <button key={item.name} className="grid w-full grid-cols-[auto_1fr] gap-3 border-0 border-b border-border bg-transparent py-3.5 text-left text-foreground last:border-b-0" onClick={() => setTask(item.name)}><span className={cn('grid size-[22px] place-items-center rounded-full border-2 border-border', task === item.name && 'border-primary')}><i className={cn(task === item.name && 'size-2.5 rounded-full bg-primary')} /></span><span className="grid gap-2"><strong className="text-sm">{item.name}</strong><small className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground [&>svg]:size-3"><MapPin />家庭收纳<Clock3 />{item.duration}<Target />{item.count}</small></span></button>)}</Card>
    {task !== '未选择' && <section className="flex gap-3 rounded-[1.1rem] border border-amber-500/25 bg-amber-500/10 p-4 text-amber-500 lg:col-span-2"><ClipboardCheck className="size-5 shrink-0" /><div><strong className="text-sm">采集 SOP</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">依次抓取三类物体并放入对应收纳格，保持目标完整处于头部相机视野。</p></div></section>}
    <Button className="fixed bottom-[calc(4.85rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 min-h-13 lg:left-1/2 lg:right-auto lg:w-[min(42.5rem,calc(100vw-3rem))] lg:-translate-x-1/2" variant="default" disabled={project === '未选择' || task === '未选择'} onClick={claim}>确认领取并进入采集<ChevronRight className="size-4" /></Button>
  </div>
}

export function MobileCameraView({ back, previews, online, total }: { back: () => void; previews: ReactNode; online: number; total: number }) {
  return <div className="page detail-page flex min-h-full flex-col gap-3.5">
    <PageHeader title="相机画面" subtitle={`${online}/${total} 路在线 · 左右滑动切换`} back={back} />
    <section className="flex gap-2.5 overflow-x-auto rounded-[1.25rem] [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&_.camera-feed]:h-[min(62vh,32.5rem)] [&_.camera-feed]:min-h-[24rem] [&_.camera-feed]:w-full [&_.camera-feed]:shrink-0 [&_.camera-feed]:snap-center [&_.camera-feed]:rounded-[1.25rem] lg:[&_.camera-feed]:w-[min(45rem,76vw)]">{previews}</section>
    <Card className="flex gap-3 rounded-[1.1rem] border-sky-500/25 bg-sky-500/5 p-4 text-sky-500 shadow-none"><Camera className="size-5 shrink-0" /><span className="grid gap-1"><strong className="text-sm">实时画面</strong><small className="text-xs leading-5 text-muted-foreground">画面由设备同源预览接口提供；横向滑动查看其他通道。</small></span></Card>
  </div>
}

export function MobileRealtimeView({
  devices,
  channels,
  onDeviceClick,
  go,
}: {
  devices: ProductDeviceStatus[]
  channels: Array<{ label: string; online: boolean }>
  onDeviceClick: (id: ProductDeviceStatus['id']) => void
  go: Navigate
}) {
  const connectedDevices = devices.filter(device => !device.unavailable && device.states.some(([, online]) => online)).length
  const connectedChannels = channels.filter(channel => channel.online).length

  return (
    <div className="page flex min-h-full flex-col gap-3.5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(21.25rem,.75fr)] lg:content-start">
      <PageHeader title="数据采集" subtitle="设备、任务与采集状态" />
      <Card className={cn('grid grid-cols-[1fr_auto] gap-4 p-5 lg:col-span-2', connectedDevices ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/5')}>
        <div><SectionKicker>就绪检查</SectionKicker><h2 className="mt-1.5 text-xl font-bold">{connectedDevices ? '设备可以开始采集' : '正在等待设备连接'}</h2></div>
        <span className={cn('grid size-14 place-items-center rounded-full border-[6px] border-amber-500/40 font-extrabold text-amber-500', connectedDevices && 'border-emerald-500 text-emerald-500')}>{connectedDevices}/{devices.length}</span>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <Metric icon={<Activity />} label="设备" value={`${connectedDevices} 在线`} />
          <Metric icon={<Camera />} label="画面" value={`${connectedChannels}/${channels.length} 路`} />
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-2.5" aria-label="采集快捷操作">
        <QuickAction tone="amber" icon={<FileClock />} title="领取任务" description="查看任务与 SOP" onClick={() => go('task-claim')} />
        <QuickAction primary icon={<Database />} title="开始采集" description="预览、录制与诊断" onClick={() => go('capture')} />
      </section>

      <Card className="p-4 shadow-none">
        <SectionHeader kicker="设备套件" title="我的设备" action="管理" onClick={() => go('device-list')} />
        <div>
          {devices.map(device => {
            const online = device.states.some(([, state]) => state)
            return <button className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 border-0 border-b border-border bg-transparent py-3 text-left text-foreground last:border-b-0 disabled:opacity-45" key={device.id} disabled={device.unavailable} onClick={() => onDeviceClick(device.id)}>
              <span className={cn('grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground', online && 'bg-emerald-500/10 text-emerald-500')}><Activity className="size-5" /></span>
              <span className="grid gap-0.5"><strong className="text-sm">{device.name}</strong><small className="text-xs text-muted-foreground">{device.id}</small></span>
              <Badge className={cn(online && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500')} variant={device.unavailable || !online ? 'secondary' : 'outline'}>{device.unavailable ? '未开发' : online ? '在线' : '离线'}</Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          })}
        </div>
      </Card>

      <Card className="p-4 shadow-none lg:col-start-2 lg:row-span-2 lg:row-start-2">
        <SectionHeader kicker="相机" title="相机通道" action="查看画面" onClick={() => go('camera')} />
        <div className="grid grid-cols-2 gap-2">{channels.map(channel => <span key={channel.label} className={cn('grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-[.85rem] bg-secondary p-3', channel.online && 'bg-emerald-500/10')}><i className={cn('row-span-2 size-2 self-center rounded-full bg-muted-foreground', channel.online && 'bg-emerald-500')} /><strong className="text-xs">{channel.label}</strong><small className={cn('text-[11px] text-muted-foreground', channel.online && 'text-emerald-500')}>{channel.online ? '在线' : '离线'}</small></span>)}</div>
      </Card>
    </div>
  )
}

export function MobileCaptureView({
  record,
  files,
  elapsed,
  paused,
  busy,
  liveBusy,
  previews,
  taskCaptured,
  back,
  notify,
  togglePaused,
  togglePreview,
  toggleRecord,
  go,
}: {
  record: RecordStatus
  files: FilesResponse
  elapsed: number
  paused: boolean
  busy: boolean
  liveBusy: boolean
  previews: ReactNode
  taskCaptured: number
  back: () => void
  notify: Notify
  togglePaused: () => void
  togglePreview: () => void
  toggleRecord: () => void
  go?: Navigate
}) {
  const state = paused ? '已暂停' : record.recording ? '录制中' : record.previewing ? '预览中' : '待开始'
  return (
    <div className="page detail-page flex min-h-full flex-col gap-3.5 pb-[calc(10.5rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(21.25rem,.6fr)] lg:content-start">
      <PageHeader title="任务采集" subtitle={state} back={back} />
      <section className="relative overflow-hidden rounded-[1.25rem] bg-black lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div className="flex gap-2 overflow-x-auto [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&_.camera-feed]:h-[min(48vh,24rem)] [&_.camera-feed]:min-h-[16rem] [&_.camera-feed]:w-full [&_.camera-feed]:shrink-0 [&_.camera-feed]:snap-start [&_.camera-feed]:rounded-none [&_.camera-feed]:border-0">{previews}</div>
        <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-primary-foreground backdrop-blur"><i className={cn('size-2 rounded-full bg-neutral-400', record.recording && 'bg-red-500 ')} />{formatTime(elapsed)}</div>
      </section>

      <Card className="relative z-[2] -mt-7 p-4 lg:col-start-2 lg:row-start-1 lg:mt-0"><div className="flex justify-between text-sm text-muted-foreground"><span>当前任务</span><em className="not-italic font-extrabold text-primary">{taskCaptured}/30</em></div><h2 className="mb-1 mt-2 text-xl font-bold">把药盒、药瓶、空药瓶分类</h2><p className="text-xs text-muted-foreground">家庭收纳 · 3 类物体 · TSK-20260815-017</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary"><i className="block h-full rounded-full bg-primary" style={{ width: `${taskCaptured / 30 * 100}%` }} /></div></Card>

      {files.files[0] && <Card className="p-4 shadow-none lg:col-start-2"><SectionHeader title="最近记录" action="全部" onClick={() => go?.('records')} /><RecordingRow item={files.files[0]} compact onClick={() => go?.('records')} /></Card>}

      <Card className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-30 grid grid-cols-[1fr_1.25fr_1fr] items-center gap-2 rounded-[1.5rem] bg-card/95 p-2.5 backdrop-blur-xl" aria-label="采集操作">
        <CaptureControl disabled={!record.recording} icon={paused ? <Play /> : <Pause />} label={paused ? '继续' : '暂停'} onClick={togglePaused} />
        <button className="grid place-items-center gap-1 border-0 bg-transparent text-foreground disabled:opacity-45" disabled={busy || !record.cameraConnected} onClick={toggleRecord}><span className={cn('grid size-14 place-items-center rounded-full bg-primary text-primary-foreground ', record.recording && 'bg-destructive ')}>{record.recording ? <Square className="size-5" /> : <Play className="size-5" />}</span><strong className="text-xs">{busy ? '处理中' : record.recording ? '停止' : '录制'}</strong></button>
        <CaptureControl disabled={!record.cameraConnected || record.recording || liveBusy} icon={<Camera />} label={record.previewing ? '停止预览' : '预览'} onClick={togglePreview} />
        <div className="col-span-3 grid grid-cols-2 gap-2 border-t border-border pt-2">
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-0 bg-secondary text-xs text-muted-foreground" onClick={() => notify('云端上报接口待接入')}><CloudUpload className="size-4" />上报</button>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-0 bg-secondary text-xs text-muted-foreground" onClick={() => go?.('diagnostics')}><RadioTower className="size-4" />诊断</button>
        </div>
      </Card>
    </div>
  )
}

function SectionKicker({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-extrabold tracking-[.12em] text-sky-500">{children}</span>
}

function SectionHeader({ kicker, title, action, onClick }: { kicker?: string; title: string; action: string; onClick: () => void }) {
  return <header className="mb-2.5 flex items-center justify-between"><div>{kicker && <SectionKicker>{kicker}</SectionKicker>}<h2 className={cn('text-xl font-bold', kicker && 'mt-1')}>{title}</h2></div><button className="inline-flex min-h-11 items-center border-0 bg-transparent px-2 text-sm font-semibold text-primary" onClick={onClick}>{action}<ChevronRight className="size-4" /></button></header>
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <span className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-[.85rem] bg-secondary/85 p-3 text-xs text-muted-foreground"><span className="row-span-2 text-primary [&>svg]:size-5">{icon}</span>{label}<strong className="text-sm text-foreground">{value}</strong></span>
}

function QuickAction({ icon, title, description, primary, tone, onClick }: { icon: ReactNode; title: string; description: string; primary?: boolean; tone?: 'amber'; onClick: () => void }) {
  return <button className={cn('grid min-h-20 min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-[1.1rem] border border-border bg-card p-3 text-left text-foreground', tone === 'amber' && 'border-amber-500/30 bg-amber-500/10 text-amber-500', primary && 'border-blue-600 bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-blue-500/20')} onClick={onClick}><span className="[&>svg]:size-5">{icon}</span><span className="grid min-w-0 gap-0.5"><strong className="text-sm">{title}</strong><small className="truncate text-[11px] opacity-70">{description}</small></span><ChevronRight className="size-4" /></button>
}

function CaptureControl({ disabled, icon, label, onClick }: { disabled: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className="grid place-items-center gap-1 border-0 bg-transparent text-foreground disabled:opacity-45" disabled={disabled} onClick={onClick}><span className="grid size-10 place-items-center rounded-full bg-secondary [&>svg]:size-4">{icon}</span><small className="text-xs">{label}</small></button>
}
