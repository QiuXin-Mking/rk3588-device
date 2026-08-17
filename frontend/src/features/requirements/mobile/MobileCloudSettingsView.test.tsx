import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileCloudSettingsView } from './MobileCloudSettingsView'

describe('MobileCloudSettingsView', () => {
  it('renders provider credentials and connection actions', () => {
    const setProvider = vi.fn()
    render(<MobileCloudSettingsView back={vi.fn()} mode="cloud" provider="阿里云 OSS" testing={false} tested={false} setMode={vi.fn()} setProvider={setProvider} test={vi.fn()} notify={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /腾讯云 COS/ }))
    expect(setProvider).toHaveBeenCalledWith('腾讯云 COS')
    expect(screen.getByPlaceholderText('请输入 Secret Key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '测试配置' })).toBeInTheDocument()
  })
})
