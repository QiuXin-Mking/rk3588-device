import { type CSSProperties, type PropsWithChildren, useEffect, useState } from 'react'

const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

export function calculateCanvasScale(width: number, height: number) {
  if (width <= 0 || height <= 0) return 1
  return Math.min(1, width / CANVAS_WIDTH, height / CANVAS_HEIGHT)
}

function viewportScale() {
  return calculateCanvasScale(window.innerWidth, window.innerHeight)
}

export function FixedCanvas({ children }: PropsWithChildren) {
  const [scale, setScale] = useState(viewportScale)

  useEffect(() => {
    const resize = () => setScale(viewportScale())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const canvasStyle = {
    width: `${CANVAS_WIDTH}px`,
    height: `${CANVAS_HEIGHT}px`,
    '--canvas-scale': String(scale),
  } as CSSProperties

  return (
    <div className="device-viewport">
      <div className="device-canvas" data-testid="device-canvas" style={canvasStyle}>
        {children}
      </div>
    </div>
  )
}
