import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_RECORD, FALLBACK_STATUS, type ScreenCommonProps } from '../../app/model'
import { api, type Recording } from '../../services/deviceApi'
import { RecordsScreen } from './RecordsScreen'

const recording = (name: string, size: number): Recording => ({
  name,
  size,
  mtime: 0,
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
  transferred: false,
  transferPct: 0,
})

const props = (files: Recording[]): ScreenCommonProps => ({
  status: FALLBACK_STATUS,
  record: FALLBACK_RECORD,
  files: {
    files,
    root: '/records',
    externalDisk: {
      present: true,
      mount: '/mnt/usb',
      dev: '/dev/sda1',
      free: 1024 ** 4,
      total: 2 * 1024 ** 4,
    },
  },
  online: false,
  go: vi.fn(),
  notify: vi.fn(),
  refreshStatus: vi.fn(),
  refreshFiles: vi.fn(),
})

describe('RecordsScreen', () => {
  it('shows only record count and total data in the summary', () => {
    render(<RecordsScreen {...props([recording('one', 1024 ** 2)])} />)

    const summary = screen.getByRole('region', { name: '记录汇总' })
    expect(within(summary).getByText('记录数量')).toBeInTheDocument()
    expect(within(summary).getByText('数据总量')).toBeInTheDocument()
    expect(within(summary).queryByText('外接存储')).not.toBeInTheDocument()
    expect(screen.queryByText('外接存储')).not.toBeInTheDocument()
  })

  it.each([
    [512 * 1024, '0.5 MB'],
    [500 * 1024 ** 2, '500 MB'],
    [3.5 * 1024 ** 3, '3.5 GB'],
    [2.25 * 1024 ** 4, '2.3 TB'],
  ])('formats a %d byte total with an adaptive MB, GB, or TB unit', (size, expected) => {
    render(<RecordsScreen {...props([recording('one', size)])} />)

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('confirms and executes deletion from record details', async () => {
    const deleteFile = vi.spyOn(api, 'deleteFile').mockResolvedValue({ ok: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const screenProps = props([recording('session_delete', 1024)])
    render(<RecordsScreen {...screenProps} />)

    fireEvent.click(screen.getByRole('button', { name: /session_delete/ }))
    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    await waitFor(() => expect(deleteFile).toHaveBeenCalledWith('session_delete'))
    expect(screenProps.refreshFiles).toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '记录详情' })).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
