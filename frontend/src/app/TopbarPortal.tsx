import { createContext, useContext } from 'react'

export type TopbarPortalTargets = {
  heading: HTMLDivElement | null
  action: HTMLDivElement | null
}

export const TopbarPortalContext = createContext<TopbarPortalTargets>({
  heading: null,
  action: null,
})

export function useTopbarPortal() {
  return useContext(TopbarPortalContext)
}
