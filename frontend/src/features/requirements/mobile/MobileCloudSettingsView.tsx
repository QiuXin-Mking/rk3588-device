import { Check, ChevronRight, Cloud, HardDrive, KeyRound, ServerCog, ShieldCheck } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { Button } from '@/components/ui/button'
import { PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Card } from '@/components/ui/card'

const providers = ['阿里云 OSS', '百度云 BOS', '华为云 OBS', '腾讯云 COS'] as const

export function MobileCloudSettingsView({
  back,
  mode,
  provider,
  testing,
  tested,
  endpoint,
  bucket,
  region,
  saving,
  setMode,
  setProvider,
  setEndpoint,
  setBucket,
  setRegion,
  test,
  save,
}: {
  back: () => void
  mode: 'local' | 'cloud'
  provider: (typeof providers)[number]
  testing: boolean
  tested: boolean
  endpoint: string
  bucket: string
  region: string
  saving: boolean
  setMode: (mode: 'local' | 'cloud') => void
  setProvider: (provider: (typeof providers)[number]) => void
  setEndpoint: (value: string) => void
  setBucket: (value: string) => void
  setRegion: (value: string) => void
  test: () => void
  save: () => void
}) {
  const inputClass = 'min-h-11 w-full rounded-[.8rem] border border-border bg-secondary px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60'
  const labelClass = 'grid gap-1.5 text-xs text-muted-foreground'
  const formTitle = (icon: React.ReactNode, title: string, subtitle: string) => <div className="flex items-center gap-3 border-b border-border pb-3"><span className="text-primary [&>svg]:size-6">{icon}</span><span className="grid gap-0.5"><strong className="text-sm text-foreground">{title}</strong><small className="text-xs text-muted-foreground">{subtitle}</small></span></div>

  return <div className="page detail-page flex min-h-full flex-col gap-3.5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(18.75rem,.36fr)_minmax(0,.64fr)] lg:content-start">
    <PageHeader title="数据存储" subtitle="配置采集数据的保存位置" back={back} />
    <section className="grid grid-cols-2 gap-2.5 lg:col-span-2">
      <ModeCard selected={mode === 'local'} icon={<HardDrive />} title="本地设备" subtitle="保存在当前设备" onClick={() => setMode('local')} />
      <ModeCard selected={mode === 'cloud'} icon={<Cloud />} title="对象存储" subtitle="上传至云端 Bucket" onClick={() => setMode('cloud')} />
    </section>
    {mode === 'local' ? <Card className="grid gap-3 p-4 shadow-none lg:col-span-2">{formTitle(<HardDrive />, '本地录制目录', '采集文件将首先写入本机')}<label className={labelClass}><span>录制目录</span><input className={inputClass} defaultValue="/data/recordings" /></label><label className={labelClass}><span>空间预警阈值</span><input className={inputClass} defaultValue="15%" /></label><div className="flex gap-2 rounded-[.8rem] bg-secondary p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />本地存储不依赖公网，空间不足时将提前提醒。</div></Card> : <>
      <Card className="grid gap-3 p-4 shadow-none lg:self-start"><span className="text-xs text-muted-foreground">选择云服务商</span><div className="grid grid-cols-2 gap-2">{providers.map(item => <button key={item} className={cn('relative grid min-h-20 justify-items-start gap-2 rounded-lg border border-border bg-secondary p-3 text-left text-sm text-foreground', provider === item && 'border-primary text-primary')} onClick={() => setProvider(item)}><ServerCog className="size-5" /><strong>{item}</strong>{provider === item && <Check className="absolute right-2.5 top-2.5 size-4" />}</button>)}</div></Card>
      <Card className="grid gap-3 p-4 shadow-none">{formTitle(<KeyRound />, `${provider} 凭证`, '连接参数同步到管理后台')}<label className={labelClass}><span>Endpoint</span><input className={inputClass} value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://endpoint.example.com" /></label><label className={labelClass}><span>Bucket</span><input className={inputClass} value={bucket} onChange={event => setBucket(event.target.value)} placeholder="sensorhub-dataset" /></label><label className={labelClass}><span>区域 Region</span><input className={inputClass} value={region} onChange={event => setRegion(event.target.value)} placeholder="cn-east-3" /></label><label className={labelClass}><span>Access Key</span><input className={inputClass} autoComplete="off" placeholder="接口启用后填写" disabled /></label><label className={labelClass}><span>Secret Key</span><input className={inputClass} type="password" autoComplete="new-password" placeholder="接口启用后填写" disabled /></label>{tested && <div className="flex gap-2 rounded-[.8rem] bg-primary/8 p-3 text-xs leading-5 text-primary"><Check className="size-4 shrink-0" />字段格式检查通过；真实连通性取决于云服务接口。</div>}</Card>
      <Card className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-30 grid grid-cols-[1fr_1.4fr] gap-2 rounded-[1.1rem] bg-card/95 p-2 backdrop-blur-xl"><Button onClick={test}>{testing ? '检查中…' : '测试配置'}</Button><Button variant="default" disabled={saving || !endpoint || !bucket} onClick={save}>{saving ? '保存中…' : '保存配置'}<ChevronRight className="size-4" /></Button></Card>
    </>}
  </div>
}

function ModeCard({ selected, icon, title, subtitle, onClick }: { selected: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return <button className={cn('relative grid min-h-28 justify-items-start gap-2.5 rounded-[1.25rem] border border-border bg-card p-4 text-left text-foreground', selected && 'border-primary bg-primary/8')} onClick={onClick}><span className="text-primary [&>svg]:size-6">{icon}</span><span className="grid gap-1"><strong>{title}</strong><small className="text-xs text-muted-foreground">{subtitle}</small></span>{selected && <Check className="absolute right-3 top-3 size-4 text-primary" />}</button>
}
