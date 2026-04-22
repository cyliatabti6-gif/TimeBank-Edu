import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileInfo from '../../components/profile/ProfileInfo';
import ProfileModal from '../../components/profile/ProfileModal';
import { useApp } from '../../context/AppContext';

export default function Profile() {
  const { currentUser, setCurrentUser, displayBalance } = useApp();
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
        </div>
      </div>
    </DashboardLayout>
  );
}
