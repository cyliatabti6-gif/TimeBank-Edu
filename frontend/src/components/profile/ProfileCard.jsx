import { Edit2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import { platformRoleBadgeText } from '../../lib/authz';
import { userInitialsFromName } from '../../lib/userDisplay';
import { resolveAvatarSrc } from '../../lib/avatarUrl';

/**
 * Carte profil (dashboard) : avatar, nom, badge rôle, extrait bio, grille de stats.
 * @param {{ label: string, value: string, sub?: string, colorClass?: string }[]} stats
 */
export default function ProfileCard({
  user,
  displayBalance,
  stats,
  onEdit,
  avatarColor = 'teal',
  children,
}) {
  if (!user) return null;
  const initials = user.initials || userInitialsFromName(user.name);
  const platformRole = platformRoleBadgeText(user);
  const bal =
    displayBalance != null && Number.isFinite(Number(displayBalance))
      ? Number(displayBalance)
      : Number(user.balance);
  const balanceStr = Number.isFinite(bal) ? `${bal}h` : '—';

  const defaultStats = [
    {
      label: 'Balance',
      value: balanceStr,
      sub: 'Heures disponibles',
      colorClass: 'text-primary-600',
    },
    {
      label: 'Score',
      value: `${user.score ?? '—'} ★`,
      sub: 'Moyenne',
      colorClass: 'text-yellow-600',
    },
    {
      label: 'Avis séances',
      value: String(user.tutorReviewCount ?? 0),
      sub: 'Nombre d’avis',
      colorClass: 'text-blue-600',
    },
  ];

  const gridStats = stats && stats.length ? stats : defaultStats;
  const colsClass =
    gridStats.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : gridStats.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

  const bioPreview = (user.description || '').trim().slice(0, 160);

  return (
    <div className="card text-center relative overflow-hidden shadow-sm border border-gray-100/80">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="absolute top-4 right-4 text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1 hover:bg-primary-50 z-10"
        >
          <Edit2 size={12} className="inline mr-1" /> Modifier
        </button>
      ) : null}

      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary-500/10 via-primary-400/5 to-transparent pointer-events-none" />

      <div className="flex flex-col items-center mb-4 pt-6 relative">
        <div className="relative mb-3">
          <Avatar
            initials={initials}
            src={resolveAvatarSrc(user) || undefined}
            size="xl"
            color={avatarColor}
            altText={user.name || 'Profil'}
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="Compte actif" />
        </div>
        <h2 className="font-bold text-lg text-gray-900">{user.name || '—'}</h2>
        <p className="text-sm text-gray-500">
          {user.level || '—'} • {user.filiere || '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span
            className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 text-xs font-mono font-semibold px-2.5 py-0.5 border border-gray-200"
            title="Rôle compte (lecture seule, non modifiable)"
          >
            {platformRole}
          </span>
          {user.is_student ? (
            <span className="text-[11px] font-medium text-blue-800 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Étudiant</span>
          ) : null}
          {user.is_tutor ? (
            <span className="text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">Tuteur</span>
          ) : null}
        </div>
        {bioPreview ? (
          <p className="mt-3 text-xs text-gray-600 text-left px-3 max-w-[280px] mx-auto line-clamp-3 whitespace-pre-wrap">
            {bioPreview}
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-400 italic px-3">Aucune bio pour le moment.</p>
        )}
      </div>

      <div className={`grid ${colsClass} gap-2 py-4 border-t border-b border-gray-100 bg-gray-50/40`}>
        {gridStats.map((s) => (
          <div key={s.label} className="text-center px-1">
            <p className={`font-bold text-lg ${s.colorClass || 'text-gray-800'}`}>{s.value}</p>
            <p className="text-[11px] font-medium text-gray-600">{s.label}</p>
            {s.sub ? <p className="text-[10px] text-gray-400">{s.sub}</p> : null}
          </div>
        ))}
      </div>

      {children ? <div className="mt-4 text-left">{children}</div> : null}
    </div>
  );
}
