import { useState, useRef } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ msg: '', visible: false })
  const timer = useRef(null)

  const showToast = (msg) => {
    setToast({ msg, visible: true })
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      2600
    )
  }

  return { toast, showToast }
}
