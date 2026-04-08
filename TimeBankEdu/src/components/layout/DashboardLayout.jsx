import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, BookOpen, Search, FileText, History, BarChart2, User, LogOut, Bell, ChevronDown, Menu, X, MessageCircle, Calendar, Shield, Users, Settings, AlertTriangle, CreditCard, HelpCircle, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Avatar from '../common/Avatar';

const studentMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
  { icon: BookOpen, label: 'Mes Tutorats', path: '/student/tutorats' },
  { icon: Search, label: 'Trouver un Module', path: '/student/modules' },
  { icon: FileText, label: 'Mes Demandes', path: '/student/demandes' },
  { icon: History, label: 'Historique', path: '/student/historique' },
  { icon: BarChart2, label: 'Statistiques', path: '/student/stats' },
  { icon: User, label: 'Profil', path: '/student/profil' },
];

const tutorMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/tutor/dashboard' },
  { icon: Layers, label: 'Mes Modules', path: '/tutor/modules' },
  { icon: FileText, label: 'Demandes Reçues', path: '/tutor/demandes' },
  { icon: Calendar, label: 'Planning', path: '/tutor/planning' },
  { icon: BarChart2, label: 'Statistiques', path: '/tutor/stats' },
  { icon: User, label: 'Profil', path: '/tutor/profil' },
];

const adminMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Utilisateurs', path: '/admin/users' },
  { icon: Layers, label: 'Modules', path: '/admin/modules' },
  { icon: CreditCard, label: 'Transactions', path: '/admin/transactions' },
  { icon: AlertTriangle, label: 'Litiges', path: '/admin/litiges' },
  { icon: BarChart2, label: 'Statistiques', path: '/admin/stats' },
  { icon: Settings, label: 'Paramètres', path: '/admin/parametres' },
];

export default function DashboardLayout({ children }) {
  const { currentUser, logout, notifications } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = currentUser?.role;
  const menu = role === 'admin' ? adminMenu : role === 'tutor' ? tutorMenu : studentMenu;
  const unread = notifications?.filter(n => !n.read).length || 0;
  const isAdmin = role === 'admin';

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <GraduationCap size={18} className="text-white" />
        </div>
        <span className="font-bold text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
        {isAdmin && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded ml-1">Admin</span>}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menu.map(({ icon: Icon, label, path }) => (
          <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
            className={`sidebar-link ${location.pathname === path ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50">
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-gray-50 ${isAdmin ? 'dark-sidebar' : ''}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col w-56 ${isAdmin ? 'bg-gray-900' : 'bg-white'} border-r ${isAdmin ? 'border-gray-800' : 'border-gray-200'} flex-shrink-0`}>
        {isAdmin ? (
          <div className="flex flex-col h-full text-gray-300">
            <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-800">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="font-bold text-white">TimeBank <span className="text-primary-400">Edu</span> <span className="text-xs text-gray-400">Admin</span></span>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {menu.map(({ icon: Icon, label, path }) => (
                <Link key={path} to={path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${location.pathname === path ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-gray-800">
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-gray-800 w-full transition-all">
                <LogOut size={18} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        ) : <SidebarContent />}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-white h-full shadow-xl z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} className="text-gray-600" />
            </button>
            <input
              type="text"
              placeholder={isAdmin ? 'Rechercher un utilisateur, module...' : 'Rechercher un module, un tuteur...'}
              className="hidden sm:block w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Bell size={18} className="text-gray-600" />
                {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}><X size={16} className="text-gray-400" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications?.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 flex gap-3 ${!n.read ? 'bg-primary-50' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-primary-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="text-xs text-gray-700">{n.text}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 text-center">
                    <Link to={`/${role}/notifications`} className="text-xs text-primary-600 font-medium" onClick={() => setNotifOpen(false)}>Voir toutes les notifications</Link>
                  </div>
                </div>
              )}
            </div>
            <Link to={`/${role}/profil`} className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
              <Avatar initials={currentUser?.avatar || 'U'} size="sm" />
              <span className="hidden sm:block text-sm font-medium text-gray-700">{currentUser?.name?.split(' ')[0] || 'User'}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
