import type { ManagementRecord } from '../../services/managementApi'
import type { Recording } from '../../services/deviceApi'

export type RecordFilter = 'all' | 'pending' | 'reviewing' | 'approved' | 'returned'

export function recordState(record?: ManagementRecord) {
  if (record?.qa_status === 'REJECTED') return { key: 'returned' as const, label: '已退回', className: 'returned' }
  if (record?.qa_status === 'PASS') return { key: 'approved' as const, label: '已通过', className: 'approved' }
  if (record?.upload_status === 'UPLOADED' || record?.upload_status === 'UPLOADING') return { key: 'reviewing' as const, label: '审核中', className: 'reviewing' }
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

export function recordingFromManagementRecord(record: ManagementRecord): Recording {
  return {
    name: record.file_name || record.record_no,
    size: record.file_size_bytes,
    mtime: record.captured_at ? new Date(record.captured_at).getTime() : 0,
    hasColor: false,
    hasDepth: false,
    hasGlove: false,
    hasImu: false,
    hasStereo: false,
    hasAudio: false,
    decoded: false,
    decoding: false,
    needsDecode: false,
    transferring: false,
    transferred: record.upload_status === 'UPLOADED',
    transferPct: record.upload_status === 'UPLOADED' ? 100 : 0,
    remoteOnly: true,
  }
}
