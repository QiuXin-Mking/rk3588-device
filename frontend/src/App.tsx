import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppShell } from './app/AppShell'
import type { ScreenCommonProps } from './app/model'
import { pathForView, tabForView, viewForPath, type MainTab, type View } from './app/navigation'
import {
  loadSelectedProduct,
  saveSelectedProduct,
  type SelectableProduct,
} from './app/product'
import {
  CameraScreen,
  CaptureScreen,
  GripperScreen,
  RealtimeScreen,
  TaskClaimScreen,
} from './features/data/DataScreens'
import { HomeScreen, ProductKitScreen } from './features/home/HomeScreen'
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
import { useDeviceRuntime } from './features/device/hooks/useDeviceRuntime'
import {
  CloudSettingsScreen,
  DiagnosticsScreen,
  HelpFeedbackScreen,
  SuiteGuideScreen,
} from './features/requirements/RequirementScreens'
import { api } from './services/deviceApi'
import { useToast } from './shared/hooks/useToast'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [product, setProduct] = useState<SelectableProduct | null>(loadSelectedProduct)
  const view = viewForPath(location.pathname)
  const { toast, notify } = useToast()
  const {
    status,
    record,
    files,
    online,
    busy,
    toggleRecord: toggleRecordRequest,
    refreshStatus,
    refreshFiles,
  } = useDeviceRuntime()
  const calibrationReturnHandled = useRef(false)

  useEffect(() => {
    if (calibrationReturnHandled.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('calDone') !== '1') return
    calibrationReturnHandled.current = true
    const side = params.get('side') === 'left' ? 'left' : 'right'
    const transport = params.get('transport') === 'wired' ? 'wired' : 'spp'
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('calDone')
    cleanUrl.searchParams.delete('side')
    cleanUrl.searchParams.delete('transport')
    window.history.replaceState(null, '', cleanUrl)
    navigate(pathForView('bluetooth'), { replace: true })
    api.calibrateStop(side, transport)
      .then(async () => {
        notify('校准完成，手套采集服务正在恢复')
        await refreshStatus()
      })
      .catch((error) => notify(error instanceof Error ? error.message : '校准服务恢复失败'))
  }, [navigate, notify, refreshStatus])

  const go = (next: View) => {
    if (next !== view) navigate(pathForView(next), { state: { from: view } })
  }

  const back = () => {
    const from = (location.state as { from?: View } | null)?.from
    navigate(pathForView(from ?? tabForView(view)), { replace: true })
  }

  const selectTab = (tab: MainTab) => {
    navigate(pathForView(tab === 'home' && product ? 'product-kit' : tab))
  }

  const selectProduct = (next: SelectableProduct) => {
    setProduct(next)
    saveSelectedProduct(next)
    go('product-kit')
  }

  const toggleRecord = async () => {
    if (busy) return
    try {
      const result = await toggleRecordRequest()
      if (!result.ok) throw new Error(result.error || '设备未响应')
      notify(record.recording ? '录制已停止' : '录制已开始')
    } catch (error) {
      notify(error instanceof Error ? error.message : '录制操作失败')
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
        return <HomeScreen {...common} onSelectProduct={selectProduct} />
      case 'product-kit':
        return <ProductKitScreen product={product ?? 'Banana'} back={back} go={go} />
      case 'data':
        return <RealtimeScreen {...common} product={product ?? 'Banana'} />
      case 'records':
        return <RecordsScreen {...common} />
      case 'profile':
        return <ProfileScreen {...common} />
      case 'camera':
        return <CameraScreen record={record} product={product ?? 'Banana'} back={back} />
      case 'gripper':
        return <GripperScreen back={back} />
      case 'task-claim':
        return <TaskClaimScreen back={back} go={go} notify={notify} />
      case 'capture':
        return (
          <CaptureScreen
            product={product ?? 'Banana'}
            record={record}
            files={files}
            busy={busy}
            back={back}
            notify={notify}
            refreshStatus={refreshStatus}
            toggleRecord={toggleRecord}
            go={go}
          />
        )
      case 'device-list':
        return <DeviceListScreen status={status} record={record} back={back} go={go} refreshStatus={refreshStatus} />
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
        return <SettingsScreen status={status} back={back} go={go} notify={notify} />
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
      case 'cloud-settings':
        return <CloudSettingsScreen back={back} notify={notify} />
      case 'help-feedback':
        return <HelpFeedbackScreen back={back} notify={notify} />
      case 'suite-guide':
        return <SuiteGuideScreen back={back} notify={notify} />
      case 'diagnostics':
        return <DiagnosticsScreen back={back} record={record} />
    }
  })()

  return (
    <AppShell
      active={tabForView(view)}
      online={online}
      status={status}
      toast={toast}
      onSelect={selectTab}
      productName={product ?? '产品选择'}
    >
      {screen}
    </AppShell>
  )
}

export default App
