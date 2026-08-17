export type RecordFilter = 'all' | 'pending' | 'reviewing' | 'returned'

export function recordState(index: number) {
  if (index % 4 === 3) return { key: 'returned' as const, label: '已退回', className: 'returned' }
  if (index % 3 === 2) return { key: 'reviewing' as const, label: '审核中', className: 'reviewing' }
  return { key: 'pending' as const, label: '待上传', className: 'pending' }
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
