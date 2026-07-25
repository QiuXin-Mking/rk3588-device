import {
  Activity,
  Bluetooth,
  ChevronRight,
  CircleUserRound,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Hand,
  HardDrive,
  Info,
  Languages,
  LogOut,
  Power,
  QrCode,
  Radio,
  RefreshCw,
  RotateCw,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Navigate, Notify, ScreenCommonProps } from '../../app/model'
import {
  api,
  type DeviceStatus,
  type BluetoothDevice,
  type RecordStatus,
  type WifiNetwork,
} from '../../services/deviceApi'
import { formatBytes } from '../../shared/format'
import { useI18n } from '../../shared/i18n/I18n'
import {
  Brand,
  EmptyState,
  HandSkeleton,
  HumanFigure,
  PageHeader,
} from '../../shared/ui/DevicePrimitives'
import { TouchKeyboard } from '../../shared/ui/TouchKeyboard'

export function ProfileScreen({ status, online, go, notify }: ScreenCommonProps) {
  return (
    <div className="page profile-screen">
      <PageHeader
        title="我的主页"
        subtitle="设备、服务与系统设置"
      />
      <div className="profile-workspace">
        <section className="profile-card card">
          <div className="avatar"><CircleUserRound /></div>
          <div className="profile-account-content">
            <h2>设备操作员</h2>
            <p>本地账户 · 云端账户待接入</p>
          </div>
          <div className="profile-account-actions">
            <button className="profile-account-open" onClick={() => go('account')}>
              <span>账户详情</span>
              <ChevronRight />
            </button>
            <button
              className="profile-logout-button"
              title="账户系统待接入"
              onClick={() => notify('账户系统待接入')}
            >
              <LogOut />
              <span>退出登录</span>
            </button>
          </div>
        </section>
        <section className="profile-group card">
          <h3>设备</h3>
          <ProfileItem icon={<Database />} label="设备管理" value={online ? '1 台在线' : '设备离线'} onClick={() => go('device-list')} />
          <ProfileItem icon={<Wifi />} label="WiFi 设置" value={status.wifi.connected ? status.wifi.ssid : '未连接'} onClick={() => go('wifi')} />
          <ProfileItem icon={<Bluetooth />} label="手套与蓝牙" value={status.bluetooth.connected ? '已连接' : '未连接'} onClick={() => go('bluetooth')} />
        </section>
        <section className="profile-group card">
          <h3>系统</h3>
          <ProfileItem icon={<Settings />} label="设置" onClick={() => go('settings')} />
          <ProfileItem icon={<Info />} label="关于" onClick={() => go('about')} />
          <ProfileItem icon={<Radio />} label="论坛" value="待接入" />
          <ProfileItem icon={<ShieldCheck />} label="服务与支持" value="待接入" />
        </section>
      </div>
    </div>
  )
}

function ProfileItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode
  label: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button className="profile-item" onClick={onClick} disabled={!onClick}>
      <span className="profile-item-icon">{icon}</span>
      <strong>{label}</strong>
      {value && <small>{value}</small>}
      <ChevronRight />
    </button>
  )
}

export function DeviceListScreen({
  status,
  back,
  go,
}: {
  status: DeviceStatus
  back: () => void
  go: Navigate
}) {
  return (
    <div className="page detail-page device-list-screen">
      <PageHeader
        title="管理设备"
        subtitle="已绑定设备"
        back={back}
        action={
          <div className="header-actions">
            <button className="header-action-button" onClick={() => go('package-download')}>大包下载</button>
            <button className="icon-button" onClick={() => go('device-type')} aria-label="添加设备"><QrCode /></button>
          </div>
        }
      />
      <div className="split-workspace">
        <button className="device-row card" onClick={() => go('device-info')}>
          <span className="device-cube"><Database /></span>
          <span>
            <strong>iSuit_96</strong>
            <small><span className="status-dot" /> {status.ts ? '本机设备' : '离线'}</small>
          </span>
          <span className="device-power"><Power /></span>
          <ChevronRight />
        </button>
        <section className="card center-panel">
          <EmptyState
            icon={<ScanLine />}
            title="添加更多设备"
            description="支持扫码绑定和设备类型选择。"
            action={<button className="secondary-button" onClick={() => go('device-type')}>添加设备</button>}
          />
        </section>
      </div>
    </div>
  )
}

export function DeviceTypeScreen({ back, go }: { back: () => void; go: Navigate }) {
  return (
    <div className="page detail-page">
      <PageHeader title="选择设备类型" subtitle="选择需要绑定的设备" back={back} />
      <div className="device-type-grid">
        <button className="device-type-card card" onClick={() => go('qr-scan')}>
          <div className="wearable-illustration"><Hand /></div>
          <div><h2>HSuit</h2><p>手部动作捕捉套件</p></div>
          <ChevronRight />
        </button>
        <button className="device-type-card card" onClick={() => go('qr-scan')}>
          <div className="wearable-illustration"><Activity /></div>
          <div><h2>iSuit</h2><p>多传感器采集套件</p></div>
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}

export function QrScanScreen({ back, go }: { back: () => void; go: Navigate }) {
  return (
    <div className="page detail-page scan-page">
      <PageHeader title="扫描二维码" subtitle="摄像头扫码接口待接入" back={back} />
      <div className="scanner card">
        <div className="scan-window"><span /><span /><span /><span /><i /></div>
        <QrCode />
        <h2>将设备二维码放入框内</h2>
        <p>当前后端尚未提供二维码识别接口。</p>
        <button className="secondary-button" onClick={() => go('add-device')}>手动确认设备</button>
      </div>
    </div>
  )
}

export function AddDeviceScreen({ back, go }: { back: () => void; go: Navigate }) {
  return (
    <div className="page detail-page add-device-screen">
      <PageHeader title="添加设备" subtitle="确认设备信息" back={back} />
      <section className="add-device-card card">
        <HumanFigure />
        <div className="device-identifiers">
          <div><span>当前选中</span><strong>iSuit</strong></div>
          <div><span>通信方式</span><strong>本机网络</strong></div>
          <div><span>绑定状态</span><strong>接口待接入</strong></div>
          <button className="primary-button" onClick={() => go('device-info')}>查看本机设备</button>
        </div>
      </section>
    </div>
  )
}

export function DeviceInfoScreen({
  status,
  record,
  back,
}: {
  status: DeviceStatus
  record: RecordStatus
  back: () => void
}) {
  const sensors = [
    ['左手相机', false],
    ['左手压力', Boolean(record.gloveSides?.left)],
    ['右手相机', false],
    ['右手压力', Boolean(record.gloveSides?.right)],
  ] as const

  return (
    <div className="page detail-page device-info-screen">
      <PageHeader title="设备信息" subtitle="iSuit_96" back={back} />
      <div className="device-info-layout">
        <section className="device-figure card">
          <HumanFigure />
          <div className="device-health">
            <span className="status-dot" />
            {record.cameraConnected || record.gloveConnected ? '部分传感器在线' : '等待传感器'}
          </div>
        </section>
        <section className="device-specs card">
          <span className="eyebrow">DEVICE STATUS</span>
          <h2>运行状态</h2>
          <dl>
            <div><dt>电量</dt><dd>{status.battery.pct}%</dd></div>
            <div><dt>电压</dt><dd>{status.battery.voltage || '—'} V</dd></div>
            <div><dt>存储</dt><dd>{formatBytes(status.storage.used)} / {formatBytes(status.storage.total)}</dd></div>
            <div><dt>网络</dt><dd>{status.wifi.connected ? status.wifi.ssid : '未连接'}</dd></div>
            <div><dt>相机</dt><dd>{record.cameraConnected ? record.cameraType || '在线' : '离线'}</dd></div>
          </dl>
        </section>
        <section className="sensor-grid">
          {sensors.map(([name, ok]) => (
            <div className="sensor-tile card" key={name}>
              <span className={`signal ${ok ? 'ok' : ''}`} />
              <strong>{name}</strong>
              <small>{ok ? '在线' : '通道待接入'}</small>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

export function WifiScreen({
  status,
  back,
  notify,
  refreshStatus,
}: {
  status: DeviceStatus
  back: () => void
  notify: Notify
  refreshStatus: () => Promise<void>
}) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [scanning, setScanning] = useState(false)
  const [pendingNetwork, setPendingNetwork] = useState<WifiNetwork | null>(null)

  const scan = async () => {
    setScanning(true)
    try {
      setNetworks((await api.wifiScan()).networks)
    } catch {
      notify('WiFi 扫描失败')
    } finally {
      setScanning(false)
    }
  }

  const connect = async (network: WifiNetwork, password: string) => {
    try {
      const result = await api.wifiConnect(network.ssid, password)
      if (!result.ok) throw new Error(result.error || '连接失败')
      notify(`已连接 ${network.ssid}`)
      setPendingNetwork(null)
      await refreshStatus()
    } catch (error) {
      notify(error instanceof Error ? error.message : '连接失败')
    }
  }

  const chooseNetwork = (network: WifiNetwork) => {
    const secured = Boolean(network.security && !/^none$/i.test(network.security))
    if (secured) setPendingNetwork(network)
    else connect(network, '')
  }

  return (
    <div className="page detail-page wifi-screen">
      <PageHeader
        title="WiFi 设置"
        subtitle={status.wifi.connected ? `已连接 ${status.wifi.ssid}` : '当前未连接'}
        back={back}
        action={
          <button className="icon-button" onClick={scan} aria-label="扫描网络">
            <RefreshCw className={scanning ? 'spin' : ''} />
          </button>
        }
      />
      <div className="wifi-workspace">
        <section className="connected-network card">
          <Wifi />
          <div>
            <strong>{status.wifi.connected ? status.wifi.ssid : '未连接网络'}</strong>
            <small>{status.wifi.connected ? `信号 ${status.wifi.signal}%` : '请扫描并选择网络'}</small>
          </div>
          {status.wifi.connected && (
            <button onClick={async () => {
              await api.wifiDisconnect()
              notify('WiFi 已断开')
              refreshStatus()
            }}>
              断开
            </button>
          )}
        </section>
        <section className="network-list card">
          <div className="card-topline"><h2>可用网络</h2><span>{scanning ? '扫描中…' : `${networks.length} 个`}</span></div>
          <div className="network-scroll local-scroll">
            {networks.length ? (
              networks.map((network) => (
                <button key={network.ssid} onClick={() => chooseNetwork(network)}>
                  <Wifi />
                  <span><strong>{network.ssid}</strong><small>{network.security || '开放网络'}</small></span>
                  <em>{network.signal}%</em>
                  <ChevronRight />
                </button>
              ))
            ) : (
              <EmptyState
                icon={<WifiOff />}
                title={scanning ? '正在扫描' : '尚未扫描网络'}
                action={<button className="secondary-button" onClick={scan}>开始扫描</button>}
              />
            )}
          </div>
        </section>
      </div>
      {pendingNetwork && (
        <PasswordDialog
          network={pendingNetwork}
          onCancel={() => setPendingNetwork(null)}
          onConnect={(password) => connect(pendingNetwork, password)}
        />
      )}
    </div>
  )
}

function PasswordDialog({
  network,
  onCancel,
  onConnect,
}: {
  network: WifiNetwork
  onCancel: () => void
  onConnect: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const applyKey = (key: string) => {
    setPassword((current) =>
      key === 'backspace' ? current.slice(0, -1) : `${current}${key}`,
    )
  }
  return (
    <div className="choice-overlay" role="dialog" aria-modal="true" aria-label="输入 WiFi 密码">
      <section className="password-panel card">
        <header>
          <div><span>连接网络</span><h2>{network.ssid}</h2></div>
          <button className="icon-button" onClick={onCancel} aria-label="关闭"><X /></button>
        </header>
        <label>
          <span>WiFi 密码</span>
          <div className="password-input-row">
            <input
              className="touch-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              readOnly
              inputMode="none"
              placeholder="请输入密码"
            />
            <button
              className="password-visibility"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </label>
        <TouchKeyboard onKey={applyKey} onDone={() => onConnect(password)} />
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onCancel}>取消</button>
          <button className="primary-button" onClick={() => onConnect(password)}>连接</button>
        </div>
      </section>
    </div>
  )
}

export function BluetoothScreen({
  status,
  back,
  notify,
  refreshStatus,
}: {
  status: DeviceStatus
  back: () => void
  notify: Notify
  refreshStatus: () => Promise<void>
}) {
  const gloves = status.bluetooth.gloves || {}
  const [panel, setPanel] = useState<'devices' | 'scan' | 'calibration'>('devices')
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [scanning, setScanning] = useState(false)
  const [calibrating, setCalibrating] = useState('')

  const toggle = async (side: 'left' | 'right', connected: boolean, address?: string) => {
    try {
      if (connected) await api.bluetoothDisconnect()
      else {
        const target = address || gloves[side]?.address || (side === 'left' ? '04:26:04:15:0C:65' : '04:26:04:09:0A:9B')
        await api.bluetoothConnect(target)
      }
      notify(connected ? '蓝牙连接已断开' : '正在连接手套')
      await refreshStatus()
    } catch (error) {
      notify(error instanceof Error ? error.message : '蓝牙操作失败')
    }
  }

  const scan = async () => {
    setScanning(true)
    try {
      setDevices((await api.bluetoothScan()).devices)
    } catch {
      notify('蓝牙扫描失败')
    } finally {
      setScanning(false)
    }
  }

  const controlCalibrator = async (action: 'start' | 'stop' | 'restart') => {
    try {
      await api.calibrator(action)
      notify(action === 'start' ? '校准服务已启动' : action === 'stop' ? '校准服务已停止' : '校准服务已重启')
      await refreshStatus()
    } catch (error) {
      notify(error instanceof Error ? error.message : '校准服务操作失败')
    }
  }

  const startCalibration = async (side: 'left' | 'right') => {
    const wired = Boolean(status.wiredGloves?.[side])
    const bluetooth = Boolean(gloves[side]?.connected)
    const transport: 'wired' | 'spp' = wired && !bluetooth ? 'wired' : 'spp'
    setCalibrating(side)
    try {
      const result = await api.calibrateStart(side, transport)
      if (!result.ok) throw new Error(result.error || '校准连接失败')
      const target = `http://${window.location.hostname}:8888/?kiosk=1&side=${side}&transport=${transport}`
      window.location.href = target
    } catch (error) {
      notify(error instanceof Error ? error.message : '校准连接失败')
      setCalibrating('')
    }
  }

  return (
    <div className="page detail-page bluetooth-screen">
      <PageHeader
        title="手套与蓝牙"
        subtitle="SPP / USB 连接状态"
        back={back}
        action={
          <button
            className="header-action-button"
            onClick={() => toggle('right', false)}
          >
            <RefreshCw />重新连接
          </button>
        }
      />
      <nav className="segmented-tabs" aria-label="手套与蓝牙功能">
        <button className={panel === 'devices' ? 'active' : ''} onClick={() => setPanel('devices')}><Hand />手套</button>
        <button className={panel === 'scan' ? 'active' : ''} onClick={() => setPanel('scan')}><Search />扫描</button>
        <button className={panel === 'calibration' ? 'active' : ''} onClick={() => setPanel('calibration')}><Wrench />校准</button>
      </nav>

      <div className="bluetooth-panel">
        {panel === 'devices' && (
          <div className="glove-grid">
            {(['left', 'right'] as const).map((side) => {
              const glove = gloves[side]
              const wired = Boolean(status.wiredGloves?.[side])
              const connected = Boolean(glove?.connected || wired)
              return (
                <section className="glove-card card" key={side}>
                  <HandSkeleton active={connected} flipped={side === 'left'} />
                  <div>
                    <span className="eyebrow">{side === 'left' ? 'LEFT HAND' : 'RIGHT HAND'}</span>
                    <h2>{side === 'left' ? '左手手套' : '右手手套'}</h2>
                    <p>{wired ? 'USB 有线连接' : glove?.connected ? `Bluetooth SPP · ${glove.address}` : '未连接'}</p>
                  </div>
                  <button
                    className={connected ? 'danger-button' : 'secondary-button'}
                    onClick={() => toggle(side, connected)}
                    disabled={wired}
                  >
                    {wired ? '有线在线' : connected ? '断开' : '连接'}
                  </button>
                </section>
              )
            })}
          </div>
        )}

        {panel === 'scan' && (
          <section className="bt-scan-panel card">
            <div className="card-topline">
              <div><span className="eyebrow">BLUETOOTH DISCOVERY</span><h2>附近设备</h2></div>
              <button className="secondary-button scan-button" onClick={scan} disabled={scanning}>
                <RefreshCw className={scanning ? 'spin' : ''} />
                {scanning ? '扫描中…' : '开始扫描'}
              </button>
            </div>
            <div className="bt-device-list local-scroll">
              {devices.length ? devices.map((device) => (
                <button key={device.address} onClick={() => toggle('right', false, device.address)}>
                  <Bluetooth />
                  <span><strong>{device.name || '未知设备'}</strong><small>{device.address}{device.paired ? ' · 已配对' : ''}</small></span>
                  <em>{device.connected ? '已连接' : '连接'}</em>
                  <ChevronRight />
                </button>
              )) : (
                <EmptyState icon={<Bluetooth />} title={scanning ? '正在扫描附近设备' : '尚未扫描'} action={<button className="primary-button" onClick={scan}>开始扫描</button>} />
              )}
            </div>
          </section>
        )}

        {panel === 'calibration' && (
          <div className="calibration-workspace">
            <section className="calibrator-service card">
              <span className={`menu-icon ${status.calibrator.active ? 'green' : 'violet'}`}><Wrench /></span>
              <div><strong>手套校准服务</strong><small>{status.calibrator.active ? '服务运行中' : '服务未启动'}</small></div>
              <div className="service-actions">
                <button onClick={() => controlCalibrator(status.calibrator.active ? 'stop' : 'start')}>{status.calibrator.active ? '停止' : '启动'}</button>
                <button onClick={() => controlCalibrator('restart')}><RotateCw />重启</button>
                <button onClick={() => { window.location.href = `http://${window.location.hostname}:8888/?kiosk=1` }}><ExternalLink />打开</button>
              </div>
            </section>
            <div className="calibration-sides">
              {(['left', 'right'] as const).map((side) => {
                const wired = Boolean(status.wiredGloves?.[side])
                const bluetooth = Boolean(gloves[side]?.connected)
                const connected = wired || bluetooth
                return (
                  <section className="calibration-card card" key={side}>
                    <HandSkeleton active={connected} flipped={side === 'left'} />
                    <div>
                      <h2>{side === 'left' ? '左手校准' : '右手校准'}</h2>
                      <p>{wired ? 'USB 有线' : bluetooth ? 'Bluetooth SPP' : '请先连接手套'}</p>
                    </div>
                    <button className="primary-button" disabled={!connected || Boolean(calibrating)} onClick={() => startCalibration(side)}>
                      {calibrating === side ? '正在交接…' : '开始校准'}
                    </button>
                  </section>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SettingsScreen({
  status,
  back,
  notify,
}: {
  status: DeviceStatus
  back: () => void
  notify: Notify
}) {
  const { locale, toggleLocale } = useI18n()
  const [postCapture, setPostCapture] = useState(true)
  useEffect(() => {
    api.settings()
      .then((value) => setPostCapture(value.postCaptureEnabled))
      .catch(() => undefined)
  }, [])

  const changePostCapture = async () => {
    const next = !postCapture
    setPostCapture(next)
    try {
      await api.saveSettings(next)
      notify('设置已保存')
    } catch {
      setPostCapture(!next)
      notify('保存失败')
    }
  }

  return (
    <div className="page detail-page settings-screen">
      <PageHeader title="设置" subtitle="本机采集设置" back={back} />
      <section className="settings-list card">
        <button onClick={changePostCapture}>
          <span className="menu-icon blue"><Wrench /></span>
          <span><strong>录制后自动处理</strong><small>停止录制后自动解码 IMU 数据</small></span>
          <Toggle on={postCapture} />
        </button>
        <button onClick={toggleLocale}>
          <span className="menu-icon violet"><Languages /></span>
          <span><strong>界面语言</strong><small>{locale === 'zh' ? '当前：简体中文' : 'Current: English'}</small></span>
          <span className="placeholder-chip">{locale === 'zh' ? '切换' : 'Switch'}</span>
        </button>
        <div>
          <span className="menu-icon green"><HardDrive /></span>
          <span><strong>存储位置</strong><small>{status.storage.mount || '默认录制目录'}</small></span>
          <strong>{status.storage.pct}%</strong>
        </div>
      </section>
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return <span className={`toggle ${on ? 'on' : ''}`}><i /></span>
}

export function AboutScreen({ back }: { back: () => void }) {
  return (
    <div className="page detail-page about-screen">
      <PageHeader title="关于" subtitle="SensorHub 设备采集终端" back={back} />
      <section className="about-card card">
        <Brand />
        <p>面向智能穿戴、双目相机与多传感器数据采集的一体化设备界面。</p>
        <dl>
          <div><dt>界面版本</dt><dd>React 终端版</dd></div>
          <div><dt>目标平台</dt><dd>Debian 11 · ARM64</dd></div>
          <div><dt>物理屏幕</dt><dd>5.5 英寸</dd></div>
          <div><dt>显示模式</dt><dd>1920 × 1080 横屏</dd></div>
        </dl>
      </section>
    </div>
  )
}
