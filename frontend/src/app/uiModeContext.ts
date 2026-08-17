import { createContext, useContext } from 'react'
import type { UiMode } from './viewportMode'

export const UiModeContext = createContext<UiMode>('device')

export const useUiMode = () => useContext(UiModeContext)
