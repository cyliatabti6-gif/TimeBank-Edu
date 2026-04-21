import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileInfo from '../../components/profile/ProfileInfo';
import ProfileModal from '../../components/profile/ProfileModal';
import PlatformActivitiesSection from '../../components/profile/PlatformActivitiesSection';
import { useApp } from '../../context/AppContext';

export default function Profile() {
  const { currentUser, setCurrentUser, displayBalance, reservations, sessionHistory } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <ProfileModal open={modalOpen} onClose={() => setModalOpen(false)} currentUser={currentUser} setCurrentUser={setCurrentUser} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <ProfileCard user={currentUser} displayBalance={displayBalance} onEdit={() => setModalOpen(true)} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <ProfileInfo user={currentUser} bioTitle="Bio personnelle" />

          <PlatformActivitiesSection
            user={currentUser}
            reservations={reservations}
            sessionHistory={sessionHistory}
            footerLink={
              <Link
                to="/student/historique"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <History size={14} />
                Voir l&apos;historique
              </Link>
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
