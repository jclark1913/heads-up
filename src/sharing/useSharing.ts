import { useEffect, useRef, useState } from 'react'
import type { CustomBank } from '../content/decks'
export type ShareRequest = { opener?: HTMLElement } & (
  { kind: 'send'; bank: CustomBank } | { kind: 'receive'; link?: string }
)
export function useSharing(scene: string) {
  const [request, setRequest] = useState<ShareRequest | null>(null)
  const pending = useRef<string | null>(null)
  useEffect(() => {
    let active = true
    const offer = () => {
      if (
        !active ||
        scene === 'game' ||
        request ||
        !pending.current ||
        document.querySelector('dialog[open]')
      )
        return
      const link = pending.current
      pending.current = null
      setRequest({ kind: 'receive', link })
    }
    const capture = () => {
      if (!active) return
      if (location.hash.startsWith('#deck=')) {
        pending.current = location.href
        history.replaceState(
          history.state,
          '',
          location.pathname + location.search,
        )
      }
      offer()
    }
    // Defer while a round or another dialog holds focus, preserving unsaved drafts.
    const observer = new MutationObserver(offer)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
      subtree: true,
    })
    window.addEventListener('hashchange', capture)
    window.addEventListener('popstate', capture)
    queueMicrotask(capture)
    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('hashchange', capture)
      window.removeEventListener('popstate', capture)
    }
  }, [scene, request])
  return { request, setRequest }
}
