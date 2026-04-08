import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const mockStudents = [
  { id: 1, name: 'Sara Benali', email: 'sara.benali@univ.dz', role: 'student', level: 'L2', filiere: 'Informatique', balance: 3, score: 4.7, tutorialsReceived: 12, avatar: 'SB', bio: 'Passionnée par les algorithmes et l\'IA.', joinedDate: 'Mars 2024' },
  { id: 2, name: 'Ali Karim', email: 'ali.karim@univ.dz', role: 'student', level: 'L1', filiere: 'Gestion', balance: 5, score: 4.2, tutorialsReceived: 8, avatar: 'AK', joinedDate: 'Jan 2024' },
];

export const mockTutors = [
  { id: 3, name: 'Ahmed Moussa', email: 'ahmed.moussa@univ.dz', role: 'tutor', level: 'L2', filiere: 'Informatique', balance: 8, score: 4.8, hoursGiven: 24, reviews: 23, avatar: 'AM', disponible: true, bio: 'Passionné par l\'enseignement et l\'algorithmique.', experience: '3 ans de tutorat', successRate: '95%', modules: ['Algorithme', 'Python'], format: 'Online', availabilities: ['Lun 18h', 'Mer 14h', 'Ven 16h'] },
  { id: 4, name: 'Lina Farah', email: 'lina.farah@univ.dz', role: 'tutor', level: 'L1', filiere: 'Mathématiques', balance: 6, score: 4.6, hoursGiven: 15, reviews: 15, avatar: 'LF', disponible: true, bio: 'Enseignante passionnée en mathématiques.', experience: '2 ans', successRate: '90%', modules: ['Analyse 1', 'Algèbre'], format: 'Présentiel', availabilities: ['Mar 10h', 'Jeu 14h'] },
  { id: 5, name: 'Yassine K.', email: 'yassine.k@univ.dz', role: 'tutor', level: 'L1', filiere: 'Comptabilité', balance: 10, score: 4.9, hoursGiven: 31, reviews: 31, avatar: 'YK', disponible: true, bio: 'Expert en comptabilité et gestion.', experience: '4 ans', successRate: '97%', modules: ['Comptabilité', 'Python'], format: 'Online', availabilities: ['Lun 16h', 'Mer 10h'] },
  { id: 6, name: 'Fatima Zahra', email: 'fatima.zahra@univ.dz', role: 'tutor', level: 'L3', filiere: 'Informatique', balance: 5, score: 4.5, hoursGiven: 18, reviews: 18, avatar: 'FZ', disponible: true, bio: 'Spécialiste en base de données.', experience: '2 ans', successRate: '92%', modules: ['Base de Données', 'SQL'], format: 'Online', availabilities: ['Mar 14h', 'Jeu 14h'] },
];

export const mockModules = [
  { id: 1, title: 'Algorithme', level: 'L2', tutor: 'Ahmed Moussa', tutorId: 3, category: 'Informatique', score: 4.8, reviews: 23, format: 'Online', schedule: 'Lun, Mer, Ven 18h-20h', status: 'published', icon: '</>',color: 'bg-blue-100 text-blue-600' },
  { id: 2, title: 'Analyse 1', level: 'L1', tutor: 'Lina Farah', tutorId: 4, category: 'Mathématiques', score: 4.6, reviews: 15, format: 'Présentiel', schedule: 'Mar, Jeu 10h-12h', status: 'published', icon: '∫', color: 'bg-purple-100 text-purple-600' },
  { id: 3, title: 'Base de Données', level: 'L3', tutor: 'Fatima Zahra', tutorId: 6, category: 'Informatique', score: 4.5, reviews: 18, format: 'Présentiel', schedule: 'Mar, Jeu 14h-16h', status: 'published', icon: '⬡', color: 'bg-cyan-100 text-cyan-600' },
  { id: 4, title: 'Comptabilité', level: 'L1', tutor: 'Yassine K.', tutorId: 5, category: 'Gestion', score: 4.9, reviews: 31, format: 'Online', schedule: 'Lun 16h-18h', status: 'published', icon: '$', color: 'bg-green-100 text-green-600' },
  { id: 5, title: 'Python', level: 'L2', tutor: 'Ahmed Moussa', tutorId: 3, category: 'Informatique', score: 4.7, reviews: 20, format: 'Online', schedule: 'Mar, Jeu 18h-20h', status: 'published', icon: '🐍', color: 'bg-yellow-100 text-yellow-600' },
  { id: 6, title: 'Structures de Données', level: 'L2', tutor: 'Lina Farah', tutorId: 4, category: 'Informatique', score: 4.4, reviews: 12, format: 'Présentiel', schedule: 'Mer 14h-16h', status: 'pending', icon: '⟨⟩', color: 'bg-red-100 text-red-600' },
];

export const mockSessions = [
  { id: 1, tutor: 'Ahmed Moussa', tutorId: 3, student: 'Sara Benali', studentId: 1, module: 'Algorithme L2', date: '15/05/2024', time: '10h-12h', duration: 2, status: 'completed', type: 'given' },
  { id: 2, tutor: 'Lina Farah', tutorId: 4, student: 'Sara Benali', studentId: 1, module: 'Analyse 1 L1', date: '08/05/2024', time: '14h-15h', duration: 1, status: 'in_progress', type: 'given' },
  { id: 3, tutor: 'Fatima Zahra', tutorId: 6, student: 'Sara Benali', studentId: 1, module: 'Base de Données L3', date: '20/05/2024', time: '16h-19h', duration: 3, status: 'confirmed', type: 'given' },
];

export const mockRequests = [
  { id: 1, from: 'Sara Benali', fromId: 1, toId: 3, module: 'Algorithme L2', date: '15/05/2024', time: '10h-12h', duration: 2, status: 'pending', score: 4.7, message: 'Je suis intéressé par ce créneau.' },
  { id: 2, from: 'Ali Karim', fromId: 2, toId: 3, module: 'Base de Données L3', date: '16/05/2024', time: '14h-15h', duration: 1, status: 'pending', score: 4.2, message: '' },
  { id: 3, from: 'Lina Farah', fromId: 4, toId: 3, module: 'Analyse 1 L1', date: '20/05/2024', time: '16h-19h', duration: 3, status: 'confirmed', score: 4.6, message: '' },
];

export const mockNotifications = [
  { id: 1, type: 'request', text: 'Ali Karim a demandé une session de Base de Données.', time: 'Il y a 2 min', read: false },
  { id: 2, type: 'confirmed', text: 'Votre session avec Lina Farah a été confirmée.', time: 'Il y a 30 min', read: false },
  { id: 3, type: 'message', text: 'Ahmed Moussa vous a envoyé un message.', time: 'Il y a 1h', read: true },
  { id: 4, type: 'reminder', text: 'Rappel de session : Votre session débute dans 1 heure.', time: 'Il y a 2h', read: true },
  { id: 5, type: 'evaluation', text: 'Sara Benali a évalué votre tutorat.', time: 'Il y a 1 jour', read: true },
];

export const mockMessages = [
  { id: 1, sender: 'Ahmed Moussa', senderId: 3, text: 'Bonjour! J\'ai une question sur les arbres binaires.', time: '10:30', mine: false },
  { id: 2, sender: 'Sara Benali', senderId: 1, text: 'Bonjour Sara! Bien sûr, posez votre question.', time: '10:31', mine: true },
  { id: 3, sender: 'Ahmed Moussa', senderId: 3, text: 'Pouvez-vous m\'expliquer la différence entre DFS et BFS ?', time: '10:32', mine: false },
  { id: 4, sender: 'Sara Benali', senderId: 1, text: 'Oui, je peux vous expliquer ça pendant notre séance.', time: '10:35', mine: true },
  { id: 5, sender: 'Ahmed Moussa', senderId: 3, text: 'Parfait, à demain à 10h!', time: '10:36', mine: false },
];

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const login = (email, role) => {
    if (role === 'student') setCurrentUser(mockStudents[0]);
    else if (role === 'tutor') setCurrentUser(mockTutors[0]);
    else if (role === 'admin') setCurrentUser({ id: 99, name: 'Admin', role: 'admin', avatar: 'AD' });
  };

  const logout = () => setCurrentUser(null);

  const markNotifRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, login, logout, darkMode, setDarkMode, notifications, markNotifRead }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
