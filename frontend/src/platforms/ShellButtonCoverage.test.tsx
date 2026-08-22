import { fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FALLBACK_STATUS } from '../app/model'
import { I18nProvider } from '../shared/i18n/I18n'
import { DeviceShell } from './device/DeviceShell'
import { MobileShell } from './mobile/MobileShell'

const wrap = (ui: React.ReactNode) => render(<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}><I18nProvider>{ui}</I18nProvider></ThemeProvider>)

describe('shell button coverage', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
  })

  it('uses every device navigation and chrome button', () => {
    const onSelect = vi.fn()
    const onAdminSelect = vi.fn()
    wrap(<DeviceShell active="tasks" online status={FALLBACK_STATUS} toast="压力提示" userName="压力采集员" onSelect={onSelect} onAdminSelect={onAdminSelect}><h1>压力页面</h1></DeviceShell>)
    expect(screen.queryByText('Ego 采集终端')).not.toBeInTheDocument()
    for (const tab of ['任务', '采集', '数据', '我的']) {
      const button = screen.getByRole('button', { name: tab })
      expect(button.querySelector('svg')).toBeNull()
      fireEvent.click(button)
    }
    expect(onSelect.mock.calls.map(([tab]) => tab)).toEqual(['tasks', 'capture', 'records', 'profile'])
    const settings = screen.getByRole('button', { name: '设置' })
    const devices = screen.getByRole('button', { name: '设备' })
    expect(settings.querySelector('svg')).toBeNull()
    expect(devices.querySelector('svg')).toBeNull()
    fireEvent.click(settings)
    fireEvent.click(devices)
    expect(onAdminSelect.mock.calls.map(([view]) => view)).toEqual(['settings', 'device-list'])
    fireEvent.click(screen.getAllByRole('button', { name: '隐藏顶部和底部导航' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /恢复导航|Restore navigation/ })[0])
    expect(localStorage.getItem('sensorhub-immersive')).toBe('false')
  })

  it('keeps only the four primary tabs in the device bottom navigation', () => {
    wrap(<DeviceShell active="capture" online={false} status={FALLBACK_STATUS} toast="" userName="未登录" onSelect={vi.fn()} onAdminSelect={vi.fn()}><div>压力页面</div></DeviceShell>)
    const navigation = screen.getByRole('navigation', { name: '主导航' })
    expect(within(navigation).getAllByRole('button').map(button => button.textContent)).toEqual(['任务', '采集', '数据', '我的'])
    expect(screen.getAllByRole('button', { name: '隐藏顶部和底部导航' })).toHaveLength(1)
  })

  it('uses every mobile navigation and administrator button', () => {
    const onSelect = vi.fn()
    const onAdminSelect = vi.fn()
    wrap(<MobileShell active="records" online status={FALLBACK_STATUS} toast="压力提示" userName="压力采集员" onSelect={onSelect} onAdminSelect={onAdminSelect}><h1>移动压力页面</h1></MobileShell>)
    fireEvent.click(screen.getByRole('button', { name: '设置（需管理员密码）' }))
    fireEvent.click(screen.getByRole('button', { name: '设备（需管理员密码）' }))
    for (const tab of ['任务', '采集', '数据', '我的']) fireEvent.click(screen.getByRole('button', { name: tab }))
    expect(onSelect.mock.calls.map(([tab]) => tab)).toEqual(['tasks', 'capture', 'records', 'profile'])
    expect(onAdminSelect.mock.calls.map(([view]) => view)).toEqual(['settings', 'device-list'])
  })
})
