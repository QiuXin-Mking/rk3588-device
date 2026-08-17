import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CloudSettingsScreen, SuiteGuideScreen } from './RequirementScreens'

describe('requirement completion screens', () => {
  it('supports all four object storage providers and credential fields', () => {
    render(<CloudSettingsScreen back={vi.fn()} notify={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '云端存储' }))

    expect(screen.getByRole('button', { name: '阿里云 OSS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '百度云 BOS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '华为云 OBS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '腾讯云 COS' })).toBeInTheDocument()
    expect(screen.getByText('Access Key')).toBeInTheDocument()
    expect(screen.getByText('Secret Key')).toBeInTheDocument()
  })

  it('provides a navigable guide and theory exam', () => {
    render(<SuiteGuideScreen back={vi.fn()} notify={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '穿戴并调整头部相机' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByRole('heading', { name: '连接腕部设备或手套' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '采集前理论考试' })).toBeInTheDocument()
  })
})
