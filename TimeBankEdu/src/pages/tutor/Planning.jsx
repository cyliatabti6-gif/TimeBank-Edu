import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const dates = [13, 14, 15, 16, 17, 18, 19];
const hours = Array.from({ length: 10 }, (_, i) => `${i + 9}h`);

const events = [
  { day: 0, hour: 2, label: 'Algorithme L2\nSara Benali', color: 'bg-primary-100 text-primary-700 border-primary-300', span: 2 },
  { day: 2, hour: 3, label: 'Base de Données\nAli Karim', color: 'bg-orange-100 text-orange-700 border-orange-300', span: 1 },
  { day: 3, hour: 5, label: 'Analyse 1\nLina Farah', color: 'bg-blue-100 text-blue-700 border-blue-300', span: 2 },
];

export default function Planning() {
  const [view, setView] = useState('week');
  const [month, setMonth] = useState('Mai 2024');

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon Planning</h1>
          <p className="text-gray-500 text-sm">Gérez vos disponibilités et séances.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['Semaine', 'Mois'].map(v => (
              <button key={v} onClick={() => setView(v.toLowerCase())}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${view === v.toLowerCase() ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}>
                {v}
              </button>
            ))}
          </div>
          <button className="btn-primary text-sm py-2 px-4">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-gray-800">{month}</span>
        <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <ChevronRight size={16} />
        </button>
        <button className="ml-2 text-xs text-primary-600 border border-primary-200 px-2 py-1 rounded-lg hover:bg-primary-50">Aujourd'hui</button>
      </div>

      {/* Weekly Grid */}
      <div className="card overflow-hidden p-0">
        <div className="grid overflow-x-auto" style={{ minWidth: '600px' }}>
          {/* Header */}
          <div className="grid grid-cols-8 border-b border-gray-100">
            <div className="p-3 text-xs text-gray-400 font-medium" />
            {days.map((d, i) => (
              <div key={d} className={`p-3 text-center border-l border-gray-100 ${i === 0 ? 'bg-primary-50' : ''}`}>
                <p className="text-xs font-semibold text-gray-600">{d}</p>
                <p className={`text-lg font-bold ${i === 0 ? 'text-primary-600' : 'text-gray-800'}`}>{dates[i]}</p>
              </div>
            ))}
          </div>
          {/* Time slots */}
          {hours.map((h, hi) => (
            <div key={h} className="grid grid-cols-8 border-b border-gray-50">
              <div className="px-3 py-2 text-xs text-gray-400 border-r border-gray-100 flex items-start">{h}</div>
              {days.map((d, di) => {
                const event = events.find(e => e.day === di && e.hour === hi);
                return (
                  <div key={d} className={`border-l border-gray-50 min-h-[40px] p-1 relative ${event ? '' : 'hover:bg-gray-50 cursor-pointer'}`}>
                    {event && (
                      <div className={`${event.color} border rounded-lg p-1.5 text-[10px] font-medium leading-tight h-full`}>
                        {event.label.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        {[
          { color: 'bg-primary-200', label: 'Séances confirmées' },
          { color: 'bg-orange-200', label: 'Séances en attente' },
          { color: 'bg-gray-200', label: 'Indisponible' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
