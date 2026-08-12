import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_RECORD, FALLBACK_STATUS, type ScreenCommonProps } from '../../app/model'
import { RealtimeScreen } from './DataScreens'

const props: ScreenCommonProps = {
  status: FALLBACK_STATUS,
  record: FALLBACK_RECORD,
  files: { files: [], root: '', externalDisk: null },
  online: false,
  go: vi.fn(),
  notify: vi.fn(),
  refreshStatus: vi.fn(),
  refreshFiles: vi.fn(),
}

describe('RealtimeScreen', () => {
  it('shows three product devices and four camera channels without duplicate battery data', () => {
    render(<RealtimeScreen {...props} product="Banana" />)

    expect(screen.getByRole('button', { name: /UMI_Fingers_L/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /UMI_Fingers_R/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ego_H/ })).toBeInTheDocument()
    for (const channel of ['头部双目', '头部四目', '左手双目', '右手双目']) {
      expect(screen.getByText(channel)).toBeInTheDocument()
    }
    expect(screen.queryByText('电量')).not.toBeInTheDocument()
  })

  it('opens Ego_H details with connection states and declared stream resolutions', () => {
    render(<RealtimeScreen {...props} product="Banana" />)

    fireEvent.click(screen.getByRole('button', { name: /Ego_H/ }))
    const dialog = screen.getByRole('dialog', { name: 'Ego_H 设备详情' })

    expect(within(dialog).getByText('USB 连接')).toBeInTheDocument()
    expect(within(dialog).getByText('双目 MKV')).toBeInTheDocument()
    expect(within(dialog).getByText('双目 Y8')).toBeInTheDocument()
    expect(within(dialog).getByText('四目 Y8')).toBeInTheDocument()
    expect(within(dialog).getAllByText('4000 × 1200')).toHaveLength(2)
    expect(within(dialog).getByText('3104 × 480')).toBeInTheDocument()
  })

  it('opens both finger-device details with wireless, USB, and stereo MKV data', () => {
    render(<RealtimeScreen {...props} product="Banana" />)

    for (const id of ['UMI_Fingers_L', 'UMI_Fingers_R']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(id) }))
      const dialog = screen.getByRole('dialog', { name: `${id} 设备详情` })
      expect(within(dialog).getByText('无线连接')).toBeInTheDocument()
      expect(within(dialog).getByText('USB 连接')).toBeInTheDocument()
      expect(within(dialog).getByText('双目 MKV')).toBeInTheDocument()
      expect(within(dialog).getByText('3840 × 1200')).toBeInTheDocument()
      fireEvent.click(within(dialog).getByRole('button', { name: '关闭详情' }))
    }
  })

  it('shows Mango suite devices and hides Banana-only finger devices', () => {
    render(<RealtimeScreen {...props} product="Mango" />)

    expect(screen.getByRole('button', { name: /Ego_H/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ego_W_L/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ego_W_R/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /UMI_Fingers_L/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /UMI_Fingers_R/ })).not.toBeInTheDocument()
    for (const channel of ['头部双目', '头部四目', '左腕部单目', '右腕部单目']) {
      expect(screen.getByText(channel)).toBeInTheDocument()
    }
    expect(screen.queryByText('左手双目')).not.toBeInTheDocument()
    expect(screen.queryByText('右手双目')).not.toBeInTheDocument()
  })

  it('uses Mango wrist camera states for the monocular channels', () => {
    const record = {
      ...FALLBACK_RECORD,
      cameras: { ego_w_left: true, ego_w_right: true },
    }
    render(<RealtimeScreen {...props} record={record} product="Mango" />)

    for (const label of ['左腕部单目', '右腕部单目']) {
      const channel = screen.getByText(label).closest('.camera-channel')
      expect(channel).toHaveTextContent('在线')
    }
  })
})
