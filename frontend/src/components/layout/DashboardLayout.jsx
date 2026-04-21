import { createElement, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, BookOpen, Search, FileText, History, BarChart2, User, LogOut, Bell, ChevronDown, Menu, X, Calendar, Users, Settings, AlertTriangle, CreditCard, HelpCircle, Layers, Video, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isPlatformAdmin } from '../../lib/authz';
import { resolveAvatarSrc } from '../../lib/avatarUrl';
import Avatar from '../common/Avatar';

const studentMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
  { icon: BookOpen, label: 'Mes Tutorats', path: '/student/tutorats' },
  { icon: Search, label: 'Trouver un Module', path: '/student/modules' },
  { icon: FileText, label: 'Réservations', path: '/student/demandes' },
  { icon: History, label: 'Historique', path: '/student/historique' },
  { icon: BarChart2, label: 'Statistiques', path: '/student/stats' },
  { icon: User, label: 'Profil', path: '/student/profil' },
];

const tutorMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/tutor/dashboard' },
  { icon: Layers, label: 'Mes Modules', path: '/tutor/modules' },
  { icon: FileText, label: 'Réservations reçues', path: '/tutor/demandes' },
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

/** Dashboard + Statistiques : barre du haut uniquement (pas la sidebar). */
const NAVBAR_ONLY_PATHS = new Set([
  '/student/dashboard',
  '/student/stats',
  '/tutor/dashboard',
  '/tutor/stats',
  '/admin/dashboard',
  '/admin/stats',
]);

/** Liens centraux : Dashboard | Statistiques | Meet (URLs selon area, « both » via l’URL). */
function topNavCenterItems(area) {
  if (area === 'admin') {
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: BarChart2, label: 'Statistiques', path: '/admin/stats' },
      {
        icon: MessageCircle,
        label: 'Messagerie',
        path: '/admin/messenger',
        isActive: (p) => p.startsWith('/admin/messenger'),
      },
    ];
  }
  if (area === 'tutor') {
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/tutor/dashboard' },
      { icon: BarChart2, label: 'Statistiques', path: '/tutor/stats' },
      {
        icon: MessageCircle,
        label: 'Messagerie',
        path: '/tutor/messenger',
        isActive: (p) => p.startsWith('/tutor/messenger'),
      },
      {
        icon: Video,
        label: 'Meet',
        path: '/tutor/planning',
        isActive: (p) => p === '/tutor/planning' || p.startsWith('/session'),
      },
    ];
  }
  return [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: BarChart2, label: 'Statistiques', path: '/student/stats' },
    {
      icon: MessageCircle,
      label: 'Messagerie',
      path: '/student/messenger',
      isActive: (p) => p.startsWith('/student/messenger'),
    },
    {
      icon: Video,
      label: 'Meet',
      path: '/student/tutorats',
      isActive: (p) => p === '/student/tutorats' || p.startsWith('/session'),
    },
  ];
}

/**
 * Zone menu : comptes admin plateforme → espace admin uniquement (hors /admin géré par les routes).
 * Sinon : chemin /tutor + is_tuteur, /student + is_student ; double permission → URL active.
 */
function dashboardArea(user, pathname) {
  if (!user) return 'student';
  if (isPlatformAdmin(user)) return 'admin';
  if (pathname.startsWith('/tutor') && user.is_tutor) return 'tutor';
  if (pathname.startsWith('/student') && user.is_student) return 'student';
  if (user.is_student && user.is_tutor) return pathname.startsWith('/tutor') ? 'tutor' : 'student';
  if (user.is_tutor) return 'tutor';
  return 'student';
}

function SidebarContent({
  sidebarMenu,
  location,
  setSidebarOpen,
  isAdmin,
  isBoth,
  area,
  handleLogout,
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <GraduationCap size={18} className="text-white" />
        </div>
        <span className="font-bold text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
        {isAdmin && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded ml-1">Admin</span>}
      </div>
      {isBoth && (
        <div className="px-3 pb-2 flex gap-1.5">
          <Link
            to="/student/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex-1 text-center text-xs font-medium py-2 rounded-lg border ${area === 'student' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Espace étudiant
          </Link>
          <Link
            to="/tutor/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex-1 text-center text-xs font-medium py-2 rounded-lg border ${area === 'tutor' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Espace tuteur
          </Link>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {sidebarMenu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {createElement(item.icon, { size: 18 })}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <button type="button" onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50">
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { currentUser, logout, notifications } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const area = dashboardArea(currentUser, location.pathname);
  const menu = area === 'admin' ? adminMenu : area === 'tutor' ? tutorMenu : studentMenu;
  const sidebarMenu = menu.filter((item) => !NAVBAR_ONLY_PATHS.has(item.path));
  const centerNavItems = topNavCenterItems(area);
  const unread = notifications?.filter(n => !n.read).length || 0;
  const isAdmin = area === 'admin';
  const isBoth = Boolean(currentUser?.is_student && currentUser?.is_tutor && !isPlatformAdmin(currentUser));

  const handleLogout = () => { logout(); navigate('/'); };

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
              {sidebarMenu.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${location.pathname === item.path ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  {createElement(item.icon, { size: 18 })}
                  <span>{item.label}</span>
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
        ) : (
          <SidebarContent
            sidebarMenu={sidebarMenu}
            location={location}
            setSidebarOpen={setSidebarOpen}
            isAdmin={isAdmin}
            isBoth={isBoth}
            area={area}
            handleLogout={handleLogout}
          />
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-white h-full shadow-xl z-10">
            <SidebarContent
              sidebarMenu={sidebarMenu}
              location={location}
              setSidebarOpen={setSidebarOpen}
              isAdmin={isAdmin}
              isBoth={isBoth}
              area={area}
              handleLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar : Dashboard | Statistiques | Meet — centrés sur la barre (pas décalés par gauche/droite). */}
        <header className="relative flex items-center justify-between gap-3 min-h-[48px] px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 shrink-0 z-10">
            <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
              <Menu size={20} className="text-gray-600" />
            </button>
          </div>
          <nav
            className="absolute left-1/2 top-1/2 z-10 flex max-w-[calc(100%-6.5rem)] sm:max-w-[calc(100%-12rem)] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-1 sm:gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Accès rapide"
          >
            {centerNavItems.map((item) => {
              const active = item.isActive ? item.isActive(location.pathname) : location.pathname === item.path;
              return (
                <Link
                  key={`${item.path}-${item.label}`}
                  to={item.path}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {createElement(item.icon, { size: 18, className: 'flex-shrink-0 opacity-90' })}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 shrink-0 z-10">
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
                    <Link to={`/${area}/notifications`} className="text-xs text-primary-600 font-medium" onClick={() => setNotifOpen(false)}>Voir toutes les notifications</Link>
                  </div>
                </div>
              )}
            </div>
            <Link to={`/${area}/profil`} className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
              <Avatar
                initials={currentUser?.initials || 'U'}
                src={resolveAvatarSrc(currentUser) || undefined}
                size="sm"
                altText={currentUser?.name || 'Profil'}
              />
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
