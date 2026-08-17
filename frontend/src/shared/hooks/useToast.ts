import { useCallback } from 'react'
import { toast } from 'sonner'

export function useToast() {
  const notify = useCallback((message: string) => {
    toast(message)
  }, [])

  return { toast: '', notify }
}
