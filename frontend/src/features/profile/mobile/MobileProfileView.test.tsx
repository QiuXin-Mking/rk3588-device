import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_STATUS } from '../../../app/model'
import { MobileProfileView } from './MobileProfileView'

describe('MobileProfileView', () => {
  it('provides mobile navigation to storage and device management', () => {
    const go = vi.fn()
    render(<MobileProfileView status={FALLBACK_STATUS} online={false} go={go} notify={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /数据存储/ }))
    expect(go).toHaveBeenCalledWith('cloud-settings')
  })
})
