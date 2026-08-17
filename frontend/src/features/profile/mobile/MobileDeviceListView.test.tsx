import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileDeviceListView } from './MobileDeviceListView'

describe('MobileDeviceListView', () => {
  it('refreshes device state without reloading the page', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<MobileDeviceListView
      back={vi.fn()}
      go={vi.fn()}
      onRefresh={onRefresh}
      devices={[{ id: 'camera', name: '相机', subtitle: '头部', connected: true, labels: ['彩色'], icon: <span /> }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: '刷新状态' }))
    expect(onRefresh).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByRole('button', { name: '刷新状态' })).toBeEnabled())
  })
})
