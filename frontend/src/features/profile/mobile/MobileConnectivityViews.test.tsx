import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DeviceStatus } from '../../../services/deviceApi'
import { MobileBluetoothView } from './MobileBluetoothView'
import { MobileWifiView } from './MobileWifiView'

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
  it('keeps WiFi actions available in the mobile layout', () => {
    const chooseNetwork = vi.fn()
    const disconnect = vi.fn()
    render(<MobileWifiView status={status} networks={[{ ssid: 'Office-5G', signal: 72, security: 'WPA2', active: false }]} scanning={false} hotspot={false} back={vi.fn()} scan={vi.fn()} chooseNetwork={chooseNetwork} disconnect={disconnect} toggleHotspot={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Office-5G/ }))
    fireEvent.click(screen.getByRole('button', { name: '断开' }))
    expect(chooseNetwork).toHaveBeenCalledWith(expect.objectContaining({ ssid: 'Office-5G' }))
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('switches Bluetooth mobile panels without device-sized diagrams', () => {
    const setPanel = vi.fn()
    render(<MobileBluetoothView status={status} panel="devices" setPanel={setPanel} devices={[]} scanning={false} calibrating="" back={vi.fn()} reconnect={vi.fn()} scan={vi.fn()} toggle={vi.fn()} controlCalibrator={vi.fn()} startCalibration={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: '扫描' }))
    expect(setPanel).toHaveBeenCalledWith('scan')
    expect(screen.queryByText('LEFT HAND')).not.toBeInTheDocument()
  })
})
