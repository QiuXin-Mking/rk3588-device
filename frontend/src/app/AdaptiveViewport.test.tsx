import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdaptiveViewport } from './AdaptiveViewport'
import { resolveUiMode } from './viewportMode'

describe('adaptive viewport', () => {
  it('uses the fixed device canvas for landscape terminal dimensions', () => {
    window.history.replaceState(null, '', '?ui=device')
    render(<AdaptiveViewport><span>content</span></AdaptiveViewport>)
    expect(screen.getByTestId('device-canvas')).toBeInTheDocument()
  })

  it('uses a native viewport for mobile dimensions', () => {
    window.history.replaceState(null, '', '?ui=mobile')
    const { container } = render(<AdaptiveViewport><span>content</span></AdaptiveViewport>)
    expect(container.querySelector('.mobile-viewport')).toBeInTheDocument()
    expect(screen.queryByTestId('device-canvas')).not.toBeInTheDocument()
  })

  it('uses a broad local-development breakpoint while production builds select a platform explicitly', () => {
    window.history.replaceState(null, '', '/')
    expect(resolveUiMode(390, 844)).toBe('mobile')
    expect(resolveUiMode(1024, 768)).toBe('mobile')
    expect(resolveUiMode(1366, 768)).toBe('device')
    expect(resolveUiMode(1080, 1920)).toBe('mobile')
    expect(resolveUiMode(2560, 1440)).toBe('device')
    expect(resolveUiMode(1920, 1080)).toBe('device')
  })
})
