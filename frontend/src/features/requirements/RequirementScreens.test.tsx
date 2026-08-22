import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TopbarPortalContext } from '../../app/TopbarPortal'
import { managementApi } from '../../services/managementApi'
import { CloudSettingsScreen, HelpFeedbackScreen, SuiteGuideScreen } from './RequirementScreens'

function renderDevice(ui: ReactElement) {
  const heading = document.createElement('div')
  const action = document.createElement('div')
  document.body.append(heading, action)
  return render(
    <TopbarPortalContext.Provider value={{ heading, action }}>
      {ui}
    </TopbarPortalContext.Provider>,
  )
}

describe('requirement completion screens', () => {
  afterEach(() => vi.restoreAllMocks())

  it('supports all four object storage providers and credential fields', () => {
    renderDevice(<CloudSettingsScreen back={vi.fn()} notify={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '云端存储' }))

    expect(screen.getByRole('button', { name: '阿里云 OSS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '百度云 BOS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '华为云 OBS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '腾讯云 COS' })).toBeInTheDocument()
    expect(screen.getByText('Access Key')).toBeInTheDocument()
    expect(screen.getByText('Secret Key')).toBeInTheDocument()
  })

  it('provides a navigable guide and theory exam', () => {
    const back = vi.fn()
    const notify = vi.fn()
    renderDevice(<SuiteGuideScreen back={back} notify={notify} />)
    expect(screen.getByRole('heading', { name: '穿戴并调整头部相机' })).toBeInTheDocument()
    const next = screen.getByRole('button', { name: '下一步' })
    const previous = screen.getByRole('button', { name: '上一步' })
    expect(previous).toBeDisabled()
    fireEvent.click(next)
    expect(screen.getByRole('heading', { name: '连接腕部设备或手套' })).toBeInTheDocument()
    fireEvent.click(next)
    expect(screen.getByRole('heading', { name: '检查相机、IMU 与存储' })).toBeInTheDocument()
    fireEvent.click(next)
    expect(screen.getByRole('heading', { name: '领取任务并阅读 SOP' })).toBeInTheDocument()
    expect(next).toBeDisabled()
    fireEvent.click(previous)
    fireEvent.click(previous)
    fireEvent.click(previous)
    expect(screen.getByRole('heading', { name: '穿戴并调整头部相机' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '采集前理论考试' })).toBeInTheDocument()

    for (const answer of ['继续录制，结束后再处理', '直接关闭设备电源', '暂停采集并检查连接与资源状态']) {
      fireEvent.click(screen.getByRole('button', { name: answer }))
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
    }
    expect(notify).toHaveBeenCalledWith('请重新检查答案')
    expect(notify).toHaveBeenCalledWith('回答正确')
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(back).toHaveBeenCalledOnce()
  })

  it('exercises every cloud storage control with populated configuration data', async () => {
    const notify = vi.fn()
    vi.spyOn(managementApi, 'cloudStorage').mockResolvedValue([{ id: 'cloud-1', name: '压力配置', provider: '阿里云 OSS', endpoint: 'https://stress-storage.ego.test', bucket: 'stress-bucket', region: 'cn-test-1', status: 'CONNECTED' }])
    const save = vi.spyOn(managementApi, 'saveCloudStorage').mockImplementation(async value => ({ ...value, id: 'cloud-1', status: 'CONNECTED' }))
    renderDevice(<CloudSettingsScreen back={vi.fn()} notify={notify} />)

    fireEvent.click(screen.getByRole('button', { name: '云端存储' }))
    await waitFor(() => expect(screen.getByPlaceholderText('https://oss-cn-xxx.example.com')).toHaveValue('https://stress-storage.ego.test'))
    expect(screen.getByPlaceholderText('sensorhub-dataset')).toHaveValue('stress-bucket')
    expect(screen.getByPlaceholderText('cn-east-3')).toHaveValue('cn-test-1')

    for (const provider of ['百度云 BOS', '华为云 OBS', '腾讯云 COS', '阿里云 OSS']) {
      fireEvent.click(screen.getByRole('button', { name: provider }))
    }
    fireEvent.change(screen.getByPlaceholderText('请输入 Access Key'), { target: { value: 'stress-access-key' } })
    fireEvent.change(screen.getByPlaceholderText('请输入 Secret Key'), { target: { value: 'stress-secret-key' } })
    fireEvent.change(screen.getByPlaceholderText('project/device-sn/'), { target: { value: 'stress/device-0020/' } })
    fireEvent.click(screen.getByRole('button', { name: '测试配置' }))
    await waitFor(() => expect(notify).toHaveBeenCalledWith('配置格式检查通过，等待服务端连通性验证'), { timeout: 1000 })
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ endpoint: 'https://stress-storage.ego.test', bucket: 'stress-bucket' })))
    fireEvent.click(screen.getByRole('button', { name: '本地设备' }))
    expect(screen.getByDisplayValue('/data/recordings')).toBeInTheDocument()
    expect(screen.getByDisplayValue('15%')).toBeInTheDocument()
  })

  it('submits populated feedback for every category and tests return', async () => {
    const notify = vi.fn()
    const back = vi.fn()
    const feedback = vi.spyOn(managementApi, 'feedback').mockResolvedValue({})
    renderDevice(<HelpFeedbackScreen back={back} notify={notify} />)
    const category = screen.getByRole('combobox')
    const content = screen.getByPlaceholderText('请描述发生步骤、期望结果和实际结果')
    const contact = screen.getByPlaceholderText('手机或邮箱')
    fireEvent.change(contact, { target: { value: 'stress.operator.0020@ego.test' } })

    for (const kind of ['功能建议', '设备故障', '数据问题', '其他']) {
      fireEvent.change(category, { target: { value: kind } })
      fireEvent.change(content, { target: { value: `${kind}压力测试内容` } })
      fireEvent.click(screen.getByRole('button', { name: '提交反馈' }))
      await waitFor(() => expect(feedback).toHaveBeenCalledWith(kind, `${kind}压力测试内容`))
    }
    expect(feedback).toHaveBeenCalledTimes(4)
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(back).toHaveBeenCalledOnce()
  })
})
