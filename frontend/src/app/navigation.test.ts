import { describe, expect, it } from 'vitest'
import { pathForView, viewForPath } from './navigation'

describe('application routes', () => {
  it('maps every view to a stable URL and back', () => {
    for (const view of ['tasks', 'capture', 'records', 'profile', 'cloud-settings'] as const) {
      expect(viewForPath(pathForView(view))).toBe(view)
    }
  })

  it('falls back unknown paths to tasks', () => {
    expect(viewForPath('/does-not-exist')).toBe('tasks')
  })
})
