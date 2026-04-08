import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';

export default function Evaluation() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    navigate('/student/tutorats');
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Évaluer ce tutorat</h1>
          <p className="text-gray-500 text-sm">Votre avis aide la communauté à grandir et permet aux tuteurs de s'améliorer.</p>
        </div>

        <div className="card mb-4">
          {/* Tutor Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-5">
            <Avatar initials="AM" size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Ahmed Moussa</h3>
              </div>
              <p className="text-xs text-gray-500">Tuteur en Informatique</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-5 h-5 bg-blue-100 rounded text-[10px] flex items-center justify-center text-blue-600">📚</div>
                <span className="text-xs text-gray-500">Algorithme - L2</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-gray-900">4.8</span>
                <span className="text-yellow-400 text-lg">★</span>
              </div>
              <p className="text-xs text-gray-400">(23 avis)</p>
              <p className="text-xs text-gray-400 mt-1">2 heures • 15/05/2024</p>
            </div>
          </div>

          {/* Rating Stars */}
          <div className="text-center mb-5">
            <h4 className="font-semibold text-gray-800 mb-3">Votre Note</h4>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i)}
                  className={`text-4xl transition-transform hover:scale-110 ${i <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>
                  ★
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 1 ? 'Très mauvais' : rating === 2 ? 'Mauvais' : rating === 3 ? 'Correct' : rating === 4 ? 'Bien' : 'Excellent !'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Commentaire (optionnel)</label>
            <textarea rows={4} placeholder="Partagez votre expérience avec Ahmed. Qu'est-ce que vous avez apprécié ?"
              value={comment} onChange={e => setComment(e.target.value)} maxLength={300}
              className="input-field resize-none" />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/300</p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl mb-5">
            <Shield size={16} className="text-primary-600 flex-shrink-0" />
            <p className="text-xs text-primary-700">L'évaluation est obligatoire pour finaliser le transfert d'heures.</p>
          </div>

          <button onClick={handleSubmit} className="btn-primary w-full py-3">
            Valider l'évaluation ✉️
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
