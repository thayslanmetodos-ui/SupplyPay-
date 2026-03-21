import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Send, User, Search, CheckCircle2, Clock } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { triggerEmail } from '../services/emailTriggerService';

interface ChatRoom {
  id: string;
  uid: string;
  userName: string;
  userRole: string;
  status: 'OPEN' | 'CLOSED';
  lastMessage?: string;
  updatedAt: any;
  createdAt: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  timestamp: any;
}

export const AdminChat: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const user = auth.currentUser;

  useEffect(() => {
    // Listen for all open chat rooms
    const q = query(collection(db, 'chat_rooms'), where('status', '==', 'OPEN'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
      setRooms(roomList);
    });

    socketRef.current = io();

    return () => {
      unsubscribe();
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    // Join room for real-time signaling
    socketRef.current?.emit('join_room', selectedRoom.id);

    // Listen for messages in selected room
    const q = query(collection(db, 'chat_rooms', selectedRoom.id, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !selectedRoom) return;

    const newMessage = {
      roomId: selectedRoom.id,
      senderId: user.uid,
      senderName: 'Suporte SupplyPay',
      senderRole: 'admin',
      text: message,
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'chat_rooms', selectedRoom.id, 'messages'), newMessage);
      
      await updateDoc(doc(db, 'chat_rooms', selectedRoom.id), {
        lastMessage: message,
        updatedAt: serverTimestamp(),
      });

      socketRef.current?.emit('send_message', {
        roomID: selectedRoom.id,
        message: message,
        sender: 'Suporte SupplyPay',
        senderRole: 'admin',
        timestamp: new Date().toISOString(),
      });

      // Send email to the user
      const userDoc = await getDoc(doc(db, 'users', selectedRoom.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.email) {
          triggerEmail('new-message', {
            email: userData.email,
            name: userData.name || 'Usuário',
            senderName: 'Suporte SupplyPay',
            message: message
          });
        }
      }

      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const closeChat = async (roomId: string) => {
    try {
      await updateDoc(doc(db, 'chat_rooms', roomId), {
        status: 'CLOSED',
        updatedAt: serverTimestamp(),
      });
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
    } catch (error) {
      console.error("Error closing chat:", error);
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.userName.toLowerCase().includes(search.toLowerCase()) || 
    r.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-bold text-slate-800 mb-4">Atendimentos</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhum chat aberto no momento.
            </div>
          ) : (
            filteredRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-white transition-colors border-b border-slate-100 ${
                  selectedRoom?.id === room.id ? 'bg-white border-l-4 border-l-emerald-600' : ''
                }`}
              >
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <User size={20} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm text-slate-800 truncate">{room.userName}</span>
                    <span className="text-[10px] text-slate-400">
                      {room.updatedAt?.toDate ? room.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{room.lastMessage || 'Iniciou um chat'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedRoom ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{selectedRoom.userName}</h3>
                  <p className="text-xs text-slate-500 capitalize">{selectedRoom.userRole}</p>
                </div>
              </div>
              <button
                onClick={() => closeChat(selectedRoom.id)}
                className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors"
              >
                <CheckCircle2 size={16} />
                Finalizar Atendimento
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl p-4 text-sm shadow-sm ${
                      msg.senderRole === 'admin'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-[10px] mt-1 block opacity-70 ${msg.senderRole === 'admin' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua resposta..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="bg-emerald-600 text-white px-6 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              >
                <Send size={18} />
                Enviar
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Central de Atendimento</h3>
            <p className="text-center max-w-xs">Selecione um chat na lateral para iniciar o atendimento ao cliente.</p>
          </div>
        )}
      </div>
    </div>
  );
};
