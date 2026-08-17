import type { SelectableProduct } from '../../app/product'
import type { RecordStatus } from '../../services/deviceApi'

export type ProductDeviceId =
  | 'UMI_Fingers_L'
  | 'UMI_Fingers_R'
  | 'UMI_Grippers_L'
  | 'UMI_Grippers_R'
  | 'Ego_H'
  | 'Ego_W_L'
  | 'Ego_W_R'
  | 'Suits'

export type ProductDeviceStatus = {
  id: ProductDeviceId
  name: string
  states: Array<[string, boolean]>
  unavailable?: boolean
}

export function cameraIsOnline(record: RecordStatus, keys: string[]) {
  return keys.some((key) => Boolean(record.cameras?.[key]))
}

export function getSideCameraChannels(
  product: SelectableProduct,
  states: { leftHand: boolean; rightHand: boolean; leftWrist: boolean; rightWrist: boolean },
) {
  return product === 'Mango'
    ? [
        { label: '左腕部单目', online: states.leftWrist },
        { label: '右腕部单目', online: states.rightWrist },
      ]
    : [
        { label: '左手双目', online: states.leftHand },
        { label: '右手双目', online: states.rightHand },
      ]
}
