import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceStatus } from '../../../services/deviceApi'
import { MobileBluetoothView } from './MobileBluetoothView'
import { MobileWifiView } from './MobileWifiView'
import { TopbarPortalContext } from '../../../app/TopbarPortal'

function renderMobile(ui: ReactElement) {
  const heading = document.createElement('div')
  const action = document.createElement('div')
  document.body.append(heading, action)
  return render(<TopbarPortalContext.Provider value={{ heading, action }}>{ui}</TopbarPortalContext.Provider>)
}

const status: DeviceStatus = {
  battery: { pct: 80, status: 'charging', voltage: null },
  storage: { used: 10, total: 100, pct: 10 },
  wifi: { connected: true, ssid: 'SensorHub-Lab', signal: 86 },
  bluetooth: { connected: false, gloves: {} },
  calibrator: { active: false, state: 'inactive' },
  recordings: { count: 0, last: '', lastTime: null },
  ts: 0,
}

describe('mobile connectivity views', () => {
  afterEach(() => vi.restoreAllMocks())
  it('keeps WiFi actions available in the mobile layout', () => {
    const chooseNetwork = vi.fn()
    const disconnect = vi.fn()
    const back = vi.fn()
    const scan = vi.fn()
    const toggleHotspot = vi.fn()
    renderMobile(<MobileWifiView status={status} networks={[{ ssid: 'Office-5G', signal: 72, security: 'WPA2', active: false }]} scanning={false} hotspot={false} back={back} scan={scan} chooseNetwork={chooseNetwork} disconnect={disconnect} toggleHotspot={toggleHotspot} />)
    fireEvent.click(screen.getByRole('button', { name: '扫描网络' }))
    fireEvent.click(screen.getByRole('button', { name: /Office-5G/ }))
    fireEvent.click(screen.getByRole('button', { name: '断开' }))
    fireEvent.click(screen.getByRole('button', { name: '开启' }))
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(scan).toHaveBeenCalledOnce()
    expect(toggleHotspot).toHaveBeenCalledOnce()
    expect(back).toHaveBeenCalledOnce()
    expect(chooseNetwork).toHaveBeenCalledWith(expect.objectContaining({ ssid: 'Office-5G' }))
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('uses the WiFi empty-list scan button', () => {
    const scan = vi.fn()
    renderMobile(<MobileWifiView status={{ ...status, wifi: { connected: false, ssid: '', signal: 0 } }} networks={[]} scanning={false} hotspot back={vi.fn()} scan={scan} chooseNetwork={vi.fn()} disconnect={vi.fn()} toggleHotspot={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '开始扫描' }))
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(scan).toHaveBeenCalledOnce()
  })

  it('switches Bluetooth mobile panels without device-sized diagrams', () => {
    const setPanel = vi.fn()
    const reconnect = vi.fn()
    const toggle = vi.fn()
    const back = vi.fn()
    renderMobile(<MobileBluetoothView status={status} panel="devices" setPanel={setPanel} devices={[]} scanning={false} calibrating="" back={back} reconnect={reconnect} scan={vi.fn()} toggle={toggle} controlCalibrator={vi.fn()} startCalibration={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '重连' }))
    for (const button of screen.getAllByRole('button', { name: '连接' })) fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    fireEvent.click(screen.getByRole('tab', { name: '手套' }))
    fireEvent.click(screen.getByRole('tab', { name: '扫描' }))
    fireEvent.click(screen.getByRole('tab', { name: '校准' }))
    expect(setPanel).toHaveBeenCalledWith('scan')
    expect(setPanel).toHaveBeenCalledWith('calibration')
    expect(reconnect).toHaveBeenCalledOnce()
    expect(toggle).toHaveBeenCalledTimes(2)
    expect(back).toHaveBeenCalledOnce()
    expect(screen.queryByText('LEFT HAND')).not.toBeInTheDocument()
  })

  it('uses every Bluetooth scan-panel action with populated devices', () => {
    const scan = vi.fn()
    const toggle = vi.fn()
    renderMobile(<MobileBluetoothView status={status} panel="scan" setPanel={vi.fn()} devices={[{ name: 'Stress Glove', address: 'AA:BB:CC:DD', paired: true, connected: false }]} scanning={false} calibrating="" back={vi.fn()} reconnect={vi.fn()} scan={scan} toggle={toggle} controlCalibrator={vi.fn()} startCalibration={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '扫描' }))
    fireEvent.click(screen.getByRole('button', { name: /Stress Glove/ }))
    expect(scan).toHaveBeenCalledOnce()
    expect(toggle).toHaveBeenCalledWith('right', false, 'AA:BB:CC:DD')
  })

  it('uses every Bluetooth calibration action while hardware stays mocked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const control = vi.fn()
    const startCalibration = vi.fn()
    const connected = { ...status, bluetooth: { connected: true, gloves: { left: { connected: true, device: 'Stress Left', address: 'LEFT' }, right: { connected: true, device: 'Stress Right', address: 'RIGHT' } } } }
    renderMobile(<MobileBluetoothView status={connected} panel="calibration" setPanel={vi.fn()} devices={[]} scanning={false} calibrating="" back={vi.fn()} reconnect={vi.fn()} scan={vi.fn()} toggle={vi.fn()} controlCalibrator={control} startCalibration={startCalibration} />)
    fireEvent.click(screen.getByRole('button', { name: '启动' }))
    fireEvent.click(screen.getByRole('button', { name: '重启' }))
    fireEvent.click(screen.getByRole('button', { name: '打开' }))
    for (const button of screen.getAllByRole('button', { name: '开始' })) fireEvent.click(button)
    expect(control).toHaveBeenCalledWith('start')
    expect(control).toHaveBeenCalledWith('restart')
    expect(startCalibration).toHaveBeenCalledWith('left')
    expect(startCalibration).toHaveBeenCalledWith('right')
  })
})
