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
  | 'cloud-settings'
  | 'help-feedback'
  | 'suite-guide'
  | 'diagnostics'

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
  'cloud-settings',
  'help-feedback',
  'suite-guide',
  'diagnostics',
]
const HOME_VIEWS: View[] = ['marketplace', 'featured', 'product-kit']

export const tabForView = (view: View): MainTab => {
  if (DATA_VIEWS.includes(view)) return 'data'
  if (PROFILE_VIEWS.includes(view)) return 'profile'
  if (HOME_VIEWS.includes(view)) return 'home'
  return view as MainTab
}

export const VIEW_PATHS: Record<View, string> = {
  home: '/',
  data: '/data',
  records: '/records',
  profile: '/profile',
  camera: '/data/camera',
  gripper: '/data/gripper',
  'task-claim': '/data/tasks/claim',
  capture: '/data/capture',
  'device-list': '/profile/devices',
  'device-type': '/profile/devices/types',
  'qr-scan': '/profile/devices/scan',
  'add-device': '/profile/devices/add',
  'device-info': '/profile/devices/info',
  wifi: '/profile/wifi',
  bluetooth: '/profile/bluetooth',
  settings: '/profile/settings',
  about: '/profile/about',
  marketplace: '/marketplace',
  featured: '/featured',
  'package-download': '/profile/update',
  account: '/profile/account',
  'product-kit': '/products/current',
  'cloud-settings': '/profile/settings/storage',
  'help-feedback': '/profile/help',
  'suite-guide': '/profile/guide',
  diagnostics: '/profile/diagnostics',
}

const PATH_VIEWS = new Map(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as View]))

export function viewForPath(pathname: string): View {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return PATH_VIEWS.get(normalized) ?? 'home'
}

export const pathForView = (view: View) => VIEW_PATHS[view]
