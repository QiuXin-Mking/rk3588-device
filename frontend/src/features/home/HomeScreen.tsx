import { ChevronRight } from 'lucide-react'
import { useUiMode } from '../../app/uiModeContext'
import type { ScreenCommonProps } from '../../app/model'
import type { SelectableProduct } from '../../app/product'
import { PageHeader } from '../../shared/ui/DevicePrimitives'
import { cn } from '../../shared/lib/cn'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deviceTone, PRODUCT_DEVICES, PRODUCTS, PRODUCT_TONES } from './homeModel'
import { MobileProductKit, MobileProductSelection } from './mobile/MobileHomeViews'

export function HomeScreen({ onSelectProduct }: { onSelectProduct: (product: SelectableProduct) => void }) {
  const mode = useUiMode()
  if (mode === 'mobile') return <MobileProductSelection onSelectProduct={onSelectProduct} />
  return (
    <div className="page flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <PageHeader title="产品选择" subtitle="请选择本次采集使用的产品" />
      <Card className="flex min-h-0 flex-1 flex-col gap-6 p-[30px]" aria-label="产品选择">
        <div><span className="text-[length:var(--device-text-xs)] font-extrabold tracking-[2px] text-primary">PRODUCTS</span><h2 className="mt-1.5 text-[length:var(--device-text-xl)] font-bold">选择产品</h2></div>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-5" role="list">
          {PRODUCTS.map(product => (
            <div className="flex min-h-0 min-w-0" key={product.name} role="listitem">
            <button
              className={cn('flex h-full min-h-0 w-full flex-col items-stretch gap-4 rounded-xl border bg-card p-6 text-left text-card-foreground shadow-sm transition-colors', PRODUCT_TONES[product.name].card, product.disabled && 'cursor-not-allowed opacity-45')}
              disabled={product.disabled}
              onClick={() => !product.disabled && onSelectProduct(product.name as SelectableProduct)}
            >
              <span className={cn('grid size-[72px] shrink-0 place-items-center rounded-xl [&>svg]:size-[40px]', PRODUCT_TONES[product.name].icon)}>{product.icon}</span>
              <span className="min-w-0 overflow-hidden"><strong className="block text-[length:var(--device-text-md)] leading-tight">{product.name}</strong><small className="mt-2 block truncate text-[length:var(--device-text-xs)] leading-snug text-muted-foreground" title={product.note}>{product.note}</small></span>
              <em className={cn('mt-auto inline-flex items-center gap-2 self-start text-[length:var(--device-text-xs)] font-bold not-italic', PRODUCT_TONES[product.name].accent)}>{product.disabled ? '未开发' : '进入套件'}<ChevronRight className="size-6" /></em>
            </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function ProductKitScreen({ product, back, go }: { product: SelectableProduct; back: () => void; go: ScreenCommonProps['go'] }) {
  const mode = useUiMode()
  const devices = PRODUCT_DEVICES[product]
  if (mode === 'mobile') return <MobileProductKit product={product} devices={devices} back={back} enter={() => go('data')} />
  return (
    <div className="page detail-page flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <PageHeader title="设备与套件" subtitle={`${product} · ${devices.length} 个设备`} back={back} action={<Button size="device-compact" onClick={() => go('data')}>进入数据页<ChevronRight data-icon="inline-end" /></Button>} />
      <Card className="flex min-h-0 flex-1 flex-col gap-5 p-7">
        <div className="local-scroll flex min-h-0 flex-1 flex-col gap-2.5 pr-2" role="list" aria-label={`${product} 设备与套件列表`}>
          {devices.map(device => <article key={device.id} className={cn('grid min-h-[92px] shrink-0 grid-cols-[64px_minmax(210px,.7fr)_minmax(220px,1fr)_100px] items-center gap-5 rounded-xl border border-border bg-card px-[18px] py-[13px] shadow-sm', device.disabled && 'grayscale opacity-60')} data-testid={`device-${device.id}`} role="listitem" aria-disabled={device.disabled ? 'true' : 'false'}>
            <span className={cn('grid size-[64px] place-items-center rounded-lg [&>svg]:size-9', deviceTone(device.id))}>{device.icon}</span>
            <div className="min-w-0"><h3 className="truncate text-[length:var(--device-text-sm)] font-bold leading-tight">{device.name}</h3><p className="mt-1 truncate text-[length:var(--device-text-xs)] tracking-[.02em] text-muted-foreground">{device.id}</p></div>
            <small className="truncate text-[length:var(--device-text-xs)] text-muted-foreground">{device.summary}</small>
            <Badge className="justify-self-end" size="device" variant={device.disabled ? 'secondary' : 'default'}>{device.disabled ? '未开发' : '可用'}</Badge>
          </article>)}
        </div>
      </Card>
    </div>
  )
}
