import { createElement } from 'react';
import { GraduationCap, Library, ClipboardList, Star, BookOpen, Inbox } from 'lucide-react';
import { hasPlatformActivity, PLATFORM_ACTIVITY_EMPTY_MESSAGE } from '../../lib/platformActivity';

const STUDENT_ITEMS = [
  { icon: BookOpen, text: 'Suivre des séances de tutorat' },
  { icon: ClipboardList, text: 'Réserver des sessions (réservations)' },
  { icon: Star, text: 'Évaluer les tuteurs après une séance' },
];

const TUTOR_ITEMS = [
  { icon: Library, text: 'Publier des modules' },
  { icon: Inbox, text: 'Gérer les demandes et réservations' },
];

/**
 * Section « Activités sur la plateforme » : types d’activité métier (≠ rôle user/admin).
 */
export default function PlatformActivitiesSection({ user, reservations, sessionHistory, footerLink }) {
  if (!user) return null;

  const hasData = hasPlatformActivity(user, reservations, sessionHistory);

  return (
    <div className="card border border-gray-100/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={20} className="text-primary-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900">Activités sur la plateforme</h3>
          </div>
        </div>
        {footerLink ? <div className="flex-shrink-0 sm:self-center">{footerLink}</div> : null}
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-500 text-center py-6 px-2">{PLATFORM_ACTIVITY_EMPTY_MESSAGE}</p>
      ) : !user.is_student && !user.is_tutor ? (
        <p className="text-sm text-gray-500 text-center py-4">Aucun accès métier (étudiant / tuteur) sur ce compte.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.is_student ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span aria-hidden>👨‍🎓</span> Étudiant
              </p>
              <ul className="space-y-2.5">
                {STUDENT_ITEMS.map((item) => (
                  <li key={item.text} className="flex items-start gap-2 text-sm text-gray-700">
                    {createElement(item.icon, {
                      size: 16,
                      className: 'text-blue-600 mt-0.5 flex-shrink-0',
                      'aria-hidden': true,
                    })}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {user.is_tutor ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span aria-hidden>👨‍🏫</span> Tuteur
              </p>
              <ul className="space-y-2.5">
                {TUTOR_ITEMS.map((item) => (
                  <li key={item.text} className="flex items-start gap-2 text-sm text-gray-700">
                    {createElement(item.icon, {
                      size: 16,
                      className: 'text-amber-700 mt-0.5 flex-shrink-0',
                      'aria-hidden': true,
                    })}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
