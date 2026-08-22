export type SideState = {
  connected?: boolean
  device?: string
  address?: string
  via?: string | null
}

export type DeviceStatus = {
  battery: { pct: number; status: string; voltage: string | null }
  storage: { used: number; total: number; pct: number; mount?: string }
  wifi: { connected: boolean; ssid: string; signal: number; security?: string }
  bluetooth: {
    connected: boolean
    device?: string
    address?: string
    via?: string | null
    gloves?: { left?: SideState; right?: SideState }
  }
  wiredGloves?: { left?: boolean; right?: boolean }
  calibrator: { active: boolean; state: string }
  recordings: { count: number; last: string; lastTime: number | null }
  captureStatus?: { ready: boolean; recording: boolean; cameras: Record<string, boolean>; imu: boolean; as5600: boolean; vive: boolean }
  ts: number
}

export type RecordStatus = {
  cameraConnected: boolean
  cameraType?: 'stereo' | 'depth' | null
  gloveConnected: boolean
  gloveSides?: { left?: boolean; right?: boolean }
  micConnected?: boolean
  micName?: string
  recording: boolean
  previewing: boolean
  guidaviewReady: boolean
  currentDir?: string
  stereo?: boolean
  // unified_capture extensions
  cameras?: Record<string, boolean>
  imu?: boolean
  as5600?: boolean
  vive?: boolean
}

export type Recording = {
  name: string
  size: number
  mtime: number
  hasColor: boolean
  hasDepth: boolean
  hasGlove: boolean
  hasImu: boolean
  hasStereo: boolean
  hasAudio: boolean
  decoded: boolean
  decoding: boolean
  needsDecode: boolean
  transferring: boolean
  transferred: boolean
  transferPct: number
  remoteOnly?: boolean
}

export type FilesResponse = {
  files: Recording[]
  root: string
  externalDisk: null | {
    present: boolean
    mount: string
    dev: string
    free: number
    total: number
  }
}

export type WifiNetwork = {
  ssid: string
  signal: number
  security: string
  active: boolean
}

export type BluetoothDevice = {
  name: string
  address: string
  connected: boolean
  paired: boolean
}

export class DeviceApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message)
    this.name = 'DeviceApiError'
  }
}

const REQUEST_TIMEOUT_MS = 12_000

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new DeviceApiError('设备响应超时', 0, path)
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }

  const text = await response.text()
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new DeviceApiError(text || `请求失败 (${response.status})`, response.status, path)
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : `请求失败 (${response.status})`
    throw new DeviceApiError(message, response.status, path)
  }
  return data as T
}

export const api = {
  status: () => request<DeviceStatus>('GET', '/api/status'),
  recordStatus: () => request<RecordStatus>('GET', '/api/record/status'),
  toggleRecord: () =>
    request<{ ok: boolean; recording?: boolean; error?: string }>('POST', '/api/record/toggle'),
  startLive: () => request<{ ok: boolean; error?: string }>('POST', '/api/camera/live/start'),
  stopLive: () => request<{ ok: boolean; error?: string }>('POST', '/api/camera/live/stop'),
  files: () => request<FilesResponse>('GET', '/api/files'),
  deleteFile: (name: string) =>
    request<{ ok: boolean }>('DELETE', `/api/files/${encodeURIComponent(name)}`, { confirmation: name }),
  decodeFile: (name: string) =>
    request<{ ok: boolean; error?: string }>(
      'POST',
      `/api/recordings/${encodeURIComponent(name)}/decode`,
    ),
  transferFile: (name: string) =>
    request<{ ok: boolean; error?: string }>(
      'POST',
      `/api/recordings/${encodeURIComponent(name)}/transfer`,
    ),
  wifiScan: () => request<{ networks: WifiNetwork[] }>('GET', '/api/wifi/scan'),
  wifiConnect: (ssid: string, password: string) =>
    request<{ ok: boolean; error?: string }>('POST', '/api/wifi/connect', { ssid, password }),
  wifiDisconnect: () => request<{ ok: boolean }>('POST', '/api/wifi/disconnect'),
  bluetoothConnect: (address: string) =>
    request<{ ok: boolean; output?: string }>('POST', '/api/bt/connect', { address }),
  bluetoothDisconnect: () => request<{ ok: boolean }>('POST', '/api/bt/disconnect'),
  bluetoothScan: () =>
    request<{ devices: BluetoothDevice[] }>('GET', '/api/bt/scan'),
  calibrator: (action: 'start' | 'stop' | 'restart') =>
    request<{ ok: boolean; active: boolean }>('POST', '/api/calibrator', { action }),
  calibrateStart: (side: 'left' | 'right', transport: 'spp' | 'wired') =>
    request<{ ok: boolean; error?: string; side?: string; path?: string | null }>(
      'POST',
      '/api/calibrate/start',
      { side, transport },
    ),
  calibrateStop: (side: 'left' | 'right', transport: 'spp' | 'wired') =>
    request<{ ok: boolean }>('POST', '/api/calibrate/stop', { side, transport }),
  recordingPreviewUrl: (name: string) =>
    `/api/recordings/${encodeURIComponent(name)}/preview`,
  settings: () => request<{ postCaptureEnabled: boolean }>('GET', '/api/settings'),
  saveSettings: (postCaptureEnabled: boolean) =>
    request<{ postCaptureEnabled: boolean }>('POST', '/api/settings', { postCaptureEnabled }),
}
