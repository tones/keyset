import { useState, useRef, useEffect, useCallback } from 'react'

const CLOSE_DELAY = 500 // ms

/**
 * Hook for popover open/close with:
 * - Timer-based close on mouse leave (desktop)
 * - Click-outside close (touch/iPad)
 */
export function usePopover() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggle = useCallback(() => setOpen(prev => !prev), [])
  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])

  const onMouseLeave = useCallback(() => {
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }, [])

  const onMouseEnter = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  // Click-outside to close (for touch devices)
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return { open, toggle, show, hide, containerRef, onMouseLeave, onMouseEnter }
}
