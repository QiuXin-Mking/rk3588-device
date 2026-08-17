import type { ReactNode } from 'react'
import { useUiMode } from './uiModeContext'
import { DeviceShell } from '../platforms/device/DeviceShell'
import { MobileShell } from '../platforms/mobile/MobileShell'
import type { DeviceStatus } from '../services/deviceApi'
import type { MainTab } from './navigation'

export type AppShellProps = {
  active: MainTab
  online: boolean
  status: DeviceStatus
  toast: string
  children: ReactNode
  onSelect: (tab: MainTab) => void
  productName: string
}

export function AppShell(props: AppShellProps) {
  return useUiMode() === 'device'
    ? <DeviceShell {...props} />
    : <MobileShell {...props} />
}
