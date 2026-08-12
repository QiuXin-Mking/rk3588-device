import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_RECORD, FALLBACK_STATUS, type ScreenCommonProps } from '../../app/model'
import { HomeScreen, ProductKitScreen } from './HomeScreen'

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

describe('HomeScreen', () => {
  it('shows Banana and Mango as available products and Cherry as unavailable', () => {
    render(<HomeScreen {...props} onSelectProduct={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Banana/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Mango/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Cherry/ })).toBeDisabled()
  })

  it('shows only Banana suite devices for Banana', () => {
    render(<ProductKitScreen product="Banana" back={vi.fn()} go={vi.fn()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('UMI_Fingers_L')).toBeInTheDocument()
    expect(screen.queryByText('Ego_W_L')).not.toBeInTheDocument()
  })

  it('shows only head and wrist Ego devices for Mango', () => {
    render(<ProductKitScreen product="Mango" back={vi.fn()} go={vi.fn()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Ego_W_L')).toBeInTheDocument()
    expect(screen.queryByText('UMI_Fingers_L')).not.toBeInTheDocument()
  })

  it('does not expose a featured-content playback entry this release', () => {
    render(<HomeScreen {...props} onSelectProduct={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /精选内容/ })).not.toBeInTheDocument()
    expect(screen.queryByText('播放内容')).not.toBeInTheDocument()
  })
})
