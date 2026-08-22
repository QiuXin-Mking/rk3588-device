export type MainTab = 'tasks' | 'capture' | 'records' | 'profile'

export type View =
  | MainTab
  | 'device-list'
  | 'device-info'
  | 'wifi'
  | 'bluetooth'
  | 'settings'
  | 'about'
  | 'marketplace'
  | 'featured'
  | 'package-download'
  | 'account'
  | 'cloud-settings'
  | 'help-feedback'
  | 'suite-guide'
  | 'diagnostics'

const PROFILE_VIEWS: View[] = [
  'device-list',
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
const PROFILE_EXTENSION_VIEWS: View[] = ['marketplace', 'featured']

export const tabForView = (view: View): MainTab => {
  if (PROFILE_VIEWS.includes(view)) return 'profile'
  if (PROFILE_EXTENSION_VIEWS.includes(view)) return 'profile'
  return view as MainTab
}

export const VIEW_PATHS: Record<View, string> = {
  tasks: '/',
  capture: '/capture',
  records: '/records',
  profile: '/profile',
  'device-list': '/profile/devices',
  'device-info': '/profile/devices/info',
  wifi: '/profile/wifi',
  bluetooth: '/profile/bluetooth',
  settings: '/profile/settings',
  about: '/profile/about',
  marketplace: '/marketplace',
  featured: '/featured',
  'package-download': '/profile/update',
  account: '/profile/account',
  'cloud-settings': '/profile/settings/storage',
  'help-feedback': '/profile/help',
  'suite-guide': '/profile/guide',
  diagnostics: '/profile/diagnostics',
}

const PATH_VIEWS = new Map(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as View]))

export function viewForPath(pathname: string): View {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return PATH_VIEWS.get(normalized) ?? 'tasks'
}

export const pathForView = (view: View) => VIEW_PATHS[view]
