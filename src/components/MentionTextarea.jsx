import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'

export default function MentionTextarea({
  value,
  onChange,
  mentions = [],
  onMentionsChange,
  placeholder = 'Scrivi un commento. Digita @ per menzionare un utente',
  rows = 2,
}) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(async () => {
      setLoading(true)

      try {
        const response = await api.get('/users/', {
          params: query ? { search: query } : {},
        })
        setUsers(response.data || [])
      } catch (error) {
        console.error('Errore caricamento utenti:', error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => window.clearTimeout(timer)
  }, [open, query])

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(mentions.map(mention => mention.user_id))
    return users.filter(user => !selectedIds.has(user.id)).slice(0, 8)
  }, [users, mentions])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, open])

  const detectMention = event => {
    const text = event.target.value
    const cursor = event.target.selectionStart
    const beforeCursor = text.slice(0, cursor)
    const match = beforeCursor.match(/(?:^|\s)@([^@\s]*)$/)

    onChange(text)

    if (!match) {
      setOpen(false)
      setQuery('')
      setMentionStart(null)
      return
    }

    const start = cursor - match[1].length - 1
    setMentionStart(start)
    setQuery(match[1])
    setOpen(true)
  }

  const selectUser = user => {
    if (mentionStart === null || !textareaRef.current) return

    const cursor = textareaRef.current.selectionStart
    const before = value.slice(0, mentionStart)
    const after = value.slice(cursor)
    const displayName = user.full_name || user.username || user.email
    const nextValue = `${before}@${displayName} ${after}`

    onChange(nextValue)
    onMentionsChange([
      ...mentions,
      {
        user_id: user.id,
        name: displayName,
        email: user.email || '',
      },
    ])

    setOpen(false)
    setQuery('')
    setMentionStart(null)

    window.setTimeout(() => {
      const nextCursor = before.length + displayName.length + 2
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
    }, 0)
  }

  const handleKeyDown = event => {
    if (!open || availableUsers.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(index => (index + 1) % availableUsers.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(index =>
        index === 0 ? availableUsers.length - 1 : index - 1
      )
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      selectUser(availableUsers[selectedIndex])
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={detectMention}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-30 bg-white border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              Ricerca utenti...
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              Nessun utente trovato
            </div>
          ) : (
            availableUsers.map((user, index) => {
              const displayName = user.full_name || user.username || user.email

              return (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectUser(user)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {displayName
                      .split(' ')
                      .map(part => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.email || user.username}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
