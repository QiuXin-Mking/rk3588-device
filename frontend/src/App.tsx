import { useCallback, useEffect, useRef, useState } from 'react'
import { DeviceShell } from './app/DeviceShell'
import {
  FALLBACK_RECORD,
  FALLBACK_STATUS,
  type ScreenCommonProps,
} from './app/model'
import { tabForView, type MainTab, type View } from './app/navigation'
import {
  CameraScreen,
  CaptureScreen,
  GripperScreen,
  RealtimeScreen,
  TaskClaimScreen,
} from './features/data/DataScreens'
import { HomeScreen } from './features/home/HomeScreen'
import {
  AccountScreen,
  FeaturedScreen,
  MarketplaceScreen,
  PackageDownloadScreen,
} from './features/expansion/ExpansionScreens'
import {
  AboutScreen,
  AddDeviceScreen,
  BluetoothScreen,
  DeviceInfoScreen,
  DeviceListScreen,
  DeviceTypeScreen,
  ProfileScreen,
  QrScanScreen,
  SettingsScreen,
  WifiScreen,
} from './features/profile/ProfileScreens'
import { RecordsScreen } from './features/records/RecordsScreen'
import {
  api,
  type DeviceStatus,
  type FilesResponse,
  type RecordStatus,
} from './services/deviceApi'

function App() {
  const [view, setView] = useState<View>('data')
  const [history, setHistory] = useState<View[]>([])
  const [status, setStatus] = useState<DeviceStatus>(FALLBACK_STATUS)
  const [record, setRecord] = useState<RecordStatus>(FALLBACK_RECORD)
  const [files, setFiles] = useState<FilesResponse>({ files: [], root: '', externalDisk: null })
  const [online, setOnline] = useState(false)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const calibrationReturnHandled = useRef(false)

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      const [nextStatus, nextRecord] = await Promise.all([api.status(), api.recordStatus()])
      setStatus(nextStatus)
      setRecord(nextRecord)
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [])

  const refreshFiles = useCallback(async () => {
    try {
      setFiles(await api.files())
    } catch {
      // The local shell remains usable while the device service is offline.
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    refreshFiles()
    const statusTimer = window.setInterval(refreshStatus, 3000)
    const fileTimer = window.setInterval(refreshFiles, 5000)
    return () => {
      window.clearInterval(statusTimer)
      window.clearInterval(fileTimer)
    }
  }, [refreshFiles, refreshStatus])

  useEffect(() => {
    if (calibrationReturnHandled.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('calDone') !== '1') return
    calibrationReturnHandled.current = true
    const side = params.get('side') === 'left' ? 'left' : 'right'
    const transport = params.get('transport') === 'wired' ? 'wired' : 'spp'
    window.history.replaceState(null, '', window.location.pathname)
    setView('bluetooth')
    setHistory([])
    api.calibrateStop(side, transport)
      .then(async () => {
        notify('校准完成，手套采集服务正在恢复')
        await refreshStatus()
      })
      .catch((error) => notify(error instanceof Error ? error.message : '校准服务恢复失败'))
  }, [notify, refreshStatus])

  const go = useCallback(
    (next: View) => {
      if (next === view) return
      setHistory((items) => [...items.slice(-8), view])
      setView(next)
    },
    [view],
  )

  const back = useCallback(() => {
    setHistory((items) => {
      const next = [...items]
      setView(next.pop() ?? tabForView(view))
      return next
    })
  }, [view])

  const selectTab = (tab: MainTab) => {
    setHistory([])
    setView(tab)
  }

  const toggleRecord = async () => {
    if (busy) return
    setBusy(true)
    try {
      const result = await api.toggleRecord()
      if (!result.ok) throw new Error(result.error || '设备未响应')
      await refreshStatus()
      notify(record.recording ? '录制已停止' : '录制已开始')
    } catch (error) {
      notify(error instanceof Error ? error.message : '录制操作失败')
    } finally {
      setBusy(false)
    }
  }

  const common: ScreenCommonProps = {
    status,
    record,
    files,
    online,
    go,
    notify,
    refreshStatus,
    refreshFiles,
  }

  const screen = (() => {
    switch (view) {
      case 'home':
        return <HomeScreen {...common} />
      case 'data':
        return <RealtimeScreen {...common} />
      case 'records':
        return <RecordsScreen {...common} />
      case 'profile':
        return <ProfileScreen {...common} />
      case 'camera':
        return <CameraScreen record={record} back={back} />
      case 'gripper':
        return <GripperScreen back={back} />
      case 'task-claim':
        return <TaskClaimScreen back={back} go={go} notify={notify} />
      case 'capture':
        return (
          <CaptureScreen
            record={record}
            files={files}
            busy={busy}
            back={back}
            notify={notify}
            refreshStatus={refreshStatus}
            toggleRecord={toggleRecord}
          />
        )
      case 'device-list':
        return <DeviceListScreen status={status} back={back} go={go} />
      case 'device-type':
        return <DeviceTypeScreen back={back} go={go} />
      case 'qr-scan':
        return <QrScanScreen back={back} go={go} />
      case 'add-device':
        return <AddDeviceScreen back={back} go={go} />
      case 'device-info':
        return <DeviceInfoScreen status={status} record={record} back={back} />
      case 'wifi':
        return (
          <WifiScreen
            status={status}
            back={back}
            notify={notify}
            refreshStatus={refreshStatus}
          />
        )
      case 'bluetooth':
        return (
          <BluetoothScreen
            status={status}
            back={back}
            notify={notify}
            refreshStatus={refreshStatus}
          />
        )
      case 'settings':
        return <SettingsScreen status={status} back={back} notify={notify} />
      case 'about':
        return <AboutScreen back={back} />
      case 'marketplace':
        return <MarketplaceScreen back={back} />
      case 'featured':
        return <FeaturedScreen back={back} notify={notify} />
      case 'package-download':
        return <PackageDownloadScreen back={back} notify={notify} />
      case 'account':
        return <AccountScreen back={back} notify={notify} />
    }
  })()

  return (
    <DeviceShell
      active={tabForView(view)}
      online={online}
      status={status}
      toast={toast}
      onSelect={selectTab}
    >
      {screen}
    </DeviceShell>
  )
}

export default App
