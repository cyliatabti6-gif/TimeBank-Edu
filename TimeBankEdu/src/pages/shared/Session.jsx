import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageCircle, Users, FileText, Send, CheckCircle2, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';

const messages = [
  { sender: 'Ahmed', mine: false, text: 'Bonjour ! On va commencer par la fusion des algorithmes de tri.', time: '10:00' },
  { sender: 'Sara', mine: true, text: 'Parfait ! J\'ai quelques questions sur le quicksort.', time: '10:01' },
  { sender: 'Ahmed', mine: false, text: 'Bien sûr, posez votre question !', time: '10:02' },
];

export default function Session() {
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [message, setMessage] = useState('');
  const [msgs, setMsgs] = useState(messages);
  const [ended, setEnded] = useState(false);

  const sendMsg = () => {
    if (!message.trim()) return;
    setMsgs(prev => [...prev, { sender: 'Sara', mine: true, text: message, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
    setMessage('');
  };

  if (ended) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Terminée !</h2>
          <p className="text-gray-500 mb-8">Merci de confirmer pour finaliser le transfert d'heures.</p>

          <div className="card mb-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Vous (Sara)', role: 'Étudiante', duration: '2 heures' },
                { name: 'Ahmed Moussa', role: 'Tuteur', duration: '2 heures' },
              ].map((p, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                  <Avatar initials={i === 0 ? 'SB' : 'AM'} size="md" />
                  <p className="font-semibold text-sm mt-2">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.role}</p>
                  <p className="text-xs text-primary-600 font-medium mt-1">Durée : {p.duration}</p>
                  <p className="text-xs text-gray-400">Module : Algorithme L2</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/evaluation/1')} className="btn-primary py-3">
              <CheckCircle2 size={16} /> Confirmer ma présence
            </button>
            <button className="btn-secondary py-3 text-red-500 border-red-200 hover:bg-red-50">
              Signaler un problème
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">Le transfert d'heures s'effectue uniquement lorsque les deux parties confirment.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900">Session en cours</h1>
          <p className="text-xs text-gray-500">Algorithme - L2 • Commencé il y a 45 min</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-500 font-medium">En direct</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Video Area */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex-1 bg-gray-900 rounded-2xl relative overflow-hidden min-h-64">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Avatar initials="AM" size="xl" color="blue" />
                <p className="text-white font-medium mt-2">Ahmed Moussa</p>
                <p className="text-gray-400 text-sm">Tuteur • En ligne</p>
              </div>
            </div>
            {/* Self view */}
            <div className="absolute bottom-3 right-3 w-24 h-16 bg-gray-700 rounded-xl flex items-center justify-center">
              <Avatar initials="SB" size="sm" />
            </div>
            {/* Session info */}
            <div className="absolute top-3 left-3 bg-black/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Clock size={13} className="text-white" />
              <span className="text-white text-xs font-mono">00:45:32</span>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-center gap-3">
            <button onClick={() => setMicOn(!micOn)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-100 hover:bg-gray-200' : 'bg-red-500 text-white'}`}>
              {micOn ? <Mic size={18} className="text-gray-600" /> : <MicOff size={18} />}
            </button>
            <button onClick={() => setVideoOn(!videoOn)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${videoOn ? 'bg-gray-100 hover:bg-gray-200' : 'bg-red-500 text-white'}`}>
              {videoOn ? <Video size={18} className="text-gray-600" /> : <VideoOff size={18} />}
            </button>
            <button onClick={() => setEnded(true)} className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all">
              <PhoneOff size={18} className="text-white" />
            </button>
            <button className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
              <Users size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Resources */}
          <div className="card">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Ressources partagées</h4>
            <div className="flex gap-2">
              {['tris.h1.pdf', 'diagrammes.png'].map(f => (
                <div key={f} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-200">
                  <FileText size={12} /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="card flex flex-col p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MessageCircle size={16} className="text-primary-600" />
            <h3 className="font-semibold text-sm">Chat</h3>
          </div>

          {/* Objectives */}
          <div className="px-3 py-2 bg-primary-50 border-b border-primary-100">
            <p className="text-xs font-semibold text-primary-700 mb-1">Objectifs de la session :</p>
            {['Comprendre le tri fusion', 'Analyser la complexité', 'Faire des exercices'].map((o, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-primary-600">
                <CheckCircle2 size={11} /> {o}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${m.mine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.mine ? 'text-primary-200' : 'text-gray-400'} text-right`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input type="text" placeholder="Écrire un message..." value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={sendMsg} className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center hover:bg-primary-700 flex-shrink-0">
              <Send size={13} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
