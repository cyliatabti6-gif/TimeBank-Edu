import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { userInitialsFromName } from '../lib/userDisplay';
import { resolveAvatarSrc } from '../lib/avatarUrl';
import { getApiBase } from '../lib/api';
import { clearTokens, getAccessToken, saveTokens } from '../lib/authStorage';
import { fetchStudentReservationsFromServer, fetchTutorIncomingReservations } from '../lib/seancesApi';

const AppContext = createContext(null);

/** Adapte l’utilisateur API au format attendu par les écrans (dashboard, avatar, etc.). */
export function mapApiUserToAppUser(u) {
  if (!u) return null;
  const initials = userInitialsFromName(u.name);
  let joinedDate = '';
  if (u.date_joined) {
    try {
      const d = new Date(u.date_joined);
      joinedDate = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      if (joinedDate) joinedDate = joinedDate.charAt(0).toUpperCase() + joinedDate.slice(1);
    } catch {
      joinedDate = '';
    }
  }

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? 'user',
    is_student: typeof u.is_student === 'boolean' ? u.is_student : true,
    is_tutor: typeof u.is_tutor === 'boolean' ? u.is_tutor : true,
    initials,
    avatarUrl: resolveAvatarSrc({ avatar: u.avatar, avatarUrl: u.avatarUrl }),
    filiere: u.filiere,
    level: u.niveau,
    balance: Number(u.balance_hours),
    score: Number(u.score),
    tutorReviewCount: Number(u.tutor_review_count ?? 0),
    evaluationsRecues: Number(u.evaluations_recues ?? 0),
    evaluationsDonnees: Number(u.evaluations_donnees ?? 0),
    description: u.description || '',
    is_staff: Boolean(u.is_staff),
    joinedDate,
  };
}

export const mockStudents = [
  { id: 1, name: 'Sara Benali', email: 'sara.benali@univ.dz', role: 'user', is_student: true, is_tutor: false, is_staff: false, level: 'L2', filiere: 'Informatique', balance: 3, score: 4.7, tutorialsReceived: 12, avatar: 'SB', bio: 'Passionnée par les algorithmes et l\'IA.', joinedDate: 'Mars 2024' },
  { id: 2, name: 'Ali Karim', email: 'ali.karim@univ.dz', role: 'user', is_student: true, is_tutor: false, is_staff: false, level: 'L1', filiere: 'Gestion', balance: 5, score: 4.2, tutorialsReceived: 8, avatar: 'AK', joinedDate: 'Jan 2024' },
];

export const mockTutors = [
  { id: 3, name: 'Ahmed Moussa', email: 'ahmed.moussa@univ.dz', role: 'user', is_student: false, is_tutor: true, is_staff: false, level: 'L2', filiere: 'Informatique', balance: 8, score: 4.8, hoursGiven: 24, reviews: 23, avatar: 'AM', disponible: true, bio: 'Passionné par l\'enseignement et l\'algorithmique.', experience: '3 ans de tutorat', successRate: '95%', modules: ['Algorithme', 'Python'], format: 'Online', availabilities: ['Lun 18h', 'Mer 14h', 'Ven 16h'] },
  { id: 4, name: 'Lina Farah', email: 'lina.farah@univ.dz', role: 'user', is_student: false, is_tutor: true, is_staff: false, level: 'L1', filiere: 'Mathématiques', balance: 6, score: 4.6, hoursGiven: 15, reviews: 15, avatar: 'LF', disponible: true, bio: 'Enseignante passionnée en mathématiques.', experience: '2 ans', successRate: '90%', modules: ['Analyse 1', 'Algèbre'], format: 'Présentiel', availabilities: ['Mar 10h', 'Jeu 14h'] },
  { id: 5, name: 'Yassine K.', email: 'yassine.k@univ.dz', role: 'user', is_student: false, is_tutor: true, is_staff: false, level: 'L1', filiere: 'Comptabilité', balance: 10, score: 4.9, hoursGiven: 31, reviews: 31, avatar: 'YK', disponible: true, bio: 'Expert en comptabilité et gestion.', experience: '4 ans', successRate: '97%', modules: ['Comptabilité', 'Python'], format: 'Online', availabilities: ['Lun 16h', 'Mer 10h'] },
  { id: 6, name: 'Fatima Zahra', email: 'fatima.zahra@univ.dz', role: 'user', is_student: false, is_tutor: true, is_staff: false, level: 'L3', filiere: 'Informatique', balance: 5, score: 4.5, hoursGiven: 18, reviews: 18, avatar: 'FZ', disponible: true, bio: 'Spécialiste en base de données.', experience: '2 ans', successRate: '92%', modules: ['Base de Données', 'SQL'], format: 'Online', availabilities: ['Mar 14h', 'Jeu 14h'] },
];

/** Créneaux proposés pour ce module (sélection obligatoire avant demande). */
export const mockModules = [
  {
    id: 1,
    title: 'Algorithme',
    level: 'L2',
    tutor: 'Ahmed Moussa',
    tutorId: 3,
    category: 'Informatique',
    score: 4.8,
    reviews: 23,
    format: 'Online',
    schedule: 'Lun, Mer, Ven 18h-20h',
    status: 'published',
    icon: '</>',
    color: 'bg-blue-100 text-blue-600',
    creneaux: [
      { id: 'm1-c1', libelle: 'Lundi 18h – 20h', date: '13/04/2026', disponible: true },
      { id: 'm1-c2', libelle: 'Mercredi 18h – 20h', date: '15/04/2026', disponible: true },
      { id: 'm1-c3', libelle: 'Vendredi 18h – 20h', date: '17/04/2026', disponible: false },
    ],
  },
  {
    id: 2,
    title: 'Analyse 1',
    level: 'L1',
    tutor: 'Lina Farah',
    tutorId: 4,
    category: 'Mathématiques',
    score: 4.6,
    reviews: 15,
    format: 'Présentiel',
    schedule: 'Mar, Jeu 10h-12h',
    status: 'published',
    icon: '∫',
    color: 'bg-purple-100 text-purple-600',
    creneaux: [
      { id: 'm2-c1', libelle: 'Mardi 10h – 12h', date: '14/04/2026', disponible: true },
      { id: 'm2-c2', libelle: 'Jeudi 10h – 12h', date: '16/04/2026', disponible: true },
    ],
  },
  {
    id: 3,
    title: 'Base de Données',
    level: 'L3',
    tutor: 'Fatima Zahra',
    tutorId: 6,
    category: 'Informatique',
    score: 4.5,
    reviews: 18,
    format: 'Présentiel',
    schedule: 'Mar, Jeu 14h-16h',
    status: 'published',
    icon: '⬡',
    color: 'bg-cyan-100 text-cyan-600',
    creneaux: [
      { id: 'm3-c1', libelle: 'Mardi 14h – 16h', date: '14/04/2026', disponible: true },
      { id: 'm3-c2', libelle: 'Jeudi 14h – 16h', date: '16/04/2026', disponible: true },
    ],
  },
  {
    id: 4,
    title: 'Comptabilité',
    level: 'L1',
    tutor: 'Yassine K.',
    tutorId: 5,
    category: 'Gestion',
    score: 4.9,
    reviews: 31,
    format: 'Online',
    schedule: 'Lun 16h-18h',
    status: 'published',
    icon: '$',
    color: 'bg-green-100 text-green-600',
    creneaux: [
      { id: 'm4-c1', libelle: 'Lundi 16h – 18h', date: '13/04/2026', disponible: true },
      { id: 'm4-c2', libelle: 'Mercredi 16h – 18h', date: '15/04/2026', disponible: true },
    ],
  },
  {
    id: 5,
    title: 'Python',
    level: 'L2',
    tutor: 'Ahmed Moussa',
    tutorId: 3,
    category: 'Informatique',
    score: 4.7,
    reviews: 20,
    format: 'Online',
    schedule: 'Mar, Jeu 18h-20h',
    status: 'published',
    icon: '🐍',
    color: 'bg-yellow-100 text-yellow-600',
    creneaux: [
      { id: 'm5-c1', libelle: 'Mardi 18h – 20h', date: '14/04/2026', disponible: true },
      { id: 'm5-c2', libelle: 'Jeudi 18h – 20h', date: '16/04/2026', disponible: true },
    ],
  },
  {
    id: 6,
    title: 'Structures de Données',
    level: 'L2',
    tutor: 'Lina Farah',
    tutorId: 4,
    category: 'Informatique',
    score: 4.4,
    reviews: 12,
    format: 'Présentiel',
    schedule: 'Mer 14h-16h',
    status: 'pending',
    icon: '⟨⟩',
    color: 'bg-red-100 text-red-600',
    creneaux: [{ id: 'm6-c1', libelle: 'Mercredi 14h – 16h', date: '15/04/2026', disponible: true }],
  },
];

export const mockSessions = [
  { id: 1, tutor: 'Ahmed Moussa', tutorId: 3, student: 'Sara Benali', studentId: 1, module: 'Algorithme L2', date: '15/05/2024', time: '10h-12h', duration: 2, status: 'completed', type: 'given' },
  { id: 2, tutor: 'Lina Farah', tutorId: 4, student: 'Sara Benali', studentId: 1, module: 'Analyse 1 L1', date: '08/05/2024', time: '14h-15h', duration: 1, status: 'confirmed', type: 'given' },
  { id: 3, tutor: 'Fatima Zahra', tutorId: 6, student: 'Sara Benali', studentId: 1, module: 'Base de Données L3', date: '20/05/2024', time: '16h-19h', duration: 3, status: 'confirmed', type: 'given' },
];

const RESERVATIONS_STORAGE_KEY = 'timebank_reservations_v3';

/** Ajoute les champs de double confirmation fin de séance (rétrocompat). */
function normalizeReservation(r) {
  if (!r || typeof r !== 'object') return r;
  return {
    ...r,
    studentSessionConfirm: Boolean(r.studentSessionConfirm),
    tutorSessionConfirm: Boolean(r.tutorSessionConfirm),
  };
}

/** Données initiales des réservations / demandes (étudiant → tuteur). */
export const initialReservations = [
  {
    id: 1,
    studentId: 1,
    studentName: 'Sara Benali',
    tutorId: 3,
    tutorName: 'Ahmed Moussa',
    module: 'Algorithme L2',
    date: '15/05/2024',
    creneauLabel: '10h-12h',
    duration: 2,
    status: 'pending',
    message: '',
    studentScore: 4.7,
    format: 'Online',
  },
  {
    id: 2,
    studentId: 2,
    studentName: 'Ali Karim',
    tutorId: 3,
    tutorName: 'Ahmed Moussa',
    module: 'Base de Données L3',
    date: '16/05/2024',
    creneauLabel: '14h-15h',
    duration: 1,
    status: 'pending',
    message: '',
    studentScore: 4.2,
    format: 'Online',
  },
  {
    id: 3,
    studentId: 1,
    studentName: 'Sara Benali',
    tutorId: 3,
    tutorName: 'Ahmed Moussa',
    module: 'Python L2',
    date: '20/04/2026',
    creneauLabel: 'Mardi 18h – 20h',
    duration: 2,
    status: 'confirmed',
    message: '',
    studentScore: 4.7,
    format: 'Online',
  },
  {
    id: 4,
    studentId: 1,
    studentName: 'Sara Benali',
    tutorId: 4,
    tutorName: 'Lina Farah',
    module: 'Analyse 1 L1',
    date: '01/04/2026',
    creneauLabel: 'Mardi 10h – 12h',
    duration: 2,
    status: 'completed',
    message: '',
    studentScore: 4.7,
    format: 'Présentiel',
    studentSessionConfirm: true,
    tutorSessionConfirm: true,
    completedAt: '2026-04-01T12:00:00.000Z',
  },
  {
    id: 5,
    studentId: 1,
    studentName: 'Sara Benali',
    tutorId: 6,
    tutorName: 'Fatima Zahra',
    module: 'Base de Données L3',
    date: '05/04/2026',
    creneauLabel: 'Jeudi 14h – 16h',
    duration: 2,
    status: 'cancelled',
    message: '',
    studentScore: 4.7,
    format: 'Présentiel',
  },
  {
    id: 6,
    studentId: 1,
    studentName: 'Sara Benali',
    tutorId: 4,
    tutorName: 'Lina Farah',
    module: 'Analyse 1 L1',
    date: '22/04/2026',
    creneauLabel: 'Jeudi 10h – 12h',
    duration: 2,
    status: 'confirmed',
    message: '',
    studentScore: 4.7,
    format: 'Présentiel',
  },
];

/** Supprime tout cache navigateur des réservations (non utilisé comme source de vérité). */
function clearReservationLocalStorageKeys() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(RESERVATIONS_STORAGE_KEY);
    localStorage.removeItem('timebank_reservations_v2');
    localStorage.removeItem('timebank_balance_delta_v1');
    localStorage.removeItem('timebank_session_history_v1');
  } catch {
    /* ignore */
  }
}

/** Une ligne SeanceDetailSerializer → réservation UI (source API). */
function mapApiDetailToReservation(detail) {
  if (!detail || detail.id == null) return null;
  const fmt =
    detail.format === 'Présentiel' || detail.format === 'Online' ? detail.format : null;
  return normalizeReservation({
    id: detail.id,
    studentId: detail.studentId,
    studentName: detail.student,
    tutorId: detail.tutorId,
    tutorName: detail.tutor,
    module: detail.module || '',
    date: detail.date || '—',
    creneauLabel: detail.time || '',
    duration: Number(detail.duration) || 2,
    status: detail.status,
    format: fmt,
    studentSessionConfirm: Boolean(detail.student_session_confirm),
    tutorSessionConfirm: Boolean(detail.tutor_session_confirm),
    student_avatar: detail.student_avatar ?? detail.studentAvatar,
    tutor_avatar: detail.tutor_avatar ?? detail.tutorAvatar,
    meet_url: detail.meet_url || null,
    fromServer: true,
    message: '',
    studentScore: 0,
  });
}

export const mockNotifications = [
  { id: 1, type: 'request', text: 'Ali Karim a demandé une session de Base de Données.', time: 'Il y a 2 min', read: false },
  { id: 2, type: 'confirmed', text: 'Votre session avec Lina Farah a été confirmée.', time: 'Il y a 30 min', read: false },
  { id: 3, type: 'message', text: 'Ahmed Moussa vous a envoyé un message.', time: 'Il y a 1h', read: true },
  { id: 4, type: 'reminder', text: 'Rappel de session : Votre session débute dans 1 heure.', time: 'Il y a 2h', read: true },
  { id: 5, type: 'evaluation', text: 'Sara Benali a évalué votre tutorat.', time: 'Il y a 1 jour', read: true },
];

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [reservations, setReservations] = useState(() => []);

  /** Solde : toujours celui renvoyé par l’API (/auth/me/), jamais ajusté en local. */
  const displayBalance = useMemo(() => {
    if (!currentUser?.id) return null;
    const base = Number(currentUser.balance);
    return Number.isFinite(base) ? Math.round(base * 100) / 100 : null;
  }, [currentUser?.id, currentUser?.balance]);

  /** Historique dérivé des réservations « completed » synchronisées avec le serveur. */
  const sessionHistory = useMemo(() => {
    if (!Array.isArray(reservations)) return [];
    return reservations
      .filter((r) => r?.status === 'completed')
      .map((r) => {
        const duration = Number(r?.duration);
        return {
          id: `h-${r.id}`,
          at: r?.completedAt || new Date().toISOString(),
          reservationId: r.id,
          module: r?.module || '',
          duration: Number.isFinite(duration) && duration > 0 ? duration : 2,
          studentId: r?.studentId,
          tutorId: r?.tutorId,
          studentName: r?.studentName || 'Étudiant',
          tutorName: r?.tutorName || 'Tuteur',
          student_avatar: r?.student_avatar ?? r?.studentAvatar ?? '',
          tutor_avatar: r?.tutor_avatar ?? r?.tutorAvatar ?? '',
        };
      });
  }, [reservations]);

  const addReservation = useCallback(
    (payload) => {
      if (!currentUser?.id) return;
      const tutorId =
        payload.tutorId ?? mockTutors.find((t) => t.name === payload.tutorName)?.id;
      if (!tutorId) return;
      const tutorName =
        payload.tutorName || mockTutors.find((t) => t.id === tutorId)?.name || 'Tuteur';
      const resolvedFormat =
        payload.format === 'Présentiel' || payload.format === 'Online' ? payload.format : null;
      setReservations((prev) => {
        const nextId = prev.reduce((m, r) => Math.max(m, r.id), 0) + 1;
        return [
          ...prev,
          {
            id: nextId,
            studentId: currentUser.id,
            studentName: currentUser.name || 'Étudiant',
            tutorId,
            tutorName,
            module: payload.module || '',
            date: payload.date || '—',
            creneauLabel: payload.creneauLabel || '—',
            duration: typeof payload.duration === 'number' ? payload.duration : 2,
            status: 'pending',
            message: payload.message || '',
            studentScore: Number(currentUser.score) || 0,
            format: resolvedFormat,
            studentSessionConfirm: false,
            tutorSessionConfirm: false,
          },
        ];
      });
    },
    [currentUser],
  );

  /** Crée ou met à jour une réservation à partir d’une réponse API (SeanceDetailSerializer). */
  const upsertReservationFromApiDetail = useCallback((detail, extras = {}) => {
    if (!detail || detail.id == null) return;
    const fmt =
      detail.format === 'Présentiel' || detail.format === 'Online' ? detail.format : null;
    const mapped = normalizeReservation({
      id: detail.id,
      studentId: detail.studentId,
      studentName: detail.student,
      tutorId: detail.tutorId,
      tutorName: detail.tutor,
      module: detail.module || '',
      date: detail.date || '—',
      creneauLabel: detail.time || '',
      duration: Number(detail.duration) || 2,
      status: detail.status,
      format: fmt,
      studentSessionConfirm: Boolean(detail.student_session_confirm),
      tutorSessionConfirm: Boolean(detail.tutor_session_confirm),
      student_avatar: detail.student_avatar ?? detail.studentAvatar,
      tutor_avatar: detail.tutor_avatar ?? detail.tutorAvatar,
      meet_url: detail.meet_url || null,
      fromServer: true,
    });
    setReservations((prev) => {
      const idx = prev.findIndex((x) => Number(x.id) === Number(detail.id));
      if (idx === -1) {
        return [
          ...prev,
          normalizeReservation({
            ...mapped,
            message: extras.message != null ? String(extras.message) : '',
            studentScore: Number(extras.studentScore) || 0,
          }),
        ];
      }
      return prev.map((x, i) =>
        i === idx
          ? normalizeReservation({
              ...x,
              ...mapped,
              message: x.message,
              studentScore: x.studentScore,
            })
          : x,
      );
    });
  }, []);

  /**
   * Remplace tout l’état des réservations par la réponse API (seule source de vérité).
   * Efface les clés réservation dans localStorage pour éviter tout cache obsolète.
   */
  const replaceReservationsFromApiDetails = useCallback((details) => {
    if (!Array.isArray(details)) return;
    clearReservationLocalStorageKeys();
    if (details.length === 0) {
      setReservations([]);
      return;
    }
    const mapped = details.map(mapApiDetailToReservation).filter(Boolean);
    setReservations(mapped);
  }, []);

  /** Synchronise avec GET étudiant et/ou GET tuteur ; remplace l’état (pas de fusion). */
  const syncReservationsWithServer = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !currentUser) return;

    try {
      const mergedById = new Map();
      if (currentUser.is_student) {
        const rows = await fetchStudentReservationsFromServer(token);
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r?.id != null) mergedById.set(r.id, r);
          }
        }
      }
      if (currentUser.is_tutor) {
        const rows = await fetchTutorIncomingReservations(token);
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r?.id != null) mergedById.set(r.id, r);
          }
        }
      }
      if (!currentUser.is_student && !currentUser.is_tutor) {
        replaceReservationsFromApiDetails([]);
        return;
      }
      replaceReservationsFromApiDetails(Array.from(mergedById.values()));
    } catch {
      clearReservationLocalStorageKeys();
      setReservations([]);
    }
  }, [currentUser, replaceReservationsFromApiDetails]);

  /** @deprecated Utiliser replaceReservationsFromApiDetails (même comportement : remplacement). */
  const bulkUpsertReservationsFromApiDetails = replaceReservationsFromApiDetails;

  const clearBrowserReservationsBackup = useCallback(() => {
    clearReservationLocalStorageKeys();
    window.location.reload();
  }, []);

  /** Ne modifie pas les lignes synchronisées avec l’API (source de vérité : Django). */
  const updateReservationStatus = useCallback((id, status) => {
    const nid = Number(id);
    setReservations((prev) =>
      prev.map((r) => {
        if (Number(r.id) !== nid) return r;
        if (r.fromServer) return r;
        return normalizeReservation({ ...r, status });
      }),
    );
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setCurrentUser(null);
    setReservations([]);
    clearReservationLocalStorageKeys();
  }, []);

  /** Après POST /api/connexion/ réussi : { access, refresh, user } */
  const login = useCallback((payload) => {
    if (!payload?.access || !payload?.user) return;
    saveTokens(payload.access, payload.refresh);
    setCurrentUser(mapApiUserToAppUser(payload.user));
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setBootstrapping(false);
      return;
    }
    const base = getApiBase();
    fetch(`${base}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('session');
        return r.json();
      })
      .then((u) => setCurrentUser(mapApiUserToAppUser(u)))
      .catch(() => {
        clearTokens();
        setCurrentUser(null);
      })
      .finally(() => setBootstrapping(false));
  }, []);

  useEffect(() => {
    if (bootstrapping) return;
    if (!currentUser) {
      setReservations([]);
      return;
    }
    void syncReservationsWithServer();
  }, [bootstrapping, currentUser?.id, currentUser?.is_student, currentUser?.is_tutor, syncReservationsWithServer]);

  const markNotifRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        logout,
        bootstrapping,
        darkMode,
        setDarkMode,
        notifications,
        markNotifRead,
        reservations,
        addReservation,
        upsertReservationFromApiDetail,
        replaceReservationsFromApiDetails,
        syncReservationsWithServer,
        bulkUpsertReservationsFromApiDetails,
        clearBrowserReservationsBackup,
        updateReservationStatus,
        displayBalance,
        sessionHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
