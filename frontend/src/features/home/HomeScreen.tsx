import {
  Activity,
  ChevronRight,
  CloudUpload,
  Hand,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
import type { ScreenCommonProps } from '../../app/model'
import { PageHeader } from '../../shared/ui/DevicePrimitives'

export function HomeScreen({ go }: ScreenCommonProps) {
  return (
    <div className="page home-screen">
      <PageHeader
        title="SensorHub"
        subtitle="智能穿戴数据采集终端"
      />
      <div className="home-workspace">
        <section className="home-hero card">
          <div>
            <span className="eyebrow">COLLECTION SYSTEM</span>
            <h2>准备开始采集</h2>
            <p>在同一个界面检查设备、领取任务并开始录制。</p>
          </div>
          <button className="primary-button hero-action" onClick={() => go('data')}>
            进入实时数据
            <ChevronRight />
          </button>
          <div className="hero-orbit">
            <div className="orbit-core"><Activity /></div>
            <span className="orbit-dot one" />
            <span className="orbit-dot two" />
            <span className="orbit-dot three" />
          </div>
        </section>

        <section className="home-products card">
          <header>
            <div>
              <span className="eyebrow">DEVICE</span>
              <h2>设备与套件</h2>
            </div>
            <button className="section-link" onClick={() => go('marketplace')}>查看全部 <ChevronRight /></button>
          </header>
          <div className="product-grid">
            <ProductCard name="HSuit" meta="手部动作捕捉" icon={<Hand />} />
            <ProductCard name="iSuit" meta="多传感器采集" icon={<Activity />} />
          </div>
        </section>

        <section className="home-capabilities card">
          <Capability icon={<ShieldCheck />} title="状态检查" note="设备数据完整性" />
          <Capability icon={<PackageCheck />} title="精选内容" note="查看采集指南" onClick={() => go('featured')} />
          <Capability icon={<CloudUpload />} title="数据上报" note="云端接口预留" />
        </section>
      </div>
    </div>
  )
}

function ProductCard({
  name,
  meta,
  icon,
}: {
  name: string
  meta: string
  icon: React.ReactNode
}) {
  return (
    <article className="product-card">
      <div className="product-visual">{icon}</div>
      <div>
        <h3>{name}</h3>
        <p>{meta}</p>
      </div>
    </article>
  )
}

function Capability({
  icon,
  title,
  note,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  note: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{note}</small>
      </div>
    </>
  )
  return onClick
    ? <button className="capability-item" onClick={onClick}>{content}</button>
    : <div className="capability-item">{content}</div>
}
