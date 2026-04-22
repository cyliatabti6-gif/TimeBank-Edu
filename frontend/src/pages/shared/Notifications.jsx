import { Bell, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';

const tabs = ['Toutes', 'Non lues', 'Messages'];

const notifIcons = { request: '📋', confirmed: '✅', message: '💬', reminder: '⏰', evaluation: '⭐' };
const notifColors = { request: 'bg-blue-100', confirmed: 'bg-green-100', message: 'bg-purple-100', reminder: 'bg-yellow-100', evaluation: 'bg-orange-100' };

export default function Notifications() {
  const { notifications, markNotifRead, markAllRead } = useApp();

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        </div>
        <button
          type="button"
          onClick={() => markAllRead()}
          className="text-sm text-primary-600 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 flex items-center gap-1"
        >
          <Check size={14} /> Tout marquer comme lu
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {tabs.map(tab => (
          <button key={tab}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'Toutes' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-w-2xl">
        {notifications?.map(n => (
          <div key={n.id} onClick={() => markNotifRead(n.id)}
            className={`card flex items-start gap-3 cursor-pointer hover:shadow-md transition-all ${!n.read ? 'border-primary-200 bg-primary-50' : ''}`}>
            <div className={`w-10 h-10 ${notifColors[n.type] || 'bg-gray-100'} rounded-full flex items-center justify-center text-lg flex-shrink-0`}>
              {notifIcons[n.type] || <Bell size={16} />}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.text}</p>
              <p className="text-xs text-gray-400 mt-1">{n.time}</p>
            </div>
            {!n.read && <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <button className="text-sm text-primary-600 hover:underline">Voir toutes les notifications</button>
      </div>
    </DashboardLayout>
  );
}
