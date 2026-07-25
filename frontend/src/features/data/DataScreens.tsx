import {
  Activity,
  BatteryCharging,
  Camera,
  ChevronRight,
  CloudUpload,
  Database,
  FileClock,
  FolderOpen,
  Gauge,
  HardDrive,
  Info,
  Mic,
  Play,
  Radio,
  Square,
  Wrench,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Navigate, Notify, ScreenCommonProps } from '../../app/model'
import { api, type DeviceStatus, type FilesResponse, type RecordStatus } from '../../services/deviceApi'
import { formatTime } from '../../shared/format'
import {
  CameraFeed,
  EmptyState,
  HandSkeleton,
  PageHeader,
  RecordingRow,
  SensorBadge,
} from '../../shared/ui/DevicePrimitives'
import { TouchChoice } from '../../shared/ui/TouchChoice'

export function RealtimeScreen({ status, record, go }: ScreenCommonProps) {
  const left = Boolean(record.gloveSides?.left || status.wiredGloves?.left)
  const right = Boolean(record.gloveSides?.right || status.wiredGloves?.right)

  return (
    <div className="page realtime-screen">
      <PageHeader
        title="实时数据"
        subtitle="设备与传感器运行状态"
      />
      <div className="realtime-workspace">
        <section className="hand-stage card">
          <div className="card-topline">
            <div>
              <span className="eyebrow">HAND TRACKING</span>
              <h2>手部追踪</h2>
            </div>
            <span className="muted">
              {left && right ? '双手已连接' : left || right ? '单手已连接' : '等待手套'}
            </span>
          </div>
          <HandPair left={left} right={right} />
          <div className="hand-status-row">
            <SensorBadge label="左手" ok={left} />
            <SensorBadge label="右手" ok={right} />
          </div>
          <TopicStrip status={status} record={record} />
        </section>

        <aside className="realtime-control">
          <SystemSummary status={status} record={record} />
          <div className="sensor-actions">
            <button className="menu-card" onClick={() => go('camera')}>
              <span className="menu-icon blue"><Camera /></span>
              <span>
                <strong>相机</strong>
                <small>{record.cameraConnected ? '相机已连接' : '未检测到相机'}</small>
              </span>
              <ChevronRight />
            </button>
            <button className="menu-card" onClick={() => go('gripper')}>
              <span className="menu-icon violet"><Gauge /></span>
              <span><strong>夹爪角度</strong><small>接口待接入</small></span>
              <ChevronRight />
            </button>
          </div>
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
    </div>
  )
}

function HandPair({ left, right }: { left: boolean; right: boolean }) {
  return (
    <div className="hand-pair" aria-label="左右手状态">
      <HandSkeleton flipped active={left} />
      <div className="hand-center"><Activity /><span>LIVE</span></div>
      <HandSkeleton active={right} />
    </div>
  )
}

function SystemSummary({ status, record }: { status: DeviceStatus; record: RecordStatus }) {
  return (
    <div className="system-summary card">
      <div><BatteryCharging /><span>电量</span><strong>{status.battery.pct}%</strong></div>
      <div><HardDrive /><span>存储</span><strong>{status.storage.pct}%</strong></div>
      <div><Mic /><span>麦克风</span><strong>{record.micConnected ? '在线' : '离线'}</strong></div>
    </div>
  )
}

function TopicStrip({ status, record }: { status: DeviceStatus; record: RecordStatus }) {
  const onlineCount = [
    record.cameraConnected,
    record.gloveSides?.left,
    record.gloveSides?.right,
    status.storage.total > 0,
  ].filter(Boolean).length

  return (
    <div className="topic-strip">
      <Radio />
      <span>数据通道</span>
      <strong>{onlineCount} / 4 在线</strong>
      <small>相机 · 左手 · 右手 · 存储</small>
    </div>
  )
}

export function CameraScreen({ record, back }: { record: RecordStatus; back: () => void }) {
  const [stamp, setStamp] = useState(Date.now())
  const recordingRef = useRef(record.recording)
  recordingRef.current = record.recording

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
      <div className="camera-grid">
        <CameraFeed
          title="FPV"
          connected={record.cameraConnected}
          src={`/api/camera/preview?t=${stamp}`}
          large
        />
        <CameraFeed title="左手" connected={false} note="独立视频通道待接入" />
        <CameraFeed title="右手" connected={false} note="独立视频通道待接入" />
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
  record,
  files,
  busy,
  back,
  notify,
  refreshStatus,
  toggleRecord,
}: {
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

  return (
    <div className="page detail-page capture-screen">
      <PageHeader
        title="任务采集"
        subtitle={record.cameraConnected ? '设备就绪' : '相机未连接'}
        back={back}
      />
      <div className="capture-workspace">
        <section className="capture-video card">
          <div className="dual-preview">
            <CameraFeed
              title="FPV_L"
              connected={record.cameraConnected && liveActive}
              src={liveActive ? `/api/camera/preview?t=${previewStamp}` : undefined}
              note={record.cameraConnected ? '预览未启动' : '无信号'}
            />
            <CameraFeed title="FPV_R" connected={false} note="独立右路待接入" />
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
