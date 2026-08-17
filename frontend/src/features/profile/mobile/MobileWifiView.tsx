import { ChevronRight, Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import type { DeviceStatus, WifiNetwork } from '../../../services/deviceApi'
import { PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Card } from '@/components/ui/card'

export function MobileWifiView({
  status,
  networks,
  scanning,
  hotspot,
  back,
  scan,
  chooseNetwork,
  disconnect,
  toggleHotspot,
}: {
  status: DeviceStatus
  networks: WifiNetwork[]
  scanning: boolean
  hotspot: boolean
  back: () => void
  scan: () => void
  chooseNetwork: (network: WifiNetwork) => void
  disconnect: () => void
  toggleHotspot: () => void
}) {
  return (
    <div className="page detail-page flex min-h-full flex-col gap-3 pb-6">
      <PageHeader
        title="WiFi 设置"
        back={back}
        action={
          <button className="grid size-10 place-items-center rounded-full bg-secondary text-foreground" onClick={scan} aria-label="扫描网络">
            <RefreshCw className={`size-5 ${scanning ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <Card className="flex items-center gap-3 rounded-[1.25rem] p-4 shadow-none">
        <span className={`grid size-12 shrink-0 place-items-center rounded-lg ${status.wifi.connected ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {status.wifi.connected ? <Wifi className="size-6" /> : <WifiOff className="size-6" />}
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <strong className="truncate text-base">{status.wifi.connected ? status.wifi.ssid : '未连接网络'}</strong>
          <small className="text-xs text-muted-foreground">{status.wifi.connected ? `信号 ${status.wifi.signal}%` : '扫描后选择可用网络'}</small>
        </span>
        {status.wifi.connected && <button className="min-h-10 rounded-lg border border-destructive/25 px-3 text-sm font-semibold text-destructive" onClick={disconnect}>断开</button>}
      </Card>

      <section className="grid gap-2">
        <div className="flex items-end justify-between px-1">
          <div><h2 className="text-base font-bold">可用网络</h2><p className="mt-0.5 text-xs text-muted-foreground">选择网络后连接设备</p></div>
          <span className="text-xs text-muted-foreground">{scanning ? '扫描中…' : `${networks.length} 个`}</span>
        </div>
        <Card className="divide-y divide-border overflow-hidden rounded-[1.25rem] p-0 shadow-none">
          {networks.length ? networks.map(network => (
            <button className="grid min-h-[4.5rem] w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 text-left active:bg-muted" key={network.ssid} onClick={() => chooseNetwork(network)}>
              <Wifi className="size-5 text-primary" />
              <span className="grid min-w-0 gap-0.5"><strong className="truncate text-sm">{network.ssid}</strong><small className="truncate text-xs text-muted-foreground">{network.security || '开放网络'}</small></span>
              <span className="text-xs font-semibold text-muted-foreground">{network.signal}%</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          )) : (
            <div className="grid min-h-44 place-items-center gap-3 px-5 py-7 text-center">
              <WifiOff className="size-9 text-muted-foreground" />
              <div><strong className="text-sm">{scanning ? '正在扫描附近网络' : '尚未扫描网络'}</strong><p className="mt-1 text-xs text-muted-foreground">点击下方按钮获取可用 WiFi</p></div>
              <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground" onClick={scan}>开始扫描</button>
            </div>
          )}
        </Card>
      </section>

      <Card className="mt-auto flex items-center gap-3 rounded-[1.25rem] p-4 shadow-none">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent-foreground"><Radio className="size-5" /></span>
        <span className="grid min-w-0 flex-1 gap-1"><strong className="text-sm">设备热点</strong><small className="text-xs leading-5 text-muted-foreground">{hotspot ? 'SensorHub-RK3588 · 192.168.4.1' : '关闭时使用上方 WiFi 网络'}</small></span>
        <button className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${hotspot ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'}`} onClick={toggleHotspot}>{hotspot ? '关闭' : '开启'}</button>
      </Card>
    </div>
  )
}
