import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileCloudSettingsView } from './MobileCloudSettingsView'

describe('MobileCloudSettingsView', () => {
  it('renders provider credentials and connection actions', () => {
    const setProvider = vi.fn()
    const setMode = vi.fn()
    const setEndpoint = vi.fn()
    const setBucket = vi.fn()
    const setRegion = vi.fn()
    const test = vi.fn()
    const save = vi.fn()
    render(<MobileCloudSettingsView back={vi.fn()} mode="cloud" provider="阿里云 OSS" testing={false} tested endpoint="https://stress.example.com" bucket="stress-bucket" region="cn-stress-1" saving={false} setMode={setMode} setProvider={setProvider} setEndpoint={setEndpoint} setBucket={setBucket} setRegion={setRegion} test={test} save={save} />)
    fireEvent.click(screen.getByRole('button', { name: /本地设备/ }))
    fireEvent.click(screen.getByRole('button', { name: /对象存储/ }))
    for (const name of ['阿里云 OSS', '百度云 BOS', '华为云 OBS', '腾讯云 COS']) fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
    fireEvent.change(screen.getByPlaceholderText('https://endpoint.example.com'), { target: { value: 'https://changed.example.com' } })
    fireEvent.change(screen.getByPlaceholderText('sensorhub-dataset'), { target: { value: 'changed-bucket' } })
    fireEvent.change(screen.getByPlaceholderText('cn-east-3'), { target: { value: 'cn-changed-1' } })
    fireEvent.click(screen.getByRole('button', { name: '测试配置' }))
    fireEvent.click(screen.getByRole('button', { name: /保存配置/ }))
    expect(setProvider).toHaveBeenCalledWith('腾讯云 COS')
    expect(setMode).toHaveBeenCalledWith('local')
    expect(setMode).toHaveBeenCalledWith('cloud')
    expect(setEndpoint).toHaveBeenCalledWith('https://changed.example.com')
    expect(setBucket).toHaveBeenCalledWith('changed-bucket')
    expect(setRegion).toHaveBeenCalledWith('cn-changed-1')
    expect(test).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledOnce()
    expect(screen.getAllByPlaceholderText('接口启用后填写')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '测试配置' })).toBeInTheDocument()
  })
})
