import { CheckCircle2, ChevronRight, CircleUserRound, Mail, MapPin, Pencil, Phone, ShieldCheck } from 'lucide-react'
import type { Notify } from '../../../app/model'
import { Button } from '@/components/ui/button'
import { PageHeader } from '../../../shared/ui/DevicePrimitives'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function MobileAccountView({
  back,
  notify,
  editing,
  role,
  setEditing,
  setRole,
}: {
  back: () => void
  notify: Notify
  editing: boolean
  role: string
  setEditing: (value: boolean) => void
  setRole: (value: string) => void
}) {
  const fieldClass = 'grid gap-1.5 text-xs text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&_svg]:size-3.5 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-[.8rem] [&_input]:border [&_input]:border-border [&_input]:bg-secondary [&_input]:px-3 [&_input]:text-sm [&_input]:text-foreground [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-[.8rem] [&_select]:border [&_select]:border-border [&_select]:bg-secondary [&_select]:px-3 [&_select]:text-sm [&_select]:text-foreground disabled:[&_input]:opacity-70 disabled:[&_select]:opacity-70'

  return <div className="page detail-page flex min-h-full flex-col gap-3.5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(18.75rem,.42fr)_minmax(0,.58fr)] lg:content-start">
    <PageHeader title="个人资料" subtitle="账户身份与采集信息" back={back} />
    <Card className="grid justify-items-center bg-card p-5 text-center"><div className="grid size-[4.25rem] place-items-center rounded-[1.4rem] bg-primary/12 text-primary"><CircleUserRound className="size-10" /></div><h2 className="mt-3 text-xl font-bold">设备操作员</h2><p className="mt-1 text-sm text-muted-foreground">{role} · 本地离线账户</p><Badge className="mt-2.5" variant="default"><CheckCircle2 className="size-3.5" />本地可用</Badge><button className="mt-2 inline-flex min-h-11 items-center gap-1.5 border-0 bg-transparent px-2 text-sm font-semibold text-primary" onClick={() => setEditing(!editing)}><Pencil className="size-4" />{editing ? '取消编辑' : '编辑资料'}</button></Card>
    <Card className="p-4 shadow-none"><div className="flex justify-between text-sm"><span>资料完整度</span><strong>70%</strong></div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary"><i className="block h-full w-[70%] rounded-full bg-primary" /></div><p className="mt-2.5 text-xs leading-5 text-muted-foreground">补充手机号、公司和身高，便于生成完整采集档案。</p></Card>
    <Card className="grid gap-3 p-4 shadow-none lg:col-start-2 lg:row-span-3 lg:row-start-1">
      <label className={fieldClass}><span>昵称</span><input defaultValue="设备操作员" disabled={!editing} /></label>
      <label className={fieldClass}><span>账号角色</span><select value={role} onChange={event => setRole(event.target.value)} disabled={!editing}><option>采集员</option><option>管理员</option><option>审核员</option></select></label>
      <label className={fieldClass}><span><Phone />手机号</span><input placeholder="未绑定" disabled={!editing} /></label>
      <label className={fieldClass}><span><Mail />邮箱</span><input defaultValue="admin@gmail.com" disabled={!editing} /></label>
      <label className={fieldClass}><span><MapPin />工作地区</span><input defaultValue="上海市" disabled={!editing} /></label>
      <label className={fieldClass}><span>所属公司</span><input placeholder="未设置" disabled={!editing} /></label>
      <label className={fieldClass}><span>工作模式</span><select disabled={!editing}><option>标准采集</option><option>质检模式</option></select></label>
      <label className={fieldClass}><span>设备序列号</span><input defaultValue="RK3588-LOCAL" disabled /></label>
    </Card>
    <Card className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.25rem] p-4 shadow-none"><ShieldCheck className="size-6 text-primary" /><span className="grid gap-0.5"><strong className="text-sm">账户与安全</strong><small className="text-xs text-muted-foreground">云端登录、手机号与密码</small></span><button className="inline-flex min-h-11 items-center border-0 bg-transparent px-2 text-sm font-semibold text-primary" onClick={() => notify('账户安全接口待接入')}>管理<ChevronRight className="size-4" /></button></Card>
    <Card className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-30 grid grid-cols-[1fr_1.3fr] gap-2 rounded-[1.1rem] bg-card/95 p-2 backdrop-blur-xl has-[>button:only-child]:grid-cols-1">{editing ? <Button variant="default" onClick={() => { setEditing(false); notify('个人资料已保存在当前页面，账号接口待接入') }}>保存资料</Button> : <><Button onClick={() => notify('已保持离线登录状态')}>继续离线使用</Button><Button variant="default" onClick={() => notify('云端登录接口待接入；离线账户仍可使用')}>登录云端账户</Button></>}</Card>
  </div>
}
