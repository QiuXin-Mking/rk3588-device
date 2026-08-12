import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_RECORD } from '../../app/model'
import { CameraScreen } from './DataScreens'

describe('CameraScreen', () => {
  it('shows Mango wrist monocular feeds instead of Banana hand stereo feeds', () => {
    render(<CameraScreen record={FALLBACK_RECORD} product="Mango" back={vi.fn()} />)

    expect(screen.getByText('头部双目')).toBeInTheDocument()
    expect(screen.getByText('头部四目')).toBeInTheDocument()
    expect(screen.getByText('左腕部单目')).toBeInTheDocument()
    expect(screen.getByText('右腕部单目')).toBeInTheDocument()
    expect(screen.queryByText('左手双目')).not.toBeInTheDocument()
    expect(screen.queryByText('右手双目')).not.toBeInTheDocument()
  })
})
