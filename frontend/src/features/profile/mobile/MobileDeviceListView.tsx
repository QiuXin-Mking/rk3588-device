import { Activity, ChevronRight, Link2, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { Navigate } from '../../../app/model'
import { cn } from '../../../shared/lib/cn'
import { deviceTone } from '../../home/homeModel'
import { Button } from '@/components/ui/button'
import { PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export type MobileDeviceItem = {
  id: string
  name: string
  subtitle: string
  connected: boolean
  labels: string[]
  icon: React.ReactNode
}

export function MobileDeviceListView({ back, go, devices, onRefresh }: { back: () => void; go: Navigate; devices: MobileDeviceItem[]; onRefresh: () => Promise<void> }) {
  const connected = devices.filter(device => device.connected).length
  const [refreshing, setRefreshing] = useState(false)
  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }
  return <div className="page detail-page flex min-h-full flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,.5fr)] lg:content-start">
    <PageHeader title="设备与套件" subtitle={`${connected}/${devices.length} 台在线`} back={back} />
    <Card className="grid grid-cols-[1fr_auto] items-center gap-3.5 bg-card p-4.5 lg:col-span-2"><div className="flex items-center gap-3"><Activity className="size-6 text-primary" /><span className="grid gap-0.5"><small className="text-xs text-muted-foreground">连接状态</small><strong>{connected ? '采集设备已就绪' : '等待设备连接'}</strong></span></div><span className={cn('grid size-13 place-items-center rounded-full border-[5px] border-border font-extrabold', connected && 'border-primary')}>{connected}/{devices.length}</span><Button className="col-span-2" disabled={refreshing} onClick={refresh}><RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />{refreshing ? '刷新中…' : '刷新状态'}</Button></Card>
    <Card className="rounded-[1.25rem] p-4 shadow-none"><header className="mb-1 flex items-center justify-between"><h2 className="text-xl font-bold">已绑定设备</h2><button className="inline-flex min-h-11 items-center gap-1 border-0 bg-transparent px-2 text-sm font-semibold text-sky-500" onClick={() => go('device-type')}><Plus className="size-4" />添加</button></header>{devices.map(device => <button className="grid w-full min-w-0 grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 border-0 border-b border-border bg-transparent py-3 text-left text-foreground last:border-b-0" key={device.id} onClick={() => go('device-info')}><span className={cn('grid size-11 place-items-center rounded-[.9rem] bg-secondary text-muted-foreground [&>svg]:size-5', device.connected && deviceTone(device.id))}>{device.icon}</span><span className="grid min-w-0 gap-0.5"><strong className="truncate text-sm">{device.name}</strong><small className="truncate text-[11px] text-muted-foreground">{device.subtitle} · {device.id}</small><em className="truncate text-[11px] not-italic text-muted-foreground">{device.labels.join(' · ') || '控制设备'}</em></span><Badge className={cn(device.connected && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500')} variant={device.connected ? 'outline' : 'secondary'}>{device.connected ? '在线' : '离线'}</Badge><ChevronRight className="size-4 text-muted-foreground" /></button>)}</Card>
    <Card className="grid grid-cols-[auto_1fr] gap-3 rounded-[1.25rem] border-dashed border-violet-500/40 bg-violet-500/5 p-4 shadow-none lg:self-start"><Link2 className="size-6 text-violet-500" /><div><strong>绑定新套件</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">支持扫描设备二维码或手动输入设备 SN，并选择头部、腕部等绑定位置。</p></div><Button className="col-span-2" variant="default" onClick={() => go('device-type')}>开始绑定<ChevronRight className="size-4" /></Button></Card>
  </div>
}
