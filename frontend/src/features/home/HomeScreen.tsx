import {
  Activity,
  Camera,
  ChevronRight,
  Cherry,
  Hand,
  Radio,
  ScanLine,
} from 'lucide-react'
import type { ScreenCommonProps } from '../../app/model'
import type { SelectableProduct } from '../../app/product'
import { PageHeader } from '../../shared/ui/DevicePrimitives'

export type ProductName = SelectableProduct | 'Cherry'

type DeviceCard = {
  id: string
  name: string
  summary: string
  disabled?: boolean
  icon: React.ReactNode
}

const PRODUCT_DEVICES: Record<SelectableProduct, DeviceCard[]> = {
  Banana: [
    { id: 'UMI_Fingers_L', name: '左指尖夹爪', summary: 'MKV · Y8 · IMU', icon: <ScanLine /> },
    { id: 'UMI_Fingers_R', name: '右指尖夹爪', summary: 'MKV · Y8 · IMU', icon: <ScanLine /> },
    { id: 'UMI_Grippers_L', name: '左板机夹爪', summary: '暂未开发', disabled: true, icon: <Radio /> },
    { id: 'UMI_Grippers_R', name: '右板机夹爪', summary: '暂未开发', disabled: true, icon: <Radio /> },
    { id: 'Ego_H', name: '头部 Ego', summary: 'MKV · Y8 · IMU', icon: <Camera /> },
    { id: 'Suits', name: '手套', summary: '暂未开发', disabled: true, icon: <Hand /> },
  ],
  Mango: [
    { id: 'Ego_H', name: '头部 Ego', summary: 'MKV · Y8 · IMU', icon: <Camera /> },
    { id: 'Ego_W_L', name: '左腕部 Ego', summary: 'MKV · Y8 · IMU', icon: <Activity /> },
    { id: 'Ego_W_R', name: '右腕部 Ego', summary: 'MKV · Y8 · IMU', icon: <Activity /> },
  ],
}

export function HomeScreen({ onSelectProduct }: { onSelectProduct: (product: SelectableProduct) => void }) {
  const products: Array<{ name: ProductName; note: string; disabled?: boolean }> = [
    { name: 'Banana', note: '指尖夹爪、板机夹爪、头部 Ego 与手套' },
    { name: 'Mango', note: '头部 Ego、左腕部 Ego 与右腕部 Ego' },
    { name: 'Cherry', note: '暂未开发', disabled: true },
  ]
  return (
    <div className="page home-screen">
      <PageHeader title="产品选择" subtitle="请选择本次采集使用的产品" />
      <section className="product-selection card" aria-label="产品选择">
        <div className="product-selection-heading"><span className="eyebrow">PRODUCTS</span><h2>选择产品</h2></div>
        <div className="product-grid" role="list">
          {products.map(product => (
            <div key={product.name} role="listitem">
            <button
              className={`product-card ${product.disabled ? 'is-disabled' : ''}`}
              disabled={product.disabled}
              onClick={() => !product.disabled && onSelectProduct(product.name as SelectableProduct)}
            >
              <span className="product-card-icon">{product.name === 'Cherry' ? <Cherry /> : product.name === 'Banana' ? <ScanLine /> : <Activity />}</span>
              <span className="product-card-copy"><strong>{product.name}</strong><small title={product.note}>{product.note}</small></span>
              <em>{product.disabled ? '未开发' : '进入套件'}<ChevronRight /></em>
            </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ProductKitScreen({ product, back, go }: { product: SelectableProduct; back: () => void; go: ScreenCommonProps['go'] }) {
  const devices = PRODUCT_DEVICES[product]
  return (
    <div className="page detail-page home-screen">
      <PageHeader title="设备与套件" subtitle={`${product} · ${devices.length} 个设备`} back={back} action={<button className="primary-button" onClick={() => go('data')}>进入数据页<ChevronRight /></button>} />
      <section className="device-kit-panel card">
        <div className="device-kit-grid local-scroll" role="list" aria-label={`${product} 设备与套件列表`}>
          {devices.map(device => <article key={device.id} className={`device-kit-card ${device.disabled ? 'is-disabled' : ''}`} data-testid={`device-${device.id}`} role="listitem" aria-disabled={device.disabled ? 'true' : 'false'}>
            <span className="device-kit-icon">{device.icon}</span>
            <div className="device-kit-copy"><h3>{device.name}</h3><p>{device.id}</p></div>
            <small className="device-kit-summary">{device.summary}</small>
            <span className={`device-kit-state ${device.disabled ? '' : 'ready'}`}>{device.disabled ? '未开发' : '可用'}</span>
          </article>)}
        </div>
      </section>
    </div>
  )
}
