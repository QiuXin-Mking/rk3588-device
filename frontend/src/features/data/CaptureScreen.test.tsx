import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_RECORD } from '../../app/model'
import { CaptureScreen } from './DataScreens'

const commonProps = {
  files: { files: [], root: '', externalDisk: null },
  busy: false,
  back: vi.fn(),
  notify: vi.fn(),
  refreshStatus: vi.fn().mockResolvedValue(undefined),
  toggleRecord: vi.fn().mockResolvedValue(undefined),
}

describe('CaptureScreen', () => {
  it('renders four live Mango camera previews on their semantic routes', () => {
    const record = {
      ...FALLBACK_RECORD,
      cameraConnected: true,
      previewing: true,
      cameras: {
        jhh02: true,
        jhh04: true,
        wrist_left: true,
        wrist_right: true,
      },
    }

    render(<CaptureScreen {...commonProps} product="Mango" record={record} />)

    const routes = [
      ['头部双目', '/api/camera/preview/head-stereo?t='],
      ['头部四目', '/api/camera/preview/head-four?t='],
      ['左腕部单目', '/api/camera/preview/wrist-left?t='],
      ['右腕部单目', '/api/camera/preview/wrist-right?t='],
    ] as const

    for (const [label, route] of routes) {
      expect(screen.getByAltText(`${label} 预览`)).toHaveAttribute('src', expect.stringContaining(route))
    }
    expect(screen.queryByText('FPV_L')).not.toBeInTheDocument()
    expect(screen.queryByText('FPV_R')).not.toBeInTheDocument()
  })

  it('retains the legacy Banana preview cards', () => {
    render(<CaptureScreen {...commonProps} product="Banana" record={FALLBACK_RECORD} />)

    expect(screen.getByText('FPV_L')).toBeInTheDocument()
    expect(screen.getByText('FPV_R')).toBeInTheDocument()
    expect(screen.queryByText('左腕部单目')).not.toBeInTheDocument()
    expect(screen.queryByText('右腕部单目')).not.toBeInTheDocument()
  })
})
