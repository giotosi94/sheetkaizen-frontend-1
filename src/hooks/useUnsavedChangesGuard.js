import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function useUnsavedChangesGuard({
  when,
  onSave,
}) {
  const navigate = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)
  const [saving, setSaving] = useState(false)

  const pendingNavigationRef = useRef(null)
  const backGuardActiveRef = useRef(false)
  const ignoreNextPopStateRef = useRef(false)
  const whenRef = useRef(when)

  useEffect(() => {
    whenRef.current = when
  }, [when])

  const clearPendingNavigation = useCallback(() => {
    pendingNavigationRef.current = null
    setShowPrompt(false)
  }, [])

  const performPendingNavigation = useCallback(() => {
    const pendingNavigation = pendingNavigationRef.current

    pendingNavigationRef.current = null
    setShowPrompt(false)

    if (!pendingNavigation) return

    if (pendingNavigation.type === 'back') {
      ignoreNextPopStateRef.current = true
      window.history.go(-2)
      return
    }

    if (pendingNavigation.type === 'navigate') {
      navigate(pendingNavigation.to)
      return
    }

    if (pendingNavigation.type === 'external') {
      window.location.href = pendingNavigation.to
    }
  }, [navigate])

  const stay = useCallback(() => {
    clearPendingNavigation()
  }, [clearPendingNavigation])

  const discardAndContinue = useCallback(() => {
    performPendingNavigation()
  }, [performPendingNavigation])

  const saveAndContinue = useCallback(async () => {
    if (saving) return

    setSaving(true)

    try {
      const saved = await onSave()

      if (saved === false) return

      performPendingNavigation()
    } catch (error) {
      console.error('Errore salvataggio prima della navigazione:', error)
    } finally {
      setSaving(false)
    }
  }, [onSave, performPendingNavigation, saving])

  useEffect(() => {
    if (!when) {
      backGuardActiveRef.current = false
      return undefined
    }

    if (!backGuardActiveRef.current) {
      window.history.pushState(
        {
          ...window.history.state,
          unsavedChangesGuard: true,
        },
        '',
        window.location.href
      )

      backGuardActiveRef.current = true
    }

    const handlePopState = () => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false
        return
      }

      if (!whenRef.current) return

      pendingNavigationRef.current = {
        type: 'back',
      }

      setShowPrompt(true)

      window.history.go(1)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [when])

  useEffect(() => {
    if (!when) return undefined

    const handleDocumentClick = event => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = event.target.closest('a')

      if (!anchor) return

      const href = anchor.getAttribute('href')

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.hasAttribute('download') ||
        anchor.target === '_blank'
      ) {
        return
      }

      const destination = new URL(
        anchor.href,
        window.location.origin
      )

      const currentUrl = new URL(
        window.location.href
      )

      if (
        destination.pathname === currentUrl.pathname &&
        destination.search === currentUrl.search &&
        destination.hash === currentUrl.hash
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (destination.origin === window.location.origin) {
        pendingNavigationRef.current = {
          type: 'navigate',
          to:
            destination.pathname +
            destination.search +
            destination.hash,
        }
      } else {
        pendingNavigationRef.current = {
          type: 'external',
          to: destination.href,
        }
      }

      setShowPrompt(true)
    }

    document.addEventListener(
      'click',
      handleDocumentClick,
      true
    )

    return () => {
      document.removeEventListener(
        'click',
        handleDocumentClick,
        true
      )
    }
  }, [when])

  useEffect(() => {
    if (!when) return undefined

    const handleBeforeUnload = event => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    )

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      )
    }
  }, [when])

  return {
    showPrompt,
    saving,
    saveAndContinue,
    discardAndContinue,
    stay,
  }
}
