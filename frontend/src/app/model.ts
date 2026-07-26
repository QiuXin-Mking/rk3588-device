import type { DeviceStatus, FilesResponse, RecordStatus } from '../services/deviceApi'
import type { View } from './navigation'

export type Notify = (message: string) => void
export type Navigate = (view: View) => void

export type ScreenCommonProps = {
  status: DeviceStatus
  record: RecordStatus
  files: FilesResponse
  online: boolean
  go: Navigate
  notify: Notify
  refreshStatus: () => Promise<void>
  refreshFiles: () => Promise<void>
}

export const FALLBACK_STATUS: DeviceStatus = {
  battery: { pct: 0, status: 'Unknown', voltage: null },
  storage: { used: 0, total: 0, pct: 0 },
  wifi: { connected: false, ssid: '', signal: 0 },
  bluetooth: {
    connected: false,
    gloves: {
      left: { connected: false, device: '左手手套' },
      right: { connected: false, device: '右手手套' },
    },
  },
  wiredGloves: { left: false, right: false },
  calibrator: { active: false, state: 'unknown' },
  recordings: { count: 0, last: '', lastTime: null },
  ts: Date.now(),
}

export const FALLBACK_RECORD: RecordStatus = {
  cameraConnected: false,
  gloveConnected: false,
  gloveSides: { left: false, right: false },
  recording: false,
  previewing: false,
  guidaviewReady: false,
  cameras: {},
  imu: false,
  as5600: false,
  vive: false,
}
