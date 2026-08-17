import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileTaskClaimView } from './MobileDataViews'

describe('MobileTaskClaimView', () => {
  it('presents task selection as a mobile workflow', () => {
    const setProject = vi.fn()
    const setTask = vi.fn()
    render(<MobileTaskClaimView back={vi.fn()} device="iSuit" scene="家庭收纳" project="未选择" task="未选择" setDevice={vi.fn()} setScene={vi.fn()} setProject={setProject} setTask={setTask} claim={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /收纳盒@紫竹家具馆5/ }))
    fireEvent.click(screen.getByRole('button', { name: /把药盒、药瓶、空药瓶分类/ }))
    expect(setProject).toHaveBeenCalledWith('收纳盒@紫竹家具馆5')
    expect(setTask).toHaveBeenCalledWith('把药盒、药瓶、空药瓶分类')
  })
})
