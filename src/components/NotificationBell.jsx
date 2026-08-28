import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function NotificationBell({ sidebarOpen = true }) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications/', {
        params: { limit: 30 },
      })

      setNotifications(response.data?.items || [])
      setUnreadCount(response.data?.unread_count || 0)
    } catch (error) {
      console.error('Errore caricamento notifiche:', error)
    }
  }

  useEffect(() => {
    loadNotifications()

    const interval = window.setInterval(loadNotifications, 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openPanel = async () => {
    const nextOpen = !open
    setOpen(nextOpen)

    if (nextOpen) {
      setLoading(true)
      await loadNotifications()
      setLoading(false)
    }
  }

  const openNotification = async notification => {
    try {
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification._id}/read`)
      }

      setNotifications(current =>
        current.map(item =>
          item._id === notification._id
            ? { ...item, is_read: true }
            : item
        )
      )

      setUnreadCount(current =>
        notification.is_read ? current : Math.max(0, current - 1)
      )

      setOpen(false)

      if (notification.action_url) {
        navigate(notification.action_url)
      }
    } catch (error) {
      console.error('Errore apertura notifica:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(current =>
        current.map(notification => ({ ...notification, is_read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Errore lettura notifiche:', error)
    }
  }

  const formatDate = value => {
    if (!value) return ''

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          open ? 'bg-primary-light' : 'hover:bg-primary-light'
        }`}
        title="Notifiche"
      >
        <Bell size={18} />

        {sidebarOpen && (
          <span className="text-sm flex-1 text-left">
            Notifiche
          </span>
        )}

        {unreadCount > 0 && (
          <span className={`${
            sidebarOpen
              ? 'min-w-6 h-6 px-1.5'
              : 'absolute -top-1 -right-1 min-w-5 h-5 px-1'
          } rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`fixed z-50 bg-white text-gray-800 border rounded-xl shadow-2xl overflow-hidden ${
          sidebarOpen
            ? 'left-64 bottom-4 w-[380px]'
            : 'left-16 bottom-4 w-[380px]'
        } max-w-[calc(100vw-5rem)]`}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-gray-50">
            <div>
              <div className="font-bold text-sm">
                Notifiche
              </div>
              <div className="text-xs text-gray-500">
                {unreadCount} non lette
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck size={14} />
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Caricamento notifiche...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={26} className="mx-auto text-gray-300 mb-2" />
                <div className="text-sm text-gray-500">
                  Nessuna notifica
                </div>
              </div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`w-full px-4 py-3 text-left border-b last:border-b-0 hover:bg-gray-50 ${
                    notification.is_read ? 'bg-white' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      notification.is_read ? 'bg-gray-300' : 'bg-blue-600'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${
                        notification.is_read ? 'font-medium' : 'font-bold'
                      }`}>
                        {notification.title || 'Nuova notifica'}
                      </div>

                      <div className="text-xs text-gray-600 mt-1">
                        {notification.message}
                      </div>

                      {notification.entity_title && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {notification.entity_label} · {notification.entity_title}
                        </div>
                      )}

                      <div className="text-xs text-gray-400 mt-2">
                        {formatDate(notification.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
