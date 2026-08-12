import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FixedCanvas, calculateCanvasScale } from './FixedCanvas'

describe('fixed 1920x1080 canvas', () => {
  it('calculates a contain scale without enlarging the design canvas', () => {
    expect(calculateCanvasScale(1920, 1080)).toBe(1)
    expect(calculateCanvasScale(960, 710)).toBe(0.5)
    expect(calculateCanvasScale(1920, 1200)).toBe(1)
  })

  it('renders an explicit 1920x1080 canvas', () => {
    render(<FixedCanvas><span>content</span></FixedCanvas>)

    const canvas = screen.getByTestId('device-canvas')
    expect(canvas).toHaveStyle({ width: '1920px', height: '1080px' })
    expect(canvas.style.getPropertyValue('--canvas-scale')).not.toBe('')
    expect(canvas).toHaveClass('device-canvas')
  })
})
