import { Camera, Hand, Radio, Wrench, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { RecordStatus } from '../../services/deviceApi'
import { Badge } from '@/components/ui/badge'
import { useUiMode } from '../../app/uiModeContext'

export type DataLabel = 'MKV' | 'Y8' | 'IMU' | 'Encoder' | 'Tracker'

export type DeviceSuite = {
  id: string
  name: string
  subtitle: string
  icon: ReactNode
  dataLabels: DataLabel[]
  cameraKey: string | null
  altConnected?: (record: RecordStatus) => boolean
}

export const DEVICE_SUITES: DeviceSuite[] = [
  { id: 'ego_h', name: 'Ego_H', subtitle: '头部Ego', icon: <Camera size={20} />, dataLabels: ['MKV', 'Y8', 'IMU'], cameraKey: 'jhh2_left' },
  { id: 'ego_w', name: 'Ego_W', subtitle: '腕部Ego', icon: <Radio size={20} />, dataLabels: ['MKV', 'Y8', 'IMU'], cameraKey: 'jhh2_right' },
  { id: 'umi_fingers', name: 'UMI_Fingers', subtitle: '指尖夹爪', icon: <Zap size={20} />, dataLabels: ['MKV', 'Y8', 'IMU'], cameraKey: 'jhh02' },
  { id: 'umi_grippers', name: 'UMI_Grippers', subtitle: '板机夹爪', icon: <Wrench size={20} />, dataLabels: [], cameraKey: null },
  { id: 'suits', name: 'Suits', subtitle: '手套', icon: <Hand size={20} />, dataLabels: [], cameraKey: null, altConnected: (record) => Boolean(record.gloveSides?.left || record.gloveSides?.right) },
]

export function isDeviceConnected(device: DeviceSuite, record: RecordStatus) {
  if (device.altConnected) return device.altConnected(record)
  if (device.cameraKey && record.cameras) return Boolean(record.cameras[device.cameraKey])
  return false
}

export function DataBadge({ label }: { label: DataLabel }) {
  const mode = useUiMode()
  return <Badge size={mode === 'device' ? 'device' : 'default'} variant="outline">{label}</Badge>
}
