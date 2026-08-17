import { Bluetooth, ChevronRight, ExternalLink, Hand, RefreshCw, RotateCw, Search, Wrench } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { BluetoothDevice, DeviceStatus } from '../../../services/deviceApi'
import { PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Panel = 'devices' | 'scan' | 'calibration'

export function MobileBluetoothView({
  status,
  panel,
  setPanel,
  devices,
  scanning,
  calibrating,
  back,
  reconnect,
  scan,
  toggle,
  controlCalibrator,
  startCalibration,
}: {
  status: DeviceStatus
  panel: Panel
  setPanel: Dispatch<SetStateAction<Panel>>
  devices: BluetoothDevice[]
  scanning: boolean
  calibrating: string
  back: () => void
  reconnect: () => void
  scan: () => void
  toggle: (side: 'left' | 'right', connected: boolean, address?: string) => void
  controlCalibrator: (action: 'start' | 'stop' | 'restart') => void
  startCalibration: (side: 'left' | 'right') => void
}) {
  const gloves = status.bluetooth.gloves || {}
  const sides = (['left', 'right'] as const).map(side => {
    const wired = Boolean(status.wiredGloves?.[side])
    const glove = gloves[side]
    return { side, wired, glove, connected: Boolean(wired || glove?.connected) }
  })

  return (
    <div className="page detail-page flex min-h-full flex-col gap-3 pb-6">
      <PageHeader title="手套与蓝牙" back={back} action={<Button size="touch" onClick={reconnect}><RefreshCw data-icon="inline-start" />重连</Button>} />

      <Tabs value={panel} onValueChange={value => setPanel(value as Panel)} className="gap-3">
      <TabsList className="grid h-12 w-full grid-cols-3" aria-label="手套与蓝牙功能">
        {([
          ['devices', Hand, '手套'],
          ['scan', Search, '扫描'],
          ['calibration', Wrench, '校准'],
        ] as const).map(([id, Icon, label]) => <TabsTrigger className="h-10" key={id} value={id}><Icon data-icon="inline-start" />{label}</TabsTrigger>)}
      </TabsList>

      <TabsContent value="devices"><section className="grid gap-3">
        <div className="px-1"><h2 className="text-base font-bold">已配置手套</h2><p className="mt-0.5 text-xs text-muted-foreground">支持 Bluetooth SPP 与 USB 有线连接</p></div>
        {sides.map(({ side, wired, glove, connected }) => <Card className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.25rem] p-4 shadow-none" key={side}>
          <span className={`grid size-12 place-items-center rounded-lg ${connected ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'}`}><Hand className="size-6" /></span>
          <span className="grid min-w-0 gap-1"><strong className="text-sm">{side === 'left' ? '左手手套' : '右手手套'}</strong><small className="truncate text-xs text-muted-foreground">{wired ? 'USB 有线连接' : glove?.connected ? `Bluetooth · ${glove.address}` : '当前未连接'}</small></span>
          <button className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${connected && !wired ? 'border border-destructive/25 text-destructive' : 'border border-border text-foreground'} disabled:opacity-50`} onClick={() => toggle(side, connected)} disabled={wired}>{wired ? '有线' : connected ? '断开' : '连接'}</button>
        </Card>)}
      </section></TabsContent>

      <TabsContent value="scan"><section className="grid gap-3">
        <div className="flex items-end justify-between px-1"><div><h2 className="text-base font-bold">附近设备</h2><p className="mt-0.5 text-xs text-muted-foreground">扫描可连接的蓝牙设备</p></div><button className="flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold" onClick={scan} disabled={scanning}><RefreshCw className={`size-4 ${scanning ? 'animate-spin' : ''}`} />{scanning ? '扫描中' : '扫描'}</button></div>
        <Card className="divide-y divide-border overflow-hidden rounded-[1.25rem] p-0 shadow-none">
          {devices.length ? devices.map(device => <button className="grid min-h-[4.5rem] w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 text-left" key={device.address} onClick={() => toggle('right', false, device.address)}><Bluetooth className="size-5 text-primary" /><span className="grid min-w-0 gap-0.5"><strong className="truncate text-sm">{device.name || '未知设备'}</strong><small className="truncate text-xs text-muted-foreground">{device.address}{device.paired ? ' · 已配对' : ''}</small></span><span className="text-xs font-semibold text-primary">{device.connected ? '已连接' : '连接'}</span><ChevronRight className="size-4 text-muted-foreground" /></button>) : <div className="grid min-h-48 place-items-center gap-3 p-6 text-center"><Bluetooth className="size-9 text-muted-foreground" /><div><strong className="text-sm">{scanning ? '正在扫描附近设备' : '尚未扫描'}</strong><p className="mt-1 text-xs text-muted-foreground">点击扫描查找蓝牙设备</p></div><button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground" onClick={scan}>开始扫描</button></div>}
        </Card>
      </section></TabsContent>

      <TabsContent value="calibration"><section className="grid gap-3">
        <Card className="grid grid-cols-[auto_1fr] gap-3 rounded-[1.25rem] p-4 shadow-none">
          <span className={`grid size-11 place-items-center rounded-lg ${status.calibrator.active ? 'bg-primary/12 text-primary' : 'bg-accent/12 text-accent-foreground'}`}><Wrench className="size-5" /></span>
          <span className="grid gap-1"><strong className="text-sm">手套校准服务</strong><small className="text-xs text-muted-foreground">{status.calibrator.active ? '服务运行中' : '服务未启动'}</small></span>
          <div className="col-span-2 grid grid-cols-3 gap-2"><button className="min-h-10 rounded-lg border border-border text-sm font-semibold" onClick={() => controlCalibrator(status.calibrator.active ? 'stop' : 'start')}>{status.calibrator.active ? '停止' : '启动'}</button><button className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-border text-sm font-semibold" onClick={() => controlCalibrator('restart')}><RotateCw className="size-4" />重启</button><button className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-border text-sm font-semibold" onClick={() => { window.location.href = `http://${window.location.hostname}:8888/?kiosk=1` }}><ExternalLink className="size-4" />打开</button></div>
        </Card>
        {sides.map(({ side, wired, glove, connected }) => <Card className="flex items-center gap-3 rounded-[1.25rem] p-4 shadow-none" key={side}><span className={`grid size-11 place-items-center rounded-lg ${connected ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'}`}><Hand className="size-5" /></span><span className="grid min-w-0 flex-1 gap-1"><strong className="text-sm">{side === 'left' ? '左手校准' : '右手校准'}</strong><small className="text-xs text-muted-foreground">{wired ? 'USB 有线' : glove?.connected ? 'Bluetooth SPP' : '请先连接手套'}</small></span><button className="min-h-10 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-40" disabled={!connected || Boolean(calibrating)} onClick={() => startCalibration(side)}>{calibrating === side ? '交接中' : '开始'}</button></Card>)}
      </section></TabsContent>
      </Tabs>
    </div>
  )
}
