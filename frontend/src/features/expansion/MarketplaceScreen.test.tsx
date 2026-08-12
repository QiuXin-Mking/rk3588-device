import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MarketplaceScreen } from './ExpansionScreens'

describe('MarketplaceScreen', () => {
  it('shows the three display-only devices with offline state', () => {
    render(<MarketplaceScreen back={vi.fn()} />)

    expect(screen.getByText('Ego_H')).toBeInTheDocument()
    expect(screen.getByText('UMI_Grippers_L')).toBeInTheDocument()
    expect(screen.getByText('UMI_Grippers_R')).toBeInTheDocument()
    expect(screen.getAllByText('离线')).toHaveLength(3)
  })

  it('contains no ordering, price, or inventory user interface', () => {
    render(<MarketplaceScreen back={vi.fn()} />)

    expect(screen.queryByText(/下单|价格|库存/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /购买|下单/ })).not.toBeInTheDocument()
  })
})

