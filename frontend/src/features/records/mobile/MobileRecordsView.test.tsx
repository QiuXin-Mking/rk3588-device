import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileRecordsView } from './MobileRecordsView'

const recording = { name: 'recording_demo', size: 1024, mtime: 1, hasColor: true, hasDepth: true, hasGlove: false, hasImu: true, hasStereo: false, hasAudio: false, decoded: false, decoding: false, needsDecode: false, transferring: false, transferred: false, transferPct: 0 }

describe('MobileRecordsView', () => {
  it('supports record selection and opening details', () => {
    const onToggle = vi.fn()
    const onOpen = vi.fn()
    const onFilterChange = vi.fn()
    render(<MobileRecordsView files={[recording]} totalSize="1 MB" query="" checked={[]} uploading={false} filter="all" onQueryChange={vi.fn()} onFilterChange={onFilterChange} onToggle={onToggle} onSelectAll={vi.fn()} onOpen={onOpen} onBatchUpload={vi.fn()} onRetry={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '已退回' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '选择 recording_demo' }))
    fireEvent.click(screen.getByRole('button', { name: /demo/ }))
    expect(onToggle).toHaveBeenCalledWith('recording_demo', true)
    expect(onOpen).toHaveBeenCalledWith(recording)
    expect(onFilterChange).toHaveBeenCalledWith('returned')
  })
})
