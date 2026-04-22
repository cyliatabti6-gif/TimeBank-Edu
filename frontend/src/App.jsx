import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { defaultDashboardPath, isPlatformAdmin } from './lib/authz';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EtudiantsInscrits from './pages/EtudiantsInscrits';
import ForgotPassword from './pages/ForgotPassword';
import EmailConfirmation from './pages/EmailConfirmation';
import NotFound from './pages/NotFound';
import Maintenance from './pages/Maintenance';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import FindModule from './pages/student/FindModule';
import MyRequests from './pages/student/MyRequests';
import History from './pages/student/History';
import Profile from './pages/student/Profile';
import MyTutorials from './pages/student/MyTutorials';

// Tutor Pages
import TutorDashboard from './pages/tutor/Dashboard';
import MyModules from './pages/tutor/MyModules';
import ProposeModule from './pages/tutor/ProposeModule';
import EditModule from './pages/tutor/EditModule';
import ReceivedRequests from './pages/tutor/ReceivedRequests';
import Planning from './pages/tutor/Planning';
import TutorProfile from './pages/tutor/TutorProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminModules from './pages/admin/AdminModules';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminSettings from './pages/admin/AdminSettings';
import AdminStats from './pages/admin/AdminStats';

// Shared Pages
import TutorDetail from './pages/shared/TutorDetail';
import Session from './pages/shared/Session';
import Evaluation from './pages/shared/Evaluation';
import Notifications from './pages/shared/Notifications';
import ReportAbsence from './pages/shared/ReportAbsence';
import AccountSettings from './pages/shared/AccountSettings';
import Messenger from './pages/shared/Messenger';
import Statistics from './pages/shared/Statistics';

/**
 * Garde routes dashboard : admins plateforme → uniquement /admin/* (pas student/tutor).
 * Étudiant / tuteur : flags is_student / is_tutor.
 */
function canAccessDashboardRole(user, required) {
  if (!required || !user) return true;
  if (required === 'admin') return isPlatformAdmin(user);
  if (isPlatformAdmin(user)) return false;
  if (required === 'student') return Boolean(user.is_student);
  if (required === 'tutor') return Boolean(user.is_tutor);
  return false;
}

function ProtectedRoute({ children, role }) {
  const { currentUser, bootstrapping } = useApp();
  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Chargement de la session…
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role && !canAccessDashboardRole(currentUser, role)) {
    return <Navigate to={defaultDashboardPath(currentUser)} replace />;
  }
  return children;
}

function AppRoutes() {
  const { currentUser } = useApp();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/etudiants-inscrits" element={<EtudiantsInscrits />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/email-confirmation" element={<EmailConfirmation />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/modules/:id" element={<TutorDetail />} />
      <Route path="/tuteurs/:id" element={<TutorDetail />} />

      {/* Student Routes */}
      <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/tutorats" element={<ProtectedRoute role="student"><MyTutorials /></ProtectedRoute>} />
      <Route path="/student/modules" element={<ProtectedRoute role="student"><FindModule /></ProtectedRoute>} />
      <Route path="/student/demandes" element={<ProtectedRoute role="student"><MyRequests /></ProtectedRoute>} />
      <Route path="/student/historique" element={<ProtectedRoute role="student"><History /></ProtectedRoute>} />
      <Route path="/student/stats" element={<ProtectedRoute role="student"><Statistics /></ProtectedRoute>} />
      <Route path="/student/profil" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />
      <Route path="/student/notifications" element={<ProtectedRoute role="student"><Notifications /></ProtectedRoute>} />
      <Route path="/student/messenger" element={<ProtectedRoute role="student"><Messenger /></ProtectedRoute>} />
      <Route path="/student/settings" element={<ProtectedRoute role="student"><AccountSettings /></ProtectedRoute>} />

      {/* Tutor Routes */}
      <Route path="/tutor/dashboard" element={<ProtectedRoute role="tutor"><TutorDashboard /></ProtectedRoute>} />
      <Route path="/tutor/modules" element={<ProtectedRoute role="tutor"><MyModules /></ProtectedRoute>} />
      <Route path="/tutor/modules/new" element={<ProtectedRoute role="tutor"><ProposeModule /></ProtectedRoute>} />
      <Route path="/tutor/modules/edit/:id" element={<ProtectedRoute role="tutor"><EditModule /></ProtectedRoute>} />
      <Route path="/tutor/demandes" element={<ProtectedRoute role="tutor"><ReceivedRequests /></ProtectedRoute>} />
      <Route path="/tutor/meet" element={<ProtectedRoute role="tutor"><ReceivedRequests meetOnly /></ProtectedRoute>} />
      <Route path="/tutor/planning" element={<ProtectedRoute role="tutor"><Planning /></ProtectedRoute>} />
      <Route path="/tutor/stats" element={<ProtectedRoute role="tutor"><Statistics /></ProtectedRoute>} />
      <Route path="/tutor/profil" element={<ProtectedRoute role="tutor"><TutorProfile /></ProtectedRoute>} />
      <Route path="/tutor/notifications" element={<ProtectedRoute role="tutor"><Notifications /></ProtectedRoute>} />
      <Route path="/tutor/messenger" element={<ProtectedRoute role="tutor"><Messenger /></ProtectedRoute>} />
      <Route path="/tutor/settings" element={<ProtectedRoute role="tutor"><AccountSettings /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/modules" element={<ProtectedRoute role="admin"><AdminModules /></ProtectedRoute>} />
      <Route path="/admin/transactions" element={<ProtectedRoute role="admin"><AdminTransactions /></ProtectedRoute>} />
      <Route path="/admin/litiges" element={<ProtectedRoute role="admin"><AdminDisputes /></ProtectedRoute>} />
      <Route path="/admin/stats" element={<ProtectedRoute role="admin"><AdminStats /></ProtectedRoute>} />
      <Route path="/admin/parametres" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><Notifications /></ProtectedRoute>} />
      <Route path="/admin/messenger" element={<ProtectedRoute role="admin"><Messenger /></ProtectedRoute>} />

      {/* Shared protected routes */}
      <Route path="/session/:id" element={currentUser ? <Session /> : <Navigate to="/login" />} />
      <Route path="/evaluation/:id" element={currentUser ? <Evaluation /> : <Navigate to="/login" />} />
      <Route path="/report-absence" element={currentUser ? <ReportAbsence /> : <Navigate to="/login" />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
