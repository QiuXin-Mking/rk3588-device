import {
  Database,
  FolderOpen,
  HardDrive,
  PlayCircle,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useUiMode } from '../../app/uiModeContext'
import type { ScreenCommonProps } from '../../app/model'
import { api, type Recording } from '../../services/deviceApi'
import {
  EmptyState,
  PageHeader,
  RecordingRow,
} from '../../shared/ui/DevicePrimitives'
import { MobileRecordsView } from './mobile/MobileRecordsView'
import { formatRecordTotal, recordState, type RecordFilter } from './recordModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '../../shared/lib/cn'

export function RecordsScreen({ files, refreshFiles, notify }: ScreenCommonProps) {
  const mode = useUiMode()
  const [selected, setSelected] = useState<Recording | null>(null)
  const [deleting, setDeleting] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [checked, setChecked] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const visibleFiles = files.files
    .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
    .filter(item => filter === 'all' || recordState(files.files.indexOf(item)).key === filter)
    .slice(0, 100)
  const totalSize = formatRecordTotal(files.files.reduce((sum, file) => sum + file.size, 0))

  const batchUpload = () => {
    if (!checked.length) return notify('请先选择记录')
    setUploading(true)
    window.setTimeout(() => {
      setUploading(false)
      notify(`${checked.length} 条记录已进入上传队列，等待云服务接口`)
    }, 700)
  }

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

  const openRecord = (item: Recording) => {
    setPreviewFailed(false)
    setSelected(item)
  }

  const detailOverlay = selected && (
    <div className={cn('fixed inset-0 z-50 grid bg-black/60 backdrop-blur-sm', mode === 'device' ? 'place-items-center p-8' : 'place-items-end p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]')} role="dialog" aria-modal="true" aria-label="记录详情">
      <Card className={cn('relative grid w-full overflow-y-auto', mode === 'device' ? 'max-h-[920px] max-w-[1500px] grid-cols-[minmax(0,1.45fr)_minmax(420px,.75fr)] gap-[30px] p-[42px]' : 'max-h-[92dvh] max-w-lg grid-cols-1 gap-4 rounded-2xl p-4')}>
        <Button className={cn('absolute right-4 top-4', mode === 'device' && 'size-20')} size="icon-touch" variant="outline" onClick={() => setSelected(null)} aria-label="关闭详情"><X /></Button>
        <div className={cn('grid place-items-center overflow-hidden rounded-xl bg-black', mode === 'device' ? 'min-h-[520px]' : 'min-h-[260px]')}>
          {selected.hasColor && !previewFailed ? <video controls playsInline preload="metadata" src={api.recordingPreviewUrl(selected.name)} onError={() => setPreviewFailed(true)} /> : (
            <div className={cn('grid place-items-center gap-3 px-5 text-center text-muted-foreground', mode === 'device' ? '[&>svg]:size-[90px]' : '[&>svg]:size-14')}><PlayCircle /><strong className={mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-lg'}>{selected.hasColor ? '预览生成失败' : '该记录没有彩色视频'}</strong><span className={mode === 'device' ? 'text-[length:var(--device-text-sm)]' : 'text-sm'}>深度、手套和 IMU 数据仍可正常管理</span></div>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center overflow-hidden">
          <span className={cn('font-extrabold tracking-[.12em] text-violet-500', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-xs')}>RECORD DETAIL</span><h2 className={cn('mr-20 mt-3 line-clamp-2 break-all font-bold leading-tight', mode === 'device' ? 'text-[length:var(--device-text-xl)]' : 'text-xl')}>{selected.name}</h2><p className={cn('mt-2 text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-sm)]' : 'text-sm')}>{new Date(selected.mtime).toLocaleString('zh-CN')}</p>
          <dl className={cn('my-4 grid gap-2', mode === 'device' && 'text-[length:var(--device-text-xs)]')}>{[['创建', new Date(selected.mtime).toLocaleString('zh-CN')], ['上传', '等待上传'], ['审核', '尚未提交']].map(([term, value]) => <div className="flex justify-between gap-4" key={term}><dt className="text-muted-foreground">{term}</dt><dd>{value}</dd></div>)}</dl>
          <div className="my-4 flex flex-wrap gap-2">{selected.hasColor && <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">彩色</Badge>}{selected.hasDepth && <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">深度</Badge>}{selected.hasStereo && <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">双目</Badge>}{selected.hasGlove && <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">手套</Badge>}{selected.hasImu && <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">IMU</Badge>}{selected.hasAudio && <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">音频</Badge>}</div>
          <div className="grid grid-cols-3 gap-3">
            {selected.needsDecode && <Button size={mode === 'device' ? 'device' : 'touch'} variant="secondary" onClick={async () => { await api.decodeFile(selected.name); notify('解码已开始'); refreshFiles() }}><Wrench data-icon="inline-start" />解码</Button>}
            {files.externalDisk && <Button size={mode === 'device' ? 'device' : 'touch'} variant="secondary" onClick={async () => { await api.transferFile(selected.name); notify('传输已开始'); refreshFiles() }}><HardDrive data-icon="inline-start" />传输</Button>}
            <Button size={mode === 'device' ? 'device' : 'touch'} variant="destructive" disabled={deleting === selected.name} onClick={() => remove(selected)}><Trash2 data-icon="inline-start" />{deleting ? '删除中' : '删除'}</Button>
          </div>
        </div>
      </Card>
    </div>
  )

  if (mode === 'mobile') return <>
    <MobileRecordsView
      files={visibleFiles}
      totalSize={totalSize}
      query={query}
      checked={checked}
      uploading={uploading}
      selectedName={selected?.name}
      filter={filter}
      onQueryChange={setQuery}
      onFilterChange={setFilter}
      onToggle={(name, next) => setChecked(values => next ? [...values, name] : values.filter(value => value !== name))}
      onSelectAll={() => setChecked(values => values.length ? [] : visibleFiles.map(file => file.name))}
      onOpen={openRecord}
      onBatchUpload={batchUpload}
      onRetry={() => notify('失败记录已加入重试队列')}
    />
    {detailOverlay}
  </>

  return (
    <div className="page">
      <PageHeader
        title="采集记录"
        subtitle={`${files.files.length} 条本地记录`}
      />
      <div className="grid min-h-[126px] shrink-0 grid-cols-2 gap-4" role="region" aria-label="记录汇总">
        <SummaryTile tone="sky" icon={<FolderOpen />} label="记录数量" value={String(files.files.length)} />
        <SummaryTile
          tone="violet"
          icon={<Database />}
          label="数据总量"
          value={totalSize}
        />
      </div>
      <Card className="local-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 grid grid-cols-[1fr_220px_220px] gap-3 border-b border-border bg-card p-3">
          <label className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-secondary px-4 text-muted-foreground"><Search className="size-7" /><input className="min-w-0 flex-1 border-0 bg-transparent text-[length:var(--device-text-xs)] text-foreground outline-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索任务、序列号或文件名" /></label>
          <select className="rounded-xl border border-border bg-secondary px-4 text-[length:var(--device-text-xs)]" aria-label="套件分类"><option>全部套件</option><option>头部 Ego</option><option>腕部 Ego</option><option>手套</option></select>
          <select className="rounded-xl border border-border bg-secondary px-4 text-[length:var(--device-text-xs)]" aria-label="审核状态"><option>全部状态</option><option>待上传</option><option>审核中</option><option>已通过</option><option>已退回</option></select>
        </div>
        {checked.length > 0 && <div className="m-3 flex min-h-20 items-center gap-3 rounded-xl bg-blue-500/10 px-4 py-1 text-[length:var(--device-text-xs)] text-blue-500"><strong>已选择 {checked.length} 条</strong><Button size="device-compact" onClick={batchUpload}><UploadCloud data-icon="inline-start" />{uploading ? '加入队列中…' : '一键上传'}</Button><Button size="device-compact" variant="outline" onClick={() => notify('失败记录已加入重试队列')}><RotateCcw data-icon="inline-start" />重试</Button><Button size="device-compact" variant="ghost" onClick={() => setChecked([])}>取消选择</Button></div>}
        {visibleFiles.length ? (
          visibleFiles.map((item, index) => (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_360px] items-center gap-3 px-3" key={item.name}>
              <input className="size-5 accent-blue-600" type="checkbox" checked={checked.includes(item.name)} onChange={event => setChecked(values => event.target.checked ? [...values, item.name] : values.filter(name => name !== item.name))} aria-label={`选择 ${item.name}`} />
              <div className="min-w-0"><RecordingRow
                item={item}
                selected={selected?.name === item.name}
              onClick={() => openRecord(item)}
              /></div>
              <div className="grid grid-cols-[100px_1fr_80px] gap-2 text-[length:var(--device-text-xs)] text-muted-foreground"><span>REC-{String(index + 1).padStart(4, '0')}</span><span>家庭收纳 · 头部 Ego</span><strong className={index % 4 === 3 ? 'text-red-500' : index % 3 === 2 ? 'text-violet-500' : 'text-amber-500'}>{index % 4 === 3 ? '已退回' : index % 3 === 2 ? '审核中' : '待上传'}</strong></div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<FolderOpen />}
            title="暂无采集记录"
            description="完成一次录制后，记录会显示在这里。"
          />
        )}
        <div className="flex items-center justify-end gap-3 p-4 text-[length:var(--device-text-xs)] text-muted-foreground"><span>每页 100 条</span><Button size="device-compact" disabled variant="outline">上一页</Button><strong>1 / 1</strong><Button size="device-compact" disabled variant="outline">下一页</Button></div>
      </Card>

      {detailOverlay}
    </div>
  )
}

function SummaryTile({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode
  tone: 'sky' | 'violet'
  label: string
  value: string
}) {
  return (
    <Card className={cn('flex items-center gap-[22px] px-[26px] py-5', tone === 'sky' ? 'border-sky-500/25 bg-sky-500/5' : 'border-violet-500/25 bg-violet-500/5')}>
      <span className={cn('grid size-[76px] place-items-center rounded-xl [&>svg]:size-[38px]', tone === 'sky' ? 'bg-sky-500/10 text-sky-500' : 'bg-violet-500/10 text-violet-500')}>{icon}</span>
      <div><small className="block text-[length:var(--device-text-xs)] text-muted-foreground">{label}</small><strong className="mt-1.5 block text-[length:var(--device-text-lg)]">{value}</strong></div>
    </Card>
  )
}
