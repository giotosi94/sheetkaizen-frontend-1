import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, X, Search, User as UserIcon } from 'lucide-react'
import api from '../services/api'

/**
 * UserPicker — componente riusabile per selezionare utenti dal database.
 *
 * Props:
 *   value          — Single mode: { id, name } oppure null
 *                    Multi mode: array di { id, name }
 *   onChange(val)  — Callback con nuovo valore
 *   mode           — "single" (default) | "multi"
 *   roles          — Array di ruoli ammessi per filtrare (es. ["office","manager"])
 *                    Default: tutti
 *   placeholder    — Testo placeholder
 *   disabled       — bool
 *   required       — bool (solo per validazione del form)
 */
export default function UserPicker({
  value,
  onChange,
  mode = 'single',
  roles = null,
  placeholder = 'Cerca utente...',
  disabled = false,
  required = false,
}) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Carica utenti una sola volta
  useEffect(() => {
    loadUsers()
  }, [])

  // Click fuori → chiudi dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await api.get('/users/')
      setUsers(res.data || [])
    } catch (err) {
      console.error('Errore caricamento utenti:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtri: ruolo + ricerca testuale
  const filteredUsers = useMemo(() => {
    let list = users
    if (roles && roles.length > 0) {
      list = list.filter(u => roles.includes(u.role))
    }
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(u =>
        u.full_name?.toLowerCase().includes(s) ||
        u.username?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.job_title?.toLowerCase().includes(s)
      )
    }
    // Escludi utenti già selezionati (solo in modalità multi)
    if (mode === 'multi' && Array.isArray(value)) {
      const selectedIds = new Set(value.map(v => v.id))
      list = list.filter(u => !selectedIds.has(u.id))
    }
    return list.slice(0, 20) // max 20 risultati per performance
  }, [users, search, roles, mode, value])

  function selectUser(user) {
    const selected = { id: user.id, name: user.full_name || user.username }
    if (mode === 'single') {
      onChange(selected)
      setOpen(false)
      setSearch('')
    } else {
      // Multi: aggiungi alla lista (se non già presente)
      const current = Array.isArray(value) ? value : []
      if (!current.find(v => v.id === selected.id)) {
        onChange([...current, selected])
      }
      setSearch('')
      // mantieni dropdown aperto per selezioni multiple consecutive
      inputRef.current?.focus()
    }
  }

  function removeUser(userId) {
    if (mode === 'single') {
      onChange(null)
    } else {
      const current = Array.isArray(value) ? value : []
      onChange(current.filter(v => v.id !== userId))
    }
  }

  function clearAll() {
    if (mode === 'single') {
      onChange(null)
    } else {
      onChange([])
    }
  }

  // Render single mode
  if (mode === 'single') {
    return (
      <div ref={wrapperRef} className="relative">
        {value ? (
          // Utente selezionato → mostra avatar + nome con X per rimuovere
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-blue-50 border-blue-200">
            <UserAvatarMini name={value.name} />
            <span className="flex-1 text-sm font-medium">{value.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeUser(value.id)}
                className="text-gray-400 hover:text-red-500"
                title="Rimuovi"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          // Nessun utente → mostra search input
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className="w-full border rounded-lg pl-9 pr-9 py-2 text-sm"
            />
            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400" />
          </div>
        )}

        {/* Dropdown */}
        {open && !disabled && !value && (
          <Dropdown
            loading={loading}
            users={filteredUsers}
            onSelect={selectUser}
            search={search}
          />
        )}
      </div>
    )
  }

  // Render multi mode
  return (
    <div ref={wrapperRef} className="relative">
      {/* Box utenti selezionati + input search */}
      <div className="border rounded-lg px-2 py-1.5 min-h-[42px] flex flex-wrap gap-1 items-center bg-white">
        {Array.isArray(value) && value.map(u => (
          <span
            key={u.id}
            className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs"
          >
            <UserAvatarMini name={u.name} size={16} />
            <span>{u.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                className="hover:text-red-600"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}

        {/* Input search */}
        <div className="flex-1 min-w-[120px] flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={value && value.length > 0 ? 'Aggiungi...' : placeholder}
            disabled={disabled}
            className="w-full text-sm outline-none px-1"
          />
        </div>

        {value && value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="text-gray-400 hover:text-red-500"
            title="Rimuovi tutti"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <Dropdown
          loading={loading}
          users={filteredUsers}
          onSelect={selectUser}
          search={search}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// DROPDOWN INTERNO
// ──────────────────────────────────────────
function Dropdown({ loading, users, onSelect, search }) {
  if (loading) {
    return (
      <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg p-4 text-center text-sm text-gray-400">
        Caricamento...
      </div>
    )
  }

  return (
    <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
      {users.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          {search ? `Nessun utente trovato per "${search}"` : 'Nessun utente disponibile'}
        </div>
      ) : (
        users.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelect(u)}
            className="w-full px-3 py-2 hover:bg-blue-50 flex items-center gap-3 text-left border-b last:border-b-0"
          >
            <UserAvatarMini name={u.full_name || u.username} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{u.full_name || u.username}</div>
              <div className="text-xs text-gray-500 truncate">
                {u.job_title || u.email}
              </div>
            </div>
            <RoleBadge role={u.role} />
          </button>
        ))
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// HELPER COMPONENTS
// ──────────────────────────────────────────
function UserAvatarMini({ name, size = 24 }) {
  if (!name) return null
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-orange-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div
      className={`${color} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      title={name}
    >
      {initials}
    </div>
  )
}

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-purple-100 text-purple-700',
    office: 'bg-blue-100 text-blue-700',
    operator: 'bg-green-100 text-green-700',
  }
  const labels = {
    admin: 'Admin',
    manager: 'Manager',
    office: 'Ufficio',
    operator: 'Operator',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
      {labels[role] || role}
    </span>
  )
}
