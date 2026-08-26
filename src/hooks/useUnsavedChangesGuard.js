import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { UNSAFE_NavigationContext } from 'react-router-dom'

export default function useUnsavedChangesGuard({
  when,
  onSave,
}) {
  const { navigator } = useContext(UNSAFE_NavigationContext)
  const [showPrompt, setShowPrompt] = useState(false)
  const [saving, setSaving] = useState(false)
  const transitionRef = useRef(null)

  const closePrompt = useCallback(() => {
    transitionRef.current = null
    setShowPrompt(false)
  }, [])

  const stay = useCallback(() => {
    closePrompt()
  }, [closePrompt])

  const discardAndContinue = useCallback(() => {
    const transition = transitionRef.current

    transitionRef.current = null
    setShowPrompt(false)

    transition?.retry()
  }, [])

  const saveAndContinue = useCallback(async () => {
    if (saving) return

    setSaving(true)

    try {
      const saved = await onSave()

      if (saved === false) return

      const transition = transitionRef.current

      transitionRef.current = null
      setShowPrompt(false)

      transition?.retry()
    } finally {
      setSaving(false)
    }
  }, [onSave, saving])

  useEffect(() => {
    if (!when) return undefined
    if (!navigator?.block) return undefined

    const unblock = navigator.block(transition => {
      transitionRef.current = {
        ...transition,
        retry() {
          unblock()
          transition.retry()
        },
      }

      setShowPrompt(true)
    })

    return unblock
  }, [navigator, when])

  useEffect(() => {
    if (!when) return undefined

    const handleBeforeUnload = event => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
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
