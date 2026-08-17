import { CheckSquare2, ChevronRight, Database, FolderOpen, RotateCcw, Search, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import type { Recording } from '../../../services/deviceApi'
import { formatBytes } from '../../../shared/format'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '../../../shared/lib/cn'
import { recordState, type RecordFilter } from '../recordModel'

const PAGE_SIZE = 20

export function MobileRecordsView({
  files,
  totalSize,
  query,
  checked,
  uploading,
  selectedName,
  filter,
  onQueryChange,
  onFilterChange,
  onToggle,
  onSelectAll,
  onOpen,
  onBatchUpload,
  onRetry,
}: {
  files: Recording[]
  totalSize: string
  query: string
  checked: string[]
  uploading: boolean
  selectedName?: string
  filter: RecordFilter
  onQueryChange: (value: string) => void
  onFilterChange: (value: RecordFilter) => void
  onToggle: (name: string, checked: boolean) => void
  onSelectAll: () => void
  onOpen: (item: Recording) => void
  onBatchUpload: () => void
  onRetry: () => void
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleFiles = files.slice(0, visibleCount)

  return (
    <div className="page flex min-h-full flex-col gap-3.5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-[minmax(17.5rem,.34fr)_minmax(0,1fr)] md:content-start">
      <PageHeader title="采集记录" subtitle="本地数据与云端流转" />
      <section className="grid grid-cols-2 gap-2.5">
        <Summary tone="sky" icon={<FolderOpen />} label="记录总数" value={String(files.length)} />
        <Summary tone="violet" icon={<Database />} label="数据容量" value={totalSize} />
      </section>

      <section className="grid gap-2.5">
        <label className="flex min-h-12 items-center gap-2 rounded-lg border border-border bg-card px-3.5 focus-within:border-primary/60"><Search className="size-5 text-muted-foreground" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" value={query} onChange={event => { setVisibleCount(PAGE_SIZE); onQueryChange(event.target.value) }} placeholder="搜索记录" /></label>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" aria-label="记录状态筛选">{([
          ['all', '全部'],
          ['pending', '待上传'],
          ['reviewing', '审核中'],
          ['returned', '已退回'],
        ] as const).map(([value, label]) => <button key={value} className={cn('min-h-11 shrink-0 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-muted-foreground', filter === value && 'border-blue-600 bg-blue-600 text-white shadow-sm')} aria-pressed={filter === value} onClick={() => { setVisibleCount(PAGE_SIZE); onFilterChange(value) }}>{label}</button>)}</div>
      </section>

      <div className="flex items-center justify-between md:col-span-2"><strong className="text-lg">最近记录</strong><button className="inline-flex min-h-11 items-center gap-1 border-0 bg-transparent px-2 text-sm font-semibold text-primary" onClick={onSelectAll}><CheckSquare2 className="size-4" />{checked.length ? `已选 ${checked.length}` : '批量选择'}</button></div>
      <section className="grid gap-2.5 md:col-span-2 md:grid-cols-2 xl:grid-cols-3">
        {files.length ? visibleFiles.map((item, index) => {
          const state = recordState(index)
          const streams = [item.hasColor && '彩色', item.hasDepth && '深度', item.hasGlove && '手套', item.hasImu && 'IMU'].filter(Boolean)
          const tone = state.className === 'returned' ? 'destructive' : state.className === 'reviewing' ? 'default' : 'outline'
          return <article className={cn('grid grid-cols-[1.25rem_1fr] items-center gap-1 rounded-[1.1rem] border border-border bg-card p-2.5', selectedName === item.name && 'border-primary')} key={item.name}>
            <input className="size-[17px] accent-primary" type="checkbox" checked={checked.includes(item.name)} onChange={event => onToggle(item.name, event.target.checked)} aria-label={`选择 ${item.name}`} />
            <button className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-0 bg-transparent text-left text-foreground" onClick={() => onOpen(item)}>
              <span className={cn('grid size-10 place-items-center rounded-xl', state.className === 'returned' ? 'bg-red-500/10 text-red-500' : state.className === 'reviewing' ? 'bg-violet-500/10 text-violet-500' : 'bg-amber-500/10 text-amber-500')}><Database className="size-5" /></span>
              <span className="grid min-w-0 gap-0.5"><strong className="truncate text-sm">{item.name.replace('recording_', '')}</strong><small className="truncate text-[11px] text-muted-foreground">{new Date(item.mtime).toLocaleString('zh-CN')} · {formatBytes(item.size)}</small><em className="truncate text-[11px] not-italic text-muted-foreground">{streams.join(' · ') || '原始数据'}</em></span>
              <Badge className={cn(state.className === 'returned' ? 'border-red-500/30 bg-red-500/10 text-red-500' : state.className === 'reviewing' ? 'border-violet-500/30 bg-violet-500/10 text-violet-500' : 'border-amber-500/30 bg-amber-500/10 text-amber-500')} variant={tone}>{state.label}</Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </article>
        }) : <EmptyState icon={<FolderOpen />} title="暂无采集记录" description="完成采集后，记录会显示在这里。" />}
        {visibleCount < files.length && <Button className="md:col-span-2 xl:col-span-3" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>加载更多（剩余 {files.length - visibleCount} 条）</Button>}
      </section>

      {checked.length > 0 && <Card className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-30 grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[1.1rem] bg-card/95 p-2.5 backdrop-blur-xl"><span className="text-sm">已选择 <strong>{checked.length}</strong> 条</span><Button size="touch" onClick={onRetry}><RotateCcw className="size-4" />重试</Button><Button variant="default" size="touch" onClick={onBatchUpload}><UploadCloud className="size-4" />{uploading ? '处理中…' : '上传'}</Button></Card>}
    </div>
  )
}

function Summary({ icon, tone, label, value }: { icon: React.ReactNode; tone: 'sky' | 'violet'; label: string; value: string }) {
  return <Card className={cn('flex min-w-0 items-center gap-2.5 rounded-[1.1rem] p-4 shadow-none', tone === 'sky' ? 'border-sky-500/25 bg-sky-500/5' : 'border-violet-500/25 bg-violet-500/5')}><span className={cn('[&>svg]:size-6', tone === 'sky' ? 'text-sky-500' : 'text-violet-500')}>{icon}</span><span className="grid min-w-0 gap-0.5 text-xs text-muted-foreground">{label}<strong className="truncate text-lg text-foreground">{value}</strong></span></Card>
}
