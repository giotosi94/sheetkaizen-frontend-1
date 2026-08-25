import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, ClipboardList, LayoutDashboard, Settings, Menu, X, BookOpen, Cog, Columns, Users, LogOut } from 'lucide-react'
import { useState } from 'react'
import { APP_NAME } from '../config/app'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout, isAdmin } = useAuth()

  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/kaizen', icon: FileText, label: 'Kaizen' },
    { to: '/action-plan', icon: ClipboardList, label: 'Action Plan' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Meetings' },
    { to: '/pillars', icon: Columns, label: 'Pillars' },
    { to: '/documenti', icon: BookOpen, label: 'Documenti' },
    // Utenti: solo admin
    ...(isAdmin ? [{ to: '/users', icon: Users, label: 'Utenti' }] : []),
    { to: '/settings', icon: Cog, label: 'Settings' },
  ]

  function handleLogout() {
    if (confirm('Vuoi davvero uscire?')) {
      logout()
      navigate('/login')
    }
  }

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const roleColors = {
    admin: 'bg-red-500',
    manager: 'bg-purple-500',
    office: 'bg-blue-500',
    operator: 'bg-green-500',
  }
  const roleColor = roleColors[user?.role] || 'bg-gray-500'

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-primary text-white transition-all duration-300 flex flex-col`}>
        {/* Header sidebar */}
        <div className="p-4 flex justify-between items-center border-b border-primary-light">
          {sidebarOpen && <h1 className="text-lg font-bold">{APP_NAME}</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-primary-light p-1 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-primary-light' : 'hover:bg-primary-light'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="text-sm">{link.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User card + logout */}
        <div className="border-t border-primary-light p-3 space-y-2">
          {user && (
            <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${sidebarOpen ? 'bg-primary-light bg-opacity-50' : ''}`}>
              <div className={`${roleColor} text-white rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                {userInitials}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.full_name}</div>
                  <div className="text-xs text-gray-300 truncate capitalize">{user.role}</div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500 hover:bg-opacity-70 transition-colors text-sm"
            title="Logout"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
          {sidebarOpen && (
            <div className="text-xs text-gray-300 text-center">
              {`${APP_NAME} v1.0`}
            </div>
          )}
        </div>
      </aside>

<main className="flex-1 overflow-y-auto p-6">
  <Outlet />
</main>
    </div>
  )
}
