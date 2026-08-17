export type UiMode = 'device' | 'mobile'

function configuredMode(): UiMode | 'auto' {
  const query = new URLSearchParams(window.location.search).get('ui')
  if (query === 'device' || query === 'mobile') return query
  const configured = import.meta.env.VITE_UI_MODE
  return configured === 'device' || configured === 'mobile' ? configured : 'auto'
}

export function resolveUiMode(width = window.innerWidth, height = window.innerHeight): UiMode {
  const configured = configuredMode()
  if (configured !== 'auto') return configured
  // Auto mode exists for local development only. Production builds select a
  // platform explicitly through `.env.device` or `.env.mobile`, so rotating a
  // terminal never turns it into the mobile product by accident.
  return width >= 1280 && width > height ? 'device' : 'mobile'
}
