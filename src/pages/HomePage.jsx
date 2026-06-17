import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { FileText, ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react'

export default function HomePage() {
  const [stats, setStats] = useState({ kaizens: 0, actionPlans: 0, overdue: 0, completed: 0 })
  const [recentKaizens, setRecentKaizens] = useState([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [kaizensRes, plansRes] = await Promise.all([
        api.get('/kaizens').catch(() => ({ data: [] })),
        api.get('/action-plans').catch(() => ({ data: [] })),
      ])
      setStats({
        kaizens: kaizensRes.data.length,
        actionPlans: plansRes.data.length,
        overdue: plansRes.data.filter(p => p.stato !== 'Completato' && new Date(p.data_scadenza) < new Date()).length,
        completed: plansRes.data.filter(p => p.stato === 'Completato').length,
      })
      setRecentKaizens(kaizensRes.data.slice(0, 5))
    } catch (err) { console.error(err) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Benvenuto in SheetKaizen 👋
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg"><FileText className="text-blue-600" /></div>
          <div>
            <p className="text-2xl font-bold">{stats.kaizens}</p>
            <p className="text-sm text-gray-500">Kaizen Aperti</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-lg"><ClipboardList className="text-yellow-600" /></div>
          <div>
            <p className="text-2xl font-bold">{stats.actionPlans}</p>
            <p className="text-sm text-gray-500">Action Plan</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-lg"><AlertTriangle className="text-red-600" /></div>
          <div>
            <p className="text-2xl font-bold">{stats.overdue}</p>
            <p className="text-sm text-gray-500">Scaduti</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg"><CheckCircle className="text-green-600" /></div>
          <div>
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-sm text-gray-500">Completati</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Kaizen Recenti</h2>
          <Link to="/kaizen" className="text-primary text-sm hover:underline">Vedi tutti →</Link>
        </div>
        {recentKaizens.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nessun kaizen ancora. Creane uno!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Numero</th>
                <th className="pb-2">Titolo</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Stato</th>
                <th className="pb-2">Reparto</th>
              </tr>
            </thead>
            <tbody>
              {recentKaizens.map((k) => (
                <tr key={k._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-mono text-primary">{k.numero}</td>
                  <td className="py-3">{k.titolo}</td>
                  <td className="py-3">{k.tipo}</td>
                  <td className="py-3">{k.stato}</td>
                  <td className="py-3">{k.reparto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
