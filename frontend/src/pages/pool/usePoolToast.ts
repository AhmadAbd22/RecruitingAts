import { useCallback, useEffect, useRef, useState } from 'react'

export type PoolToastMessage = {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

export function usePoolToast() {
  const [toast, setToast] = useState<PoolToastMessage | null>(null)
  const nextId = useRef(0)

  const notify = useCallback((message: string, tone: PoolToastMessage['tone'] = 'success') => {
    setToast({ id: ++nextId.current, message, tone })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, 5000)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  return { toast, notify, dismissToast }
}
