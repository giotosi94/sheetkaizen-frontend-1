import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, FileText, ClipboardList, LayoutDashboard, Settings, Menu, X, BookOpen } from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/kaizen', icon: FileText, label: 'Kaizen' },
    { to: '/action-plan', icon: ClipboardList, label: 'Action Plan' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/documenti', icon: BookOpen, label: 'Documenti' },
    { to: '/admin', icon: Settings, label: 'Admin' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-primary text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex justify-between items-center border-b border-primary-light">
          {sidebarOpen && <h1 className="text-lg font-bold">🏭 SheetKaizen</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-primary-light p-1 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
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
        <div className="p-3 text-xs text-gray-300 border-t border-primary-light">
          {sidebarOpen && 'SheetKaizen v1.0'}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
