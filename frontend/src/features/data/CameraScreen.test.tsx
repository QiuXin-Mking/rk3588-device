import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_RECORD } from '../../app/model'
import { CameraScreen } from './DataScreens'

describe('CameraScreen', () => {
  it('shows Mango wrist monocular feeds instead of Banana hand stereo feeds', () => {
    const record = {
      ...FALLBACK_RECORD,
      cameraConnected: true,
      recording: true,
      cameras: { jhh02: true, jhh04: true, wrist_left: true, wrist_right: true },
    }
    render(<CameraScreen record={record} product="Mango" back={vi.fn()} />)

    const expectedFeeds = [
      ['头部双目', '/api/camera/preview/head-stereo?t='],
      ['头部四目', '/api/camera/preview/head-four?t='],
      ['左腕部单目', '/api/camera/preview/wrist-left?t='],
      ['右腕部单目', '/api/camera/preview/wrist-right?t='],
    ]
    expectedFeeds.forEach(([name, src]) => {
      expect(screen.getByRole('img', { name: `${name} 预览` })).toHaveAttribute('src', expect.stringContaining(src))
    })
    expect(screen.queryByText('左手双目')).not.toBeInTheDocument()
    expect(screen.queryByText('右手双目')).not.toBeInTheDocument()
  })
})
