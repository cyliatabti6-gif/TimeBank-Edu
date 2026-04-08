import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye, Trash2, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import { mockModules } from '../../context/AppContext';

export default function MyModules() {
  const navigate = useNavigate();
  const tutorModules = mockModules.filter(m => m.tutorId === 3);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Modules</h1>
          <p className="text-gray-500 text-sm">Gérez les modules que vous proposez.</p>
        </div>
        <button onClick={() => navigate('/tutor/modules/new')} className="btn-primary text-sm py-2">
          <Plus size={16} /> Nouveau Module
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tutorModules.map(mod => (
          <div key={mod.id} className="card hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${mod.color} rounded-xl flex items-center justify-center text-sm font-bold`}>
                {mod.icon}
              </div>
              <span className={mod.status === 'published' ? 'badge-green' : 'badge-orange'}>
                {mod.status === 'published' ? 'Publié' : 'En attente'}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{mod.title}</h3>
            <p className="text-xs text-gray-500 mb-2">{mod.level} • {mod.category}</p>
            <p className="text-xs text-gray-400 mb-3">{mod.format} • {mod.schedule}</p>
            <div className="flex items-center gap-1 mb-4">
              <StarRating rating={mod.score} size={12} />
              <span className="text-xs text-gray-600">{mod.score} ({mod.reviews} avis)</span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50">
                <Edit2 size={12} /> Modifier
              </button>
              <button onClick={() => navigate(`/modules/${mod.id}`)} className="flex-1 text-xs bg-primary-50 text-primary-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-primary-100">
                <Eye size={12} /> Voir
              </button>
              <button className="w-8 text-xs bg-red-50 text-red-500 py-1.5 rounded-lg flex items-center justify-center hover:bg-red-100">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* Add Module Card */}
        <button onClick={() => navigate('/tutor/modules/new')} className="card border-2 border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-3 min-h-48 text-gray-400 hover:text-primary-600">
          <Plus size={28} />
          <span className="text-sm font-medium">Proposer un nouveau module</span>
        </button>
      </div>
    </DashboardLayout>
  );
}
