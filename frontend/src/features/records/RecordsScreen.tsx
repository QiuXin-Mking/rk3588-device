import {
  Database,
  FolderOpen,
  HardDrive,
  PlayCircle,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ScreenCommonProps } from '../../app/model'
import { api, type Recording } from '../../services/deviceApi'
import {
  EmptyState,
  PageHeader,
  RecordingRow,
} from '../../shared/ui/DevicePrimitives'

export function RecordsScreen({ files, refreshFiles, notify }: ScreenCommonProps) {
  const [selected, setSelected] = useState<Recording | null>(null)
  const [deleting, setDeleting] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)

  const remove = async (item: Recording) => {
    if (!window.confirm(`确定删除 ${item.name}？此操作不可恢复。`)) return
    setDeleting(item.name)
    try {
      const result = await api.deleteFile(item.name)
      if (!result.ok) throw new Error('删除失败')
      notify('记录已删除')
      setSelected(null)
      await refreshFiles()
    } catch (error) {
      notify(error instanceof Error ? error.message : '删除失败')
    } finally {
      setDeleting('')
    }
  }

  return (
    <div className="page records-screen">
      <PageHeader
        title="采集记录"
        subtitle={`${files.files.length} 条本地记录`}
      />
      <div className="records-summary" role="region" aria-label="记录汇总">
        <SummaryTile icon={<FolderOpen />} label="记录数量" value={String(files.files.length)} />
        <SummaryTile
          icon={<Database />}
          label="数据总量"
          value={formatRecordTotal(files.files.reduce((sum, file) => sum + file.size, 0))}
        />
      </div>
      <section className="records-card card local-scroll">
        {files.files.length ? (
          files.files.map((item) => (
            <RecordingRow
              key={item.name}
              item={item}
              selected={selected?.name === item.name}
              onClick={() => {
                setPreviewFailed(false)
                setSelected(item)
              }}
            />
          ))
        ) : (
          <EmptyState
            icon={<FolderOpen />}
            title="暂无采集记录"
            description="完成一次录制后，记录会显示在这里。"
          />
        )}
      </section>

      {selected && (
        <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="记录详情">
          <section className="record-detail preview-detail card">
            <button className="icon-button close-detail" onClick={() => setSelected(null)} aria-label="关闭详情">
              <X />
            </button>
            <div className="record-preview">
              {selected.hasColor && !previewFailed ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={api.recordingPreviewUrl(selected.name)}
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <div className="preview-unavailable">
                  <PlayCircle />
                  <strong>{selected.hasColor ? '预览生成失败' : '该记录没有彩色视频'}</strong>
                  <span>深度、手套和 IMU 数据仍可正常管理</span>
                </div>
              )}
            </div>
            <div className="record-meta">
              <span className="eyebrow">RECORD DETAIL</span>
              <h2>{selected.name}</h2>
              <p>{new Date(selected.mtime).toLocaleString('zh-CN')}</p>
              <div className="stream-tags">
                {selected.hasColor && <span>彩色</span>}
                {selected.hasDepth && <span>深度</span>}
                {selected.hasStereo && <span>双目</span>}
                {selected.hasGlove && <span>手套</span>}
                {selected.hasImu && <span>IMU</span>}
                {selected.hasAudio && <span>音频</span>}
              </div>
              <div className="detail-actions">
                {selected.needsDecode && (
                  <button
                    onClick={async () => {
                      await api.decodeFile(selected.name)
                      notify('解码已开始')
                      refreshFiles()
                    }}
                  >
                    <Wrench />解码
                  </button>
                )}
                {files.externalDisk && (
                  <button
                    onClick={async () => {
                      await api.transferFile(selected.name)
                      notify('传输已开始')
                      refreshFiles()
                    }}
                  >
                    <HardDrive />传输
                  </button>
                )}
                <button
                  className="danger"
                  disabled={deleting === selected.name}
                  onClick={() => remove(selected)}
                >
                  <Trash2 />{deleting ? '删除中' : '删除'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export function formatRecordTotal(bytes: number) {
  const units = [
    { label: 'TB', size: 1024 ** 4 },
    { label: 'GB', size: 1024 ** 3 },
    { label: 'MB', size: 1024 ** 2 },
  ]
  const unit = units.find(item => bytes >= item.size) ?? units[2]
  const value = bytes / unit.size
  const digits = Number.isInteger(value) ? 0 : 1
  return `${value.toFixed(digits)} ${unit.label}`
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="summary-tile card">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  )
}
