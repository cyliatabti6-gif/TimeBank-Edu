import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Calendar, User, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mockTutors, useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { createStudentReservation } from '../../lib/seancesApi';

function parseDurationHours(label) {
  const m = /^(\d+)/.exec((label || '').trim());
  return m ? Number(m[1]) : 2;
}

export default function BookingRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromModule = location.state;
  const { addReservation, currentUser, upsertReservationFromApiDetail, displayBalance } = useApp();
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const initialForm = useMemo(() => {
    if (fromModule?.tutorName && fromModule?.moduleTitle) {
      return {
        tutor: fromModule.tutorName,
        module: `${fromModule.moduleTitle} - ${fromModule.moduleLevel || ''}`.trim(),
        duration: '2 heures',
        date: fromModule.creneauDate?.trim() || '—',
        slot: fromModule.creneauLabel || '—',
        message: '',
      };
    }
    return {
      tutor: 'Ahmed Moussa',
      module: 'Algorithme - L2',
      duration: '2 heures',
      date: '15/05/2024',
      slot: '10h - 12h',
      message: '',
    };
  }, [fromModule]);

  const [form, setForm] = useState(initialForm);
  const [charCount, setCharCount] = useState(0);

  const lockedFromModule = Boolean(fromModule?.creneauId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      navigate('/login');
      return;
    }
    setSubmitError('');
    const token = getAccessToken();
    const tutorId = fromModule?.tutorId ?? mockTutors.find((t) => t.name === form.tutor)?.id;
    const tutorIdNum = tutorId != null ? Number(tutorId) : NaN;
    const studentIdNum = Number(currentUser.id);
    if (Number.isFinite(tutorIdNum) && Number.isFinite(studentIdNum) && tutorIdNum === studentIdNum) {
      setSubmitError(
        'Vous ne pouvez pas envoyer une demande à vous-même. Avec un compte « étudiant et tuteur », connectez-vous avec un autre compte étudiant pour réserver ce cours.',
      );
      return;
    }
    if (token && tutorId) {
      setSubmitting(true);
      try {
        const hours = parseDurationHours(form.duration);
        const body = {
          tutor: tutorIdNum,
          module_titre: form.module,
          date_label: form.date || '',
          creneau_label: form.slot || '',
          duree_heures: hours,
          format_seance: fromModule?.format === 'Présentiel' ? 'Présentiel' : 'Online',
          message: form.message || '',
        };
        if (fromModule?.moduleId != null) body.module_propose = Number(fromModule.moduleId);
        const data = await createStudentReservation(token, body);
        upsertReservationFromApiDetail(data, { message: form.message, studentScore: Number(currentUser.score) || 0 });
        navigate('/student/demandes');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Impossible d’enregistrer la demande sur le serveur.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    addReservation({
      tutorId: fromModule?.tutorId,
      tutorName: form.tutor,
      module: form.module,
      date: form.date,
      creneauLabel: form.slot,
      duration: parseDurationHours(form.duration),
      message: form.message,
      format: fromModule?.format,
    });
    navigate('/student/demandes');
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle Demande de Tutorat</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tuteur</label>
              {lockedFromModule ? (
                <input type="text" readOnly value={form.tutor} className="input-field bg-gray-50 text-gray-700 cursor-default" />
              ) : (
                <select value={form.tutor} onChange={(e) => setForm({ ...form, tutor: e.target.value })} className="input-field">
                  <option>Ahmed Moussa</option>
                  <option>Lina Farah</option>
                  <option>Yassine K.</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Module</label>
              {lockedFromModule ? (
                <input type="text" readOnly value={form.module} className="input-field bg-gray-50 text-gray-700 cursor-default" />
              ) : (
                <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} className="input-field">
                  <option>Algorithme - L2</option>
                  <option>Python - L2</option>
                  <option>Base de Données - L3</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée</label>
              <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="input-field">
                <option>1 heure</option>
                <option>2 heures</option>
                <option>3 heures</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="text"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                readOnly={lockedFromModule}
                className={`input-field ${lockedFromModule ? 'bg-gray-50 text-gray-700 cursor-default' : ''}`}
                placeholder="JJ/MM/AAAA"
              />
              {lockedFromModule && form.date && form.date !== '—' ? (
                <p className="text-[11px] text-gray-400 mt-1">Date prévue pour ce créneau (définie par le tuteur).</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Créneau</label>
              {lockedFromModule ? (
                <input type="text" readOnly value={form.slot} className="input-field bg-gray-50 text-gray-700 cursor-default" />
              ) : (
                <select value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })} className="input-field">
                  <option>10h - 12h</option>
                  <option>14h - 16h</option>
                  <option>18h - 20h</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (optionnel)</label>
              <textarea rows={3} placeholder="Je suis intéressé par ce créneau pour travailler les algorithmes de tri."
                value={form.message} onChange={e => { setForm({...form, message: e.target.value}); setCharCount(e.target.value.length); }}
                maxLength={200} className="input-field resize-none" />
              <p className="text-xs text-gray-400 text-right mt-1">{charCount}/200</p>
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-start gap-3">
            <Shield size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary-700">
              {getAccessToken()
                ? 'Une fois le formulaire envoyé avec succès, la demande est enregistrée sur le serveur et visible par le tuteur. En cas d’erreur, un message rouge s’affiche sous ce bloc.'
                : 'Connectez-vous pour enregistrer la demande sur le serveur ; sinon elle reste uniquement dans ce navigateur.'}
            </p>
          </div>

          {submitError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
          ) : null}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-60">
            {submitting ? 'Envoi…' : 'Envoyer la Demande'}
          </button>
        </form>

        {/* Summary */}
        <div className="card h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif</h3>
          <div className="space-y-3">
            {[
              { icon: User, label: 'Tuteur', val: form.tutor, color: 'bg-primary-100 text-primary-600' },
              { icon: BookOpen, label: 'Module', val: form.module, color: 'bg-blue-100 text-blue-600' },
              {
                icon: Calendar,
                label: 'Créneau',
                val: form.date && form.date !== '—' ? `${form.date} · ${form.slot}` : form.slot,
                color: 'bg-purple-100 text-purple-600',
              },
              { icon: Clock, label: 'Durée', val: form.duration, color: 'bg-orange-100 text-orange-600' },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{val}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
            <p className="text-xs text-yellow-700 font-medium">⚠️ Solde requis</p>
            <p className="text-xs text-yellow-600 mt-1">
              {parseDurationHours(form.duration)} h seront débitées de votre solde après confirmation par le tuteur et la
              clôture de la séance.
            </p>
            <p className="text-xs text-yellow-600">
              Solde affiché :{' '}
              <strong>{displayBalance != null ? `${displayBalance} h` : `${Number(currentUser?.balance) || 0} h`}</strong>
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
