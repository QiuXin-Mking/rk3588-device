import { Activity, Camera, Cherry, Hand, Radio, ScanLine } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SelectableProduct } from '../../app/product'

export type ProductName = SelectableProduct | 'Cherry'

export type DeviceCard = {
  id: string
  name: string
  summary: string
  disabled?: boolean
  icon: ReactNode
}

export const PRODUCTS: Array<{ name: ProductName; note: string; disabled?: boolean; icon: ReactNode }> = [
  { name: 'Banana', note: '指尖夹爪、板机夹爪、头部 Ego 与手套', icon: <ScanLine /> },
  { name: 'Mango', note: '头部 Ego、左腕部 Ego 与右腕部 Ego', icon: <Activity /> },
  { name: 'Cherry', note: '暂未开发', disabled: true, icon: <Cherry /> },
]

export const PRODUCT_TONES: Record<ProductName, { card: string; icon: string; accent: string }> = {
  Banana: {
    card: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    icon: 'bg-amber-500/15 text-amber-500',
    accent: 'text-amber-500',
  },
  Mango: {
    card: 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10',
    icon: 'bg-sky-500/15 text-sky-500',
    accent: 'text-sky-500',
  },
  Cherry: {
    card: 'border-rose-500/25 bg-rose-500/5',
    icon: 'bg-rose-500/15 text-rose-500',
    accent: 'text-rose-500',
  },
}

export function deviceTone(id: string) {
  if (id.startsWith('UMI_Fingers')) return 'bg-amber-500/15 text-amber-500'
  if (id.startsWith('UMI_Grippers')) return 'bg-rose-500/15 text-rose-500'
  if (id.startsWith('Ego_W')) return 'bg-violet-500/15 text-violet-500'
  if (id === 'Suits') return 'bg-emerald-500/15 text-emerald-500'
  return 'bg-sky-500/15 text-sky-500'
}

export const PRODUCT_DEVICES: Record<SelectableProduct, DeviceCard[]> = {
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
