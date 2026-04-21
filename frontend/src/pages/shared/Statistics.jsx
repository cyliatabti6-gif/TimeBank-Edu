import { useLocation } from 'react-router-dom';
import StudentStatistics from '../student/Statistics';
import TutorStats from '../tutor/TutorStats';

/**
 * Point d’entrée utilisé par App.jsx pour /student/stats et /tutor/stats.
 * Délègue aux pages démo d’origine par rôle (aucune fusion de données ici).
 */
export default function Statistics() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/tutor/')) {
    return <TutorStats />;
  }
  return <StudentStatistics />;
}
