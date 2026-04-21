import { Mail, BookOpen, Calendar } from 'lucide-react';
import { platformRoleBadgeText } from '../../lib/authz';

/** Bloc « informations personnelles » + bio (champ API `description`). */
export default function ProfileInfo({ user, bioTitle = 'Bio personnelle' }) {
  if (!user) return null;
  const platformRole = platformRoleBadgeText(user);

  return (
    <div className="card shadow-sm border border-gray-100/80">
      <h3 className="font-semibold text-gray-900 mb-4">Informations personnelles</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="flex items-start gap-3">
          <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">E-mail</p>
            <p className="text-gray-700 break-all">{user.email || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <BookOpen size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Filière</p>
            <p className="text-gray-700">{user.filiere || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 bg-primary-100 rounded text-[10px] flex items-center justify-center text-primary-700 font-bold flex-shrink-0">
            N
          </div>
          <div>
            <p className="text-xs text-gray-400">Niveau</p>
            <p className="text-gray-700">{user.level || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Membre depuis</p>
            <p className="text-gray-700">{user.joinedDate || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <div className="w-full">
            <p className="text-xs text-gray-400 mb-1">Rôle compte (lecture seule)</p>
            <span className="inline-flex font-mono text-sm font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
              {platformRole}
            </span>
            <p className="text-xs text-gray-500 mt-2">
              Types d&apos;activité autorisés :{' '}
              {user.is_student ? <span className="text-blue-800 font-medium">étudiant</span> : null}
              {user.is_student && user.is_tutor ? ' · ' : null}
              {user.is_tutor ? <span className="text-amber-900 font-medium">tuteur</span> : null}
              {!user.is_student && !user.is_tutor ? <span className="text-gray-400">aucun</span> : null}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-1 font-medium">{bioTitle}</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {(user.description || '').trim() || 'Aucune description pour le moment.'}
        </p>
      </div>
    </div>
  );
}
