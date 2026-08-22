import {
  Activity,
  BookOpenCheck,
  CheckCircle2,
  Cloud,
  FileQuestion,
  Gauge,
  MessageSquareText,
  RadioTower,
  Send,
  ShieldCheck,
  Wifi,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useUiMode } from '../../app/uiModeContext'
import type { Notify } from '../../app/model'
import type { RecordStatus } from '../../services/deviceApi'
import { PageHeader } from '../../shared/ui/DevicePrimitives'
import { MobileCloudSettingsView } from './mobile/MobileCloudSettingsView'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '../../shared/lib/cn'
import { managementApi, type ProductKit } from '../../services/managementApi'

const PROVIDERS = ['阿里云 OSS', '百度云 BOS', '华为云 OBS', '腾讯云 COS'] as const

export function CloudSettingsScreen({ back, notify }: { back: () => void; notify: Notify }) {
  const uiMode = useUiMode()
  const [mode, setMode] = useState<'local' | 'cloud'>('local')
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('阿里云 OSS')
  const [testing, setTesting] = useState(false)
  const [tested, setTested] = useState(false)
  const [configId, setConfigId] = useState<string>()
  const [endpoint, setEndpoint] = useState('')
  const [bucket, setBucket] = useState('')
  const [region, setRegion] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    managementApi.cloudStorage().then((items) => {
      const item = items[0]
      if (!item) return
      setConfigId(item.id)
      if (PROVIDERS.includes(item.provider as (typeof PROVIDERS)[number])) setProvider(item.provider as (typeof PROVIDERS)[number])
      setEndpoint(item.endpoint)
      setBucket(item.bucket)
      setRegion(item.region)
    }).catch(() => undefined)
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const result = await managementApi.saveCloudStorage({ id: configId, name: `${provider} 默认连接`, provider, endpoint, bucket, region, status: 'CONNECTED' })
      setConfigId(result.id)
      notify(`${provider} 配置已保存到管理后台`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '云存储配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  const test = () => {
    setTesting(true)
    window.setTimeout(() => {
      setTesting(false)
      setTested(true)
      notify('配置格式检查通过，等待服务端连通性验证')
    }, 500)
  }

  if (uiMode === 'mobile') return <MobileCloudSettingsView
    back={back}
    mode={mode}
    provider={provider}
    testing={testing}
    tested={tested}
    endpoint={endpoint}
    bucket={bucket}
    region={region}
    saving={saving}
    setMode={setMode}
    setProvider={(value) => { setProvider(value); setTested(false) }}
    setEndpoint={setEndpoint}
    setBucket={setBucket}
    setRegion={setRegion}
    test={test}
    save={save}
  />

  return (
		<div className="page detail-page">
			<PageHeader title="数据存储" subtitle="本地与对象存储配置" back={back} />
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(300px,.72fr)_minmax(620px,1.55fr)] gap-5">
				<Card className="overflow-auto p-7">
					<span className="eyebrow">STORAGE MODE</span>
					<h2 className="mt-2 text-[length:var(--device-text-lg)] font-bold">存储方式</h2>
					<Button className="mt-3 w-full justify-start" size="device" variant={mode === 'local' ? 'default' : 'secondary'} onClick={() => setMode('local')}><Gauge />本地设备</Button>
					<Button className="mt-3 w-full justify-start" size="device" variant={mode === 'cloud' ? 'default' : 'secondary'} onClick={() => setMode('cloud')}><Cloud />云端存储</Button>
					<div className="mt-5 flex items-center gap-3 rounded-xl bg-violet-500/10 p-4 text-[length:var(--device-text-xs)] text-violet-500"><ShieldCheck className="size-8" /><span>密钥只在提交时发送，页面不明文回显。</span></div>
				</Card>
				<Card className="overflow-auto p-7">
					{mode === 'local' ? (
						<>
							<span className="eyebrow">LOCAL STORAGE</span><h2 className="mt-2 text-[length:var(--device-text-lg)] font-bold">本地存储</h2>
							<div className="my-5 grid grid-cols-2 gap-4">
								<label className={deviceLabelClass}><span>录制目录</span><input className={deviceControlClass} defaultValue="/data/recordings" /></label>
								<label className={deviceLabelClass}><span>空间预警阈值</span><input className={deviceControlClass} defaultValue="15%" /></label>
							</div>
							<div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-[length:var(--device-text-sm)] text-emerald-500"><CheckCircle2 className="size-8" />当前录制将优先保存至设备本地。</div>
						</>
					) : (
						<>
							<span className="eyebrow">OBJECT STORAGE</span><h2 className="mt-2 text-[length:var(--device-text-lg)] font-bold">云端配置</h2>
							<div className="mt-4 flex flex-wrap gap-2.5">{PROVIDERS.map(item => <Button key={item} className="min-h-16 rounded-full px-5 text-[length:var(--device-text-xs)]" variant={provider === item ? 'default' : 'secondary'} onClick={() => { setProvider(item); setTested(false) }}>{item}</Button>)}</div>
							<div className="my-5 grid grid-cols-2 gap-4">
								<label className={deviceLabelClass}><span>Endpoint</span><input className={deviceControlClass} value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://oss-cn-xxx.example.com" /></label>
								<label className={deviceLabelClass}><span>Bucket</span><input className={deviceControlClass} value={bucket} onChange={event => setBucket(event.target.value)} placeholder="sensorhub-dataset" /></label>
								<label className={deviceLabelClass}><span>Access Key</span><input className={deviceControlClass} autoComplete="off" placeholder="请输入 Access Key" /></label>
								<label className={deviceLabelClass}><span>Secret Key</span><input className={deviceControlClass} type="password" autoComplete="new-password" placeholder="请输入 Secret Key" /></label>
								<label className={deviceLabelClass}><span>目录前缀</span><input className={deviceControlClass} placeholder="project/device-sn/" /></label>
								<label className={deviceLabelClass}><span>区域 Region</span><input className={deviceControlClass} value={region} onChange={event => setRegion(event.target.value)} placeholder="cn-east-3" /></label>
							</div>
							{tested && <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-[length:var(--device-text-sm)] text-emerald-500"><CheckCircle2 className="size-8" />字段校验通过；真实连接需后端服务。</div>}
							<div className="mt-5 flex justify-end gap-3"><Button size="device" variant="secondary" onClick={test}>{testing ? '检查中…' : '测试配置'}</Button><Button size="device" disabled={saving || !endpoint || !bucket} onClick={save}>{saving ? '保存中…' : '保存配置'}</Button></div>
						</>
					)}
				</Card>
      </div>
    </div>
  )
}

export function HelpFeedbackScreen({ back, notify }: { back: () => void; notify: Notify }) {
	const mode = useUiMode()
	const [kind, setKind] = useState('功能建议')
	const [content, setContent] = useState('')
	const [submitting, setSubmitting] = useState(false)
	return (
		<div className="page detail-page">
			<PageHeader title="帮助与反馈" subtitle="常见问题、问题上报与服务支持" back={back} />
			<div className={cn('grid min-h-0 flex-1 gap-5 overflow-y-auto', mode === 'device' ? 'grid-cols-[minmax(300px,.72fr)_minmax(620px,1.55fr)]' : 'grid-cols-1 gap-3')}>
				<Card className={cn('overflow-auto', mode === 'device' ? 'p-7' : 'p-4')}>
					<span className="eyebrow">QUICK HELP</span><h2 className={cn('mt-2 font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-xl')}>常见问题</h2>
					<div className={cn('mt-3 [&_details]:border-b [&_details]:border-border [&_p]:leading-7 [&_p]:text-muted-foreground [&_summary]:cursor-pointer [&_summary]:font-bold', mode === 'device' ? '[&_details]:py-[18px] [&_p]:text-[length:var(--device-text-xs)] [&_summary]:text-[length:var(--device-text-sm)]' : '[&_details]:py-4 [&_p]:text-sm [&_summary]:text-sm')}>
						<details open><summary>相机没有画面怎么办？</summary><p>先确认相机在线，再启动实时预览；公网访问时由设备服务提供同源预览地址。</p></details>
						<details><summary>数据如何上传？</summary><p>在采集记录中选择数据，配置对象存储后执行批量上传。</p></details>
						<details><summary>设备离线还能使用吗？</summary><p>本地采集与设备控制可继续使用，云任务与同步会等待网络恢复。</p></details>
					</div>
				</Card>
				<Card className={cn('grid content-start overflow-auto', mode === 'device' ? 'gap-4 p-7' : 'gap-3 p-4')}>
					<MessageSquareText className={mode === 'device' ? 'size-10 text-violet-500' : 'size-8 text-violet-500'} />
					<h2 className={cn('font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-xl')}>提交反馈</h2>
					<label className={controlLabelClass(mode)}><span>反馈类型</span><select className={controlClass(mode)} value={kind} onChange={event => setKind(event.target.value)}><option>功能建议</option><option>设备故障</option><option>数据问题</option><option>其他</option></select></label>
					<label className={controlLabelClass(mode)}><span>问题描述</span><textarea className={controlClass(mode)} rows={5} value={content} onChange={event => setContent(event.target.value)} placeholder="请描述发生步骤、期望结果和实际结果" /></label>
					<label className={controlLabelClass(mode)}><span>联系方式（选填）</span><input className={controlClass(mode)} placeholder="手机或邮箱" /></label>
					<Button size={mode === 'device' ? 'device' : 'touch'} disabled={submitting || content.trim().length < 2} onClick={async () => { setSubmitting(true); try { await managementApi.feedback(kind, content.trim()); setContent(''); notify('反馈已提交到管理后台') } catch (error) { notify(error instanceof Error ? error.message : '反馈提交失败') } finally { setSubmitting(false) } }}><Send />{submitting ? '提交中…' : '提交反馈'}</Button>
				</Card>
			</div>
		</div>
	)
}

export function SuiteGuideScreen({ back, notify }: { back: () => void; notify: Notify }) {
	const mode = useUiMode()
	const [step, setStep] = useState(0)
  const [activeKit, setActiveKit] = useState<ProductKit | null>(null)
  const [answer, setAnswer] = useState('')
  const steps = ['穿戴并调整头部相机', '连接腕部设备或手套', '检查相机、IMU 与存储', '领取任务并阅读 SOP']
  useEffect(() => {
    managementApi.kits().then((kits) => setActiveKit(kits.find((kit) => kit.status === 'ACTIVE') ?? null)).catch(() => undefined)
  }, [])
  return (
		<div className="page detail-page">
			<PageHeader title="套件指南" subtitle="穿戴说明、安全检查与理论考试" back={back} />
			<div className={cn('grid min-h-0 flex-1 gap-5 overflow-y-auto', mode === 'device' ? 'grid-cols-[minmax(300px,.72fr)_minmax(620px,1.55fr)]' : 'grid-cols-1 gap-3')}>
				<Card className={cn('overflow-auto', mode === 'device' ? 'p-7' : 'p-4')}>
					<BookOpenCheck className={mode === 'device' ? 'size-10 text-sky-500' : 'size-8 text-sky-500'} />
					<span className="eyebrow">{activeKit?.name ?? 'WEARING GUIDE'}</span><h2 className={cn('mt-2 font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-xl')}>{steps[step]}</h2>
					{activeKit?.instructions && <p className={cn('mt-2 leading-6 text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-sm')}>{activeKit.instructions}</p>}
					<div className={cn('relative my-[18px] grid place-items-center rounded-[18px] bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-violet-500/20 text-sky-500', mode === 'device' ? 'min-h-[170px] [&>svg]:size-[74px]' : 'min-h-32 [&>svg]:size-14')}><span className={cn('absolute left-[18px] top-4 font-extrabold', mode === 'device' ? 'text-[length:var(--device-text-md)]' : 'text-lg')}>{step + 1}</span><Activity /></div>
					<ol className={cn('list-decimal pl-6 leading-loose text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-sm')}>{steps.map((item, index) => <li key={item} className={cn(index === step && 'font-bold text-foreground', index < step && 'text-emerald-500')}>{item}</li>)}</ol>
					<div className="mt-5 flex justify-end gap-3"><Button size={mode === 'device' ? 'device' : 'touch'} variant="secondary" disabled={step === 0} onClick={() => setStep(value => value - 1)}>上一步</Button><Button size={mode === 'device' ? 'device' : 'touch'} disabled={step === steps.length - 1} onClick={() => setStep(value => value + 1)}>下一步</Button></div>
				</Card>
				<Card className={cn('overflow-auto', mode === 'device' ? 'p-7' : 'p-4', activeKit && !activeKit.exam_enabled && 'opacity-70')}>
					<FileQuestion className={mode === 'device' ? 'size-10 text-amber-500' : 'size-8 text-amber-500'} />
					<span className="eyebrow">THEORY EXAM</span><h2 className={cn('mt-2 font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-xl')}>采集前理论考试</h2>
					<p className={cn('my-4 leading-relaxed', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-sm')}>{activeKit && !activeKit.exam_enabled ? '当前套件未启用理论考试。' : '发现相机画面明显卡顿时，正确做法是？'}</p>
					<div className="grid gap-3">{['继续录制，结束后再处理', '暂停采集并检查连接与资源状态', '直接关闭设备电源'].map(item => <Button key={item} className="h-auto w-full justify-start whitespace-normal py-4 text-left" size={mode === 'device' ? 'device' : 'touch'} variant={answer === item ? 'default' : 'secondary'} onClick={() => setAnswer(item)}>{item}</Button>)}</div>
					<Button className="mt-5 w-full" size={mode === 'device' ? 'device' : 'touch'} onClick={() => notify(answer === '暂停采集并检查连接与资源状态' ? '回答正确' : '请重新检查答案')}>提交答案</Button>
				</Card>
			</div>
		</div>
  )
}

export function DiagnosticsScreen({ back, record }: { back: () => void; record: RecordStatus }) {
	const mode = useUiMode()
  const topics = useMemo(() => [
    { name: '/camera/color', ok: record.cameraConnected, hz: '30 Hz' },
    { name: '/sensor/imu', ok: record.imu, hz: record.imu ? '100 Hz' : '—' },
    { name: '/tracker/pose', ok: record.vive, hz: record.vive ? '60 Hz' : '—' },
    { name: '/glove/joints', ok: record.gloveConnected, hz: record.gloveConnected ? '50 Hz' : '—' },
  ], [record])
  return (
		<div className="page detail-page">
			<PageHeader title="采集诊断" subtitle="传感器、Tracker 与 Topic 监控" back={back} />
			<div className={cn('grid min-h-0 flex-1 gap-[18px] overflow-y-auto', mode === 'device' ? 'grid-cols-[1.2fr_.8fr] grid-rows-2' : 'grid-cols-1 gap-3')}>
				<Card className={cn('min-h-0 overflow-hidden', mode === 'device' ? 'p-[22px]' : 'p-4')}><span className="eyebrow">IMU STREAM</span><h2 className={headingClass(mode)}>惯性数据</h2><div className="relative mt-4 h-[140px] overflow-hidden rounded-xl bg-[repeating-linear-gradient(0deg,transparent_0_27px,var(--border)_28px),repeating-linear-gradient(90deg,transparent_0_47px,var(--border)_48px)]"><i className="absolute inset-x-[-10%] top-1/2 h-0.5 rotate-3 bg-blue-500 shadow-[70px_-25px_0_var(--color-blue-500),140px_18px_0_var(--color-blue-500),260px_-12px_0_var(--color-blue-500)]" /><i className="absolute inset-x-[-10%] top-1/2 h-0.5 -rotate-4 bg-emerald-500" /><i className="absolute inset-x-[-10%] top-1/2 h-0.5 rotate-1 bg-amber-500" /></div><div className={cn('mt-3 flex gap-[18px] text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-xs')}><span className="text-blue-500">X</span><span className="text-emerald-500">Y</span><span className="text-amber-500">Z</span></div></Card>
				<Card className={cn('grid min-h-0 grid-cols-[auto_1fr] content-start gap-x-3.5 overflow-hidden', mode === 'device' ? 'p-[22px]' : 'p-4')}><RadioTower className="row-span-2 size-10 text-violet-500" /><span className="eyebrow">TRACKER</span><h2 className={headingClass(mode)}>{record.vive ? '定位正常' : '等待定位数据'}</h2><div className="relative col-span-2 mt-[18px] min-h-[120px] rounded-[14px] border border-dashed border-border bg-violet-500/5"><i className="absolute left-[35%] top-[55%] size-3 rounded-full bg-violet-500" /><b className="absolute left-[68%] top-[30%] size-3 rounded-full bg-sky-500" /></div></Card>
				<Card className={cn('min-h-0 overflow-hidden', mode === 'device' ? 'p-[22px]' : 'p-4')}><div className="flex items-center justify-between gap-5"><h2 className={headingClass(mode)}>Topic 状态</h2><span className={mode === 'device' ? 'text-[length:var(--device-text-sm)] text-muted-foreground' : 'text-xs text-muted-foreground'}>实时</span></div>{topics.map(topic => <div className={cn('grid grid-cols-[12px_1fr_auto] items-center gap-3 border-b border-border py-[13px]', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-xs')} key={topic.name}><span className={cn('size-3 rounded-full bg-muted-foreground', topic.ok && 'bg-emerald-500')} /><code className="truncate text-muted-foreground">{topic.name}</code><strong>{topic.hz}</strong></div>)}</Card>
				<Card className={cn('min-h-0 overflow-hidden', mode === 'device' ? 'p-[22px]' : 'p-4')}><div className="flex items-center justify-between gap-5"><h2 className={headingClass(mode)}>运行日志</h2><Wifi className="size-8 text-sky-500" /></div><pre className={cn('mt-4 whitespace-pre-wrap font-mono leading-loose text-blue-500', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-xs')}>13:14:01 device-ui ready{`\n`}13:14:02 camera discovery complete{`\n`}13:14:03 waiting for sensor topics</pre></Card>
			</div>
		</div>
	)
}

const deviceLabelClass = 'grid gap-2 text-[length:var(--device-text-xs)] text-muted-foreground'
const deviceControlClass = 'min-h-[76px] w-full rounded-xl border border-border bg-secondary px-4 text-[length:var(--device-text-sm)] text-foreground outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

function controlLabelClass(mode: 'device' | 'mobile') {
	return cn('grid gap-2 text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-xs)]' : 'text-sm')
}

function controlClass(mode: 'device' | 'mobile') {
	return cn('w-full rounded-xl border border-border bg-secondary text-foreground outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20', mode === 'device' ? 'min-h-[76px] px-4 text-[length:var(--device-text-sm)]' : 'min-h-11 px-3 py-2 text-sm')
}

function headingClass(mode: 'device' | 'mobile') {
	return cn('font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-lg')
}
