export type MainTab = 'home' | 'data' | 'records' | 'profile'

export type View =
  | MainTab
  | 'camera'
  | 'gripper'
  | 'task-claim'
  | 'capture'
  | 'device-list'
  | 'device-type'
  | 'qr-scan'
  | 'add-device'
  | 'device-info'
  | 'wifi'
  | 'bluetooth'
  | 'settings'
  | 'about'
  | 'marketplace'
  | 'featured'
  | 'package-download'
  | 'account'
  | 'product-kit'

const DATA_VIEWS: View[] = ['camera', 'gripper', 'task-claim', 'capture']
const PROFILE_VIEWS: View[] = [
  'device-list',
  'device-type',
  'qr-scan',
  'add-device',
  'device-info',
  'wifi',
  'bluetooth',
  'settings',
  'about',
  'package-download',
  'account',
]
const HOME_VIEWS: View[] = ['marketplace', 'featured', 'product-kit']

export const tabForView = (view: View): MainTab => {
  if (DATA_VIEWS.includes(view)) return 'data'
  if (PROFILE_VIEWS.includes(view)) return 'profile'
  if (HOME_VIEWS.includes(view)) return 'home'
  return view as MainTab
}
