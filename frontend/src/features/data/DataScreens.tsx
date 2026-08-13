import {
  Activity,
  Camera,
  ChevronRight,
  CloudUpload,
  Database,
  FileClock,
  FolderOpen,
  Gauge,
  Info,
  Play,
  Square,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Navigate, Notify, ScreenCommonProps } from '../../app/model'
import type { SelectableProduct } from '../../app/product'
import { api, type FilesResponse, type RecordStatus } from '../../services/deviceApi'
import { formatTime } from '../../shared/format'
import {
  CameraFeed,
  EmptyState,
  PageHeader,
  RecordingRow,
} from '../../shared/ui/DevicePrimitives'
import { TouchChoice } from '../../shared/ui/TouchChoice'

export function RealtimeScreen({ status, record, go, product }: ScreenCommonProps & { product: SelectableProduct }) {
  const [selectedDevice, setSelectedDevice] = useState<ProductDeviceId | null>(null)
  const leftWireless = Boolean(record.gloveSides?.left)
  const rightWireless = Boolean(record.gloveSides?.right)
  const leftUsb = Boolean(status.wiredGloves?.left)
  const rightUsb = Boolean(status.wiredGloves?.right)
  const egoUsb = record.cameraConnected
  const egoStereo = record.cameraConnected || cameraIsOnline(record, ['stereo', 'ego_h_stereo', 'head_stereo'])
  const egoFour = cameraIsOnline(record, ['four', 'quad', 'ego_h_four', 'head_four'])
  const leftWristUsb = cameraIsOnline(record, ['ego_w_left', 'ego_w_l', 'wrist_left', 'jhh2_left'])
  const rightWristUsb = cameraIsOnline(record, ['ego_w_right', 'ego_w_r', 'wrist_right', 'jhh2_right'])
  const sideChannels = getSideCameraChannels(product, {
    leftHand: leftUsb || leftWireless,
    rightHand: rightUsb || rightWireless,
    leftWrist: leftWristUsb,
    rightWrist: rightWristUsb,
  })
  const productDevices: ProductDeviceStatus[] = product === 'Banana'
    ? [
        { id: 'UMI_Fingers_L', name: '左指尖夹爪', states: [['无线', leftWireless], ['USB', leftUsb]] },
        { id: 'UMI_Fingers_R', name: '右指尖夹爪', states: [['无线', rightWireless], ['USB', rightUsb]] },
        { id: 'UMI_Grippers_L', name: '左板机夹爪', states: [], unavailable: true },
        { id: 'UMI_Grippers_R', name: '右板机夹爪', states: [], unavailable: true },
        { id: 'Ego_H', name: '头部 Ego', states: [['USB', egoUsb], ['双目', egoStereo], ['四目', egoFour]] },
        { id: 'Suits', name: '手套', states: [], unavailable: true },
      ]
    : [
        { id: 'Ego_H', name: '头部 Ego', states: [['USB', egoUsb], ['双目', egoStereo], ['四目', egoFour]] },
        { id: 'Ego_W_L', name: '左腕部 Ego', states: [['USB', leftWristUsb]] },
        { id: 'Ego_W_R', name: '右腕部 Ego', states: [['USB', rightWristUsb]] },
      ]

  return (
    <div className="page realtime-screen">
      <PageHeader
        title="实时数据"
        subtitle="设备与传感器运行状态"
      />
      <div className="realtime-workspace">
        <section className="device-status-panel card">
          <div className="card-topline">
            <div>
              <span className="eyebrow">DEVICE STATUS</span>
              <h2>设备状态</h2>
            </div>
            <span className="muted">点击设备查看连接和数据详情</span>
          </div>
          <div className="device-status-list">
            {productDevices.map(device => (
              <DeviceStatusCard
                key={device.id}
                {...device}
                onClick={() => setSelectedDevice(device.id)}
              />
            ))}
          </div>
        </section>

        <aside className="realtime-control">
          <section className="camera-channel-panel card">
            <div className="card-topline">
              <div><span className="eyebrow">CAMERA</span><h2>相机通道</h2></div>
              <button className="section-link" onClick={() => go('camera')}>查看画面<ChevronRight /></button>
            </div>
            <div className="camera-channel-grid">
              <CameraChannel label="头部双目" online={egoStereo} />
              <CameraChannel label="头部四目" online={egoFour} />
              {sideChannels.map(channel => <CameraChannel key={channel.label} {...channel} />)}
            </div>
            <p className="pending-note">Y8 展示范围待产品确认</p>
          </section>
          <div className="primary-actions">
            <button onClick={() => go('task-claim')}>
              <FileClock />
              <span><strong>领取任务</strong><small>选择采集任务</small></span>
            </button>
            <button className="primary" onClick={() => go('capture')}>
              <Database />
              <span><strong>开始采集</strong><small>预览并录制</small></span>
            </button>
          </div>
        </aside>
      </div>
      {selectedDevice && (
        <DeviceDetailDialog
          id={selectedDevice}
          states={selectedDevice === 'Ego_H'
            ? [['USB 连接', egoUsb], ['双目状态', egoStereo], ['四目状态', egoFour]]
            : selectedDevice === 'UMI_Fingers_L'
              ? [['无线连接', leftWireless], ['USB 连接', leftUsb]]
              : selectedDevice === 'UMI_Fingers_R'
                ? [['无线连接', rightWireless], ['USB 连接', rightUsb]]
                : selectedDevice === 'Ego_W_L'
                  ? [['USB 连接', leftWristUsb]]
                  : [['USB 连接', rightWristUsb]]}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  )
}

type ProductDeviceId =
  | 'UMI_Fingers_L'
  | 'UMI_Fingers_R'
  | 'UMI_Grippers_L'
  | 'UMI_Grippers_R'
  | 'Ego_H'
  | 'Ego_W_L'
  | 'Ego_W_R'
  | 'Suits'

type ProductDeviceStatus = {
  id: ProductDeviceId
  name: string
  states: Array<[string, boolean]>
  unavailable?: boolean
}

function cameraIsOnline(record: RecordStatus, keys: string[]) {
  return keys.some((key) => Boolean(record.cameras?.[key]))
}

function getSideCameraChannels(
  product: SelectableProduct,
  states: { leftHand: boolean; rightHand: boolean; leftWrist: boolean; rightWrist: boolean },
) {
  return product === 'Mango'
    ? [
        { label: '左腕部单目', online: states.leftWrist },
        { label: '右腕部单目', online: states.rightWrist },
      ]
    : [
        { label: '左手双目', online: states.leftHand },
        { label: '右手双目', online: states.rightHand },
      ]
}

function DeviceStatusCard({
  id,
  name,
  states,
  unavailable = false,
  onClick,
}: ProductDeviceStatus & {
  onClick: () => void
}) {
  return (
    <button className={`device-status-card ${unavailable ? 'is-unavailable' : ''}`} disabled={unavailable} onClick={onClick}>
      <span className="device-status-icon"><Activity /></span>
      <span className="device-status-copy"><strong>{id}</strong><small>{name}</small></span>
      <span className="device-state-pills">
        {unavailable && <span>未开发</span>}
        {!unavailable && states.map(([label, online]) => (
          <span className={online ? 'online' : ''} key={label}>
            <span className="status-dot" />{label} · {online ? '在线' : '离线'}
          </span>
        ))}
      </span>
      {!unavailable && <ChevronRight />}
    </button>
  )
}

function CameraChannel({ label, online }: { label: string; online: boolean }) {
  return (
    <div className={`camera-channel ${online ? 'online' : ''}`}>
      <Camera />
      <span><strong>{label}</strong><small>{online ? '在线' : '离线'}</small></span>
      <span className="status-dot" />
    </div>
  )
}

function DeviceDetailDialog({
  id,
  states,
  onClose,
}: {
  id: ProductDeviceId
  states: Array<[string, boolean]>
  onClose: () => void
}) {
  const streams = id === 'Ego_H'
    ? [
        ['双目 MKV', '4000 × 1200'],
        ['双目 Y8', '4000 × 1200'],
        ['四目 Y8', '3104 × 480'],
      ]
    : id === 'Ego_W_L' || id === 'Ego_W_R'
      ? [['设备数据流', 'MKV · Y8 · IMU']]
      : [['双目 MKV', '3840 × 1200']]

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={`${id} 设备详情`}>
      <section className="device-detail card">
        <button className="icon-button close-detail" onClick={onClose} aria-label="关闭详情"><X /></button>
        <div className="device-detail-heading">
          <span className="eyebrow">DEVICE DETAIL</span>
          <h2>{id}</h2>
          <p>设备连接状态与数据规格</p>
        </div>
        <div className="device-detail-states">
          {states.map(([label, online]) => (
            <div key={label}><span>{label}</span><strong className={online ? 'online' : ''}>{online ? '在线' : '离线'}</strong></div>
          ))}
        </div>
        <div className="device-detail-streams">
          {streams.map(([name, resolution]) => (
            <div key={name}><Camera /><span><strong>{name}</strong><small>分辨率</small></span><b>{resolution}</b></div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function CameraScreen({ record, product, back }: { record: RecordStatus; product: SelectableProduct; back: () => void }) {
  const [stamp, setStamp] = useState(Date.now())
  const recordingRef = useRef(record.recording)
  recordingRef.current = record.recording
  const sideChannels = getSideCameraChannels(product, {
    leftHand: Boolean(record.gloveSides?.left),
    rightHand: Boolean(record.gloveSides?.right),
    leftWrist: cameraIsOnline(record, ['ego_w_left', 'ego_w_l', 'wrist_left', 'jhh2_left']),
    rightWrist: cameraIsOnline(record, ['ego_w_right', 'ego_w_r', 'wrist_right', 'jhh2_right']),
  })

  useEffect(() => {
    if (!record.cameraConnected) return
    const timer = window.setInterval(() => setStamp(Date.now()), 850)
    return () => window.clearInterval(timer)
  }, [record.cameraConnected])

  useEffect(() => {
    if (!record.cameraConnected || record.recording) return
    api.startLive().catch(() => undefined)
    return () => {
      if (!recordingRef.current) api.stopLive().catch(() => undefined)
    }
  }, [record.cameraConnected, record.recording])

  return (
    <div className="page detail-page camera-screen">
      <PageHeader
        title="相机"
        subtitle={record.cameraConnected ? '设备实时画面' : '等待相机接入'}
        back={back}
      />
      <div className="camera-grid product-camera-grid">
        <CameraFeed
          title="头部双目"
          connected={record.cameraConnected}
          src={`/api/camera/preview?t=${stamp}`}
        />
        <CameraFeed title="头部四目" connected={cameraIsOnline(record, ['four', 'quad', 'ego_h_four', 'head_four'])} note="四目视频通道待接入" />
        {sideChannels.map(channel => (
          <CameraFeed
            key={channel.label}
            title={channel.label}
            connected={channel.online}
            note={`${channel.label}视频通道待接入`}
          />
        ))}
      </div>
    </div>
  )
}

export function GripperScreen({ back }: { back: () => void }) {
  return (
    <div className="page detail-page gripper-screen">
      <PageHeader title="夹爪角度" subtitle="数据接口待接入" back={back} />
      <div className="chart-grid">
        {['左夹爪', '右夹爪'].map((name) => (
          <section className="chart-card card" key={name}>
            <div className="card-topline">
              <h2>{name}</h2>
              <span className="placeholder-chip">预留</span>
            </div>
            <div className="chart-placeholder">
              <div className="chart-y">180°<span>90°</span><span>0°</span></div>
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <path d="M0 140 C80 132, 120 90, 190 108 S330 60, 410 82 S520 40, 600 52" />
              </svg>
              <span>等待角度数据</span>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function TaskClaimScreen({
  back,
  go,
  notify,
}: {
  back: () => void
  go: Navigate
  notify: Notify
}) {
  const [device, setDevice] = useState('iSuit')
  const [scene, setScene] = useState('家庭收纳')
  const [recent, setRecent] = useState('最近任务')
  const [project, setProject] = useState('未选择')
  const [task, setTask] = useState('未选择')

  const claim = () => {
    if (project === '未选择' || task === '未选择') {
      notify('请选择项目和任务')
      return
    }
    notify('任务平台接口待接入，已保留当前选择')
    go('capture')
  }

  return (
    <div className="page detail-page task-screen">
      <PageHeader title="任务领取" subtitle="选择本次采集任务" back={back} />
      <div className="task-layout">
        <section className="task-form card">
          <TouchChoice label="设备类型" value={device} onChange={setDevice} options={['iSuit', 'HSuit']} />
          <TouchChoice label="场景类型" value={scene} onChange={setScene} options={['家庭收纳', '办公场景', '工业装配']} />
          <TouchChoice label="任务范围" value={recent} onChange={setRecent} options={['最近任务', '全部任务', '我的任务']} />
          <TouchChoice label="项目名称" value={project} onChange={setProject} options={['未选择', '收纳盒@紫竹家具馆5', '桌面整理采集']} />
          <TouchChoice label="子任务" value={task} onChange={setTask} options={['未选择', '把药盒、药瓶、空药瓶分类', '桌面物品归位']} />
        </section>
        <section className="task-preview card">
          <span className="eyebrow">TASK PREVIEW</span>
          <h2>{task === '未选择' ? '请选择子任务' : task}</h2>
          <p>任务详情和 SOP 将在任务平台 API 接入后显示。</p>
          <dl>
            <div><dt>设备</dt><dd>{device}</dd></div>
            <div><dt>场景</dt><dd>{scene}</dd></div>
            <div><dt>计划次数</dt><dd>30</dd></div>
          </dl>
          <div className="placeholder-panel"><Info /><span>任务领取接口待接入</span></div>
          <button className="primary-button task-confirm" onClick={claim}>确认领取</button>
        </section>
      </div>
    </div>
  )
}

export function CaptureScreen({
  product,
  record,
  files,
  busy,
  back,
  notify,
  refreshStatus,
  toggleRecord,
}: {
  product: SelectableProduct
  record: RecordStatus
  files: FilesResponse
  busy: boolean
  back: () => void
  notify: Notify
  refreshStatus: () => Promise<void>
  toggleRecord: () => Promise<void>
}) {
  const [elapsed, setElapsed] = useState(0)
  const [previewStamp, setPreviewStamp] = useState(Date.now())
  const startedAt = useRef<number | null>(null)
  const recordingRef = useRef(record.recording)
  const previewingRef = useRef(record.previewing)
  const [liveBusy, setLiveBusy] = useState(false)
  recordingRef.current = record.recording
  previewingRef.current = record.previewing

  useEffect(() => {
    if (!record.previewing && !record.recording) return
    const timer = window.setInterval(() => setPreviewStamp(Date.now()), 850)
    return () => window.clearInterval(timer)
  }, [record.previewing, record.recording])

  useEffect(() => () => {
    if (previewingRef.current && !recordingRef.current) api.stopLive().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!record.recording) {
      startedAt.current = null
      setElapsed(0)
      return
    }
    if (!startedAt.current) startedAt.current = Date.now()
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - (startedAt.current || Date.now())) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [record.recording])

  const togglePreview = async () => {
    if (liveBusy || record.recording) return
    setLiveBusy(true)
    try {
      const result = record.previewing ? await api.stopLive() : await api.startLive()
      if (!result.ok) throw new Error(result.error || '预览操作失败')
      notify(record.previewing ? '实时预览已停止' : '实时预览已启动')
      await refreshStatus()
    } catch (error) {
      notify(error instanceof Error ? error.message : '预览操作失败')
    } finally {
      setLiveBusy(false)
    }
  }

  const liveActive = record.previewing || record.recording
  const mangoPreviews = [
    { title: '头部双目', camera: 'jhh02', route: 'head-stereo' },
    { title: '头部四目', camera: 'jhh04', route: 'head-four' },
    { title: '左腕部单目', camera: 'wrist_left', route: 'wrist-left' },
    { title: '右腕部单目', camera: 'wrist_right', route: 'wrist-right' },
  ]

  return (
    <div className="page detail-page capture-screen">
      <PageHeader
        title="任务采集"
        subtitle={record.cameraConnected ? '设备就绪' : '相机未连接'}
        back={back}
      />
      <div className="capture-workspace">
        <section className="capture-video card">
          <div className={product === 'Mango' ? 'mango-preview-grid' : 'dual-preview'}>
            {product === 'Mango' ? mangoPreviews.map(({ title, camera, route }) => (
              <CameraFeed
                key={camera}
                title={title}
                connected={Boolean(record.cameras?.[camera])}
                src={liveActive ? `/api/camera/preview/${route}?t=${previewStamp}` : undefined}
                note={record.cameras?.[camera] ? '预览未启动' : '无信号'}
              />
            )) : (
              <>
                <CameraFeed
                  title="FPV_L"
                  connected={record.cameraConnected}
                  src={liveActive ? `/api/camera/preview?t=${previewStamp}` : undefined}
                  note={record.cameraConnected ? '预览未启动' : '无信号'}
                />
                <CameraFeed title="FPV_R" connected={false} note="独立右路待接入" />
              </>
            )}
          </div>
          <div className={`record-timer ${record.recording ? 'active' : ''}`}>
            <span className="record-dot" />
            <span>录制时间</span>
            <strong>{formatTime(elapsed)}</strong>
          </div>
        </section>
        <aside className="capture-side">
          <section className="capture-info card">
            <span className="eyebrow">CURRENT TASK</span>
            <h2>把药盒、药瓶、空药瓶分类</h2>
            <div className="capture-meta">
              <div><span>项目</span><strong>收纳盒@紫竹家具馆5</strong></div>
              <div><span>已采集</span><strong>{files.files.length} / 30</strong></div>
              <div><span>状态</span><strong>{record.recording ? '录制中' : record.previewing ? '预览中' : '待开始'}</strong></div>
            </div>
          </section>
          <section className="capture-records card">
            <div className="card-topline"><h2>最近记录</h2><span>{files.files.length} 条</span></div>
            <div className="local-scroll">
              {files.files.length ? (
                files.files.slice(0, 3).map((item) => <RecordingRow key={item.name} item={item} compact />)
              ) : (
                <EmptyState icon={<FolderOpen />} title="暂无本地记录" />
              )}
            </div>
          </section>
        </aside>
      </div>
      <div className="capture-actions">
        <button
          className="secondary-button preview-button"
          disabled={!record.cameraConnected || record.recording || liveBusy}
          onClick={togglePreview}
        >
          <Camera />
          {liveBusy ? '设备处理中…' : record.previewing ? '停止预览' : '实时预览'}
        </button>
        <button
          className={`primary-button record-button ${record.recording ? 'stop' : ''}`}
          disabled={busy || !record.cameraConnected}
          onClick={toggleRecord}
        >
          {record.recording ? <Square /> : <Play />}
          {busy ? '设备处理中…' : record.recording ? '停止录制' : '开始录制'}
        </button>
        <button className="upload-button" onClick={() => notify('云端上报接口待接入')}>
          <CloudUpload />
          <span>信息上报</span>
        </button>
      </div>
    </div>
  )
}
