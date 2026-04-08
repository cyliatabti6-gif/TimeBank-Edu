import { useState } from 'react';
import { Search, MoreHorizontal, Send, Phone, Video, Paperclip } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mockMessages } from '../../context/AppContext';

const contacts = [
  { id: 3, name: 'Ahmed Moussa', avatar: 'AM', lastMsg: 'Parfait, à demain à 10h!', time: '10:36', online: true, unread: 0 },
  { id: 4, name: 'Lina Farah', avatar: 'LF', lastMsg: 'Merci pour la séance !', time: 'Hier', online: false, unread: 1 },
  { id: 5, name: 'Ali Karim', avatar: 'AK', lastMsg: 'Parfait, à bientôt !', time: '12h41', online: false, unread: 0 },
  { id: 6, name: 'Fatima Zahra', avatar: 'FZ', lastMsg: 'Toujours en ligne...', time: '14h18', online: true, unread: 2 },
  { id: 7, name: 'Yassine K.', avatar: 'YK', lastMsg: 'Exercice supplémentaire...', time: '3h18', online: false, unread: 0 },
];

export default function Chat() {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [message, setMessage] = useState('');
  const [msgs, setMsgs] = useState(mockMessages);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMsgs(prev => [...prev, { id: Date.now(), sender: 'Sara Benali', senderId: 1, text: message, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), mine: true }]);
    setMessage('');
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
      </div>
      <div className="card p-0 overflow-hidden flex h-[calc(100vh-200px)]">
        {/* Contacts List */}
        <div className="w-64 border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher..." className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.map(c => (
              <button key={c.id} onClick={() => setSelectedContact(c)}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedContact.id === c.id ? 'bg-primary-50' : ''}`}>
                <div className="relative flex-shrink-0">
                  <Avatar initials={c.avatar} size="sm" />
                  {c.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{c.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.lastMsg}</p>
                </div>
                {c.unread > 0 && <div className="w-4 h-4 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center flex-shrink-0">{c.unread}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar initials={selectedContact.avatar} size="sm" />
                {selectedContact.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{selectedContact.name}</p>
                <p className="text-xs text-gray-400">{selectedContact.online ? 'En ligne' : 'Hors ligne'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Phone size={14} className="text-gray-600" /></button>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Video size={14} className="text-gray-600" /></button>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><MoreHorizontal size={14} className="text-gray-600" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} gap-2`}>
                {!m.mine && <Avatar initials={selectedContact.avatar} size="xs" />}
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${m.mine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.mine ? 'text-primary-200' : 'text-gray-400'} text-right`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <Paperclip size={15} className="text-gray-500" />
            </button>
            <input type="text" placeholder="Écrire un message..." value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={sendMessage} className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center hover:bg-primary-700 flex-shrink-0">
              <Send size={15} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
