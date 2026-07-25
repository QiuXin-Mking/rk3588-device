import {
  Activity,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Hand,
  Package,
  Play,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { Notify } from '../../app/model'
import { PageHeader } from '../../shared/ui/DevicePrimitives'

export function MarketplaceScreen({ back }: { back: () => void }) {
  return (
    <div className="page detail-page expansion-screen">
      <PageHeader title="设备商城" subtitle="设备与采集套件" back={back} />
      <div className="catalog-grid">
        <CatalogCard
          icon={<Hand />}
          name="HSuit"
          description="轻量化手部动作捕捉套件"
          tags={['手部追踪', '无线连接', '任务采集']}
        />
        <CatalogCard
          icon={<Activity />}
          name="iSuit"
          description="相机、手套与多传感器一体化采集套件"
          tags={['双目相机', '多传感器', '本地记录']}
        />
      </div>
      <div className="placeholder-panel expansion-note">
        <Package />
        <span>商城下单、价格和库存接口待接入</span>
      </div>
    </div>
  )
}

function CatalogCard({
  icon,
  name,
  description,
  tags,
}: {
  icon: React.ReactNode
  name: string
  description: string
  tags: string[]
}) {
  return (
    <section className="catalog-card card">
      <div className="catalog-visual">{icon}</div>
      <div>
        <span className="eyebrow">SENSORHUB DEVICE</span>
        <h2>{name}</h2>
        <p>{description}</p>
        <div className="stream-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
      <span className="placeholder-chip">展示位</span>
    </section>
  )
}

export function FeaturedScreen({ back, notify }: { back: () => void; notify: Notify }) {
  return (
    <div className="page detail-page expansion-screen">
      <PageHeader title="精选内容" subtitle="采集指南与推荐任务" back={back} />
      <div className="featured-grid">
        <section className="featured-primary card">
          <span className="featured-play"><Play /></span>
          <div>
            <span className="eyebrow">GETTING STARTED</span>
            <h2>第一次使用 SensorHub</h2>
            <p>了解设备检查、任务领取、相机预览和数据录制的完整流程。</p>
          </div>
          <button className="primary-button" onClick={() => notify('内容播放接口待接入')}>播放内容</button>
        </section>
        <section className="featured-list card">
          <FeatureRow icon={<ShieldCheck />} title="采集前检查" note="确认相机、手套、存储和电量" />
          <FeatureRow icon={<Activity />} title="高质量动作数据" note="保持目标物体处于相机视野内" />
          <FeatureRow icon={<CloudUpload />} title="数据整理与上报" note="完成解码、传输和云端同步" />
        </section>
      </div>
    </div>
  )
}

function FeatureRow({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <div className="feature-row">
      <span>{icon}</span>
      <div><strong>{title}</strong><small>{note}</small></div>
    </div>
  )
}

export function PackageDownloadScreen({ back, notify }: { back: () => void; notify: Notify }) {
  return (
    <div className="page detail-page expansion-screen">
      <PageHeader title="大包下载" subtitle="设备软件与离线资源" back={back} />
      <div className="package-workspace">
        <section className="package-current card">
          <span className="menu-icon blue"><CheckCircle2 /></span>
          <div>
            <span className="eyebrow">CURRENT VERSION</span>
            <h2>设备软件包</h2>
            <p>当前版本信息需要升级服务接口支持。</p>
          </div>
          <span className="placeholder-chip">版本待检测</span>
        </section>
        <section className="package-download card">
          <CloudDownload />
          <div><h2>检查可用更新</h2><p>下载、校验和安装流程均已预留界面位置。</p></div>
          <button className="primary-button" onClick={() => notify('大包下载接口待接入')}>检查更新</button>
        </section>
      </div>
    </div>
  )
}

export function AccountScreen({ back, notify }: { back: () => void; notify: Notify }) {
  return (
    <div className="page detail-page expansion-screen">
      <PageHeader title="账户" subtitle="本地操作员与云端账户" back={back} />
      <div className="account-workspace">
        <section className="account-card card">
          <div className="account-avatar"><UserRound /></div>
          <div><span className="eyebrow">LOCAL OPERATOR</span><h2>设备操作员</h2><p>当前以本地离线身份使用设备。</p></div>
          <span className="live-badge online"><span className="status-dot" />本地可用</span>
        </section>
        <section className="account-actions card">
          <h2>云端账户</h2>
          <p>登录后可同步任务、上传记录和访问服务支持。</p>
          <button className="primary-button" onClick={() => notify('账户登录接口待接入')}>登录云端账户</button>
          <button className="secondary-button" onClick={() => notify('账户注册接口待接入')}>注册账户</button>
        </section>
      </div>
    </div>
  )
}
