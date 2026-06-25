import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import GanttMasterPlan from '../GanttMasterPlan'; // ⚠️ stesso del Kaizen
import api from '../../services/api';

export default function GanttWidget({ config = {}, dashboardId, dashboardName, title = 'Gantt' }) {
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(config?.view || 'month'); // week | month | quarter
  const [yearRange, setYearRange] = useState(config?.yearRange || 1);

  // Carica AP collegati al Meeting/Dashboard
  useEffect(() => {
    loadData();
  }, [dashboardId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/action-plans', {
        params: {
          parent_type: 'dashboard',
          parent_id: dashboardId
        }
      });
      // Solo AP attivi (no cancelled)
      const active = (res.data || []).filter(ap => ap.status !== 'Cancelled');
      setActionPlans(active);
    } catch (err) {
      console.error('Errore caricamento Gantt widget:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const handleYearRangeChange = (newRange) => {
    setYearRange(newRange);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="text-xs text-gray-500">
            ({actionPlans.length} {actionPlans.length === 1 ? 'azione' : 'azioni'})
          </span>
        </div>

        {/* Controlli vista */}
        <div className="flex items-center gap-2">
          {/* Selettore vista */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['week', 'month', 'quarter'].map(v => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-2 py-1 text-xs rounded-md transition ${
                  view === v
                    ? 'bg-white shadow-sm text-purple-600 font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {v === 'week' ? 'Sett' : v === 'month' ? 'Mese' : 'Trim'}
              </button>
            ))}
          </div>

          {/* Range anni */}
          <select
            value={yearRange}
            onChange={(e) => handleYearRangeChange(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
          >
            <option value={1}>1 anno</option>
            <option value={2}>2 anni</option>
            <option value={3}>3 anni</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Caricamento...
          </div>
        ) : actionPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            <Calendar className="w-8 h-8 mb-2 opacity-40" />
            <p>Nessuna azione collegata a questo meeting</p>
          </div>
        ) : (
          <GanttMasterPlan
            actionPlans={actionPlans}
            view={view}
            yearRange={yearRange}
            compact={true}
            readOnly={false}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
}
