import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, X, Send, Headset } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  timestamp: any;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !isOpen) return;

    const rId = user.uid;
    setRoomId(rId);

    // Create/Update room in Firestore
    const roomRef = doc(db, 'chat_rooms', rId);
    setDoc(roomRef, {
      uid: user.uid,
      userName: user.displayName || 'Usuário',
      userRole: 'user',
      status: 'OPEN',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Listen for messages in Firestore
    const q = query(collection(db, 'chat_rooms', rId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });

    // Socket.io for real-time signaling
    socketRef.current = io();
    socketRef.current.emit('join_room', rId);

    return () => {
      unsubscribe();
      socketRef.current?.disconnect();
    };
  }, [user, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !roomId) return;

    const newMessage = {
      roomId,
      senderId: user.uid,
      senderName: user.displayName || 'Usuário',
      senderRole: 'user',
      text: message,
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'chat_rooms', roomId, 'messages'), newMessage);
      
      await updateDoc(doc(db, 'chat_rooms', roomId), {
        lastMessage: message,
        updatedAt: serverTimestamp(),
      });

      socketRef.current?.emit('send_message', {
        roomID: roomId,
        message: message,
        sender: user.displayName || 'Usuário',
        senderRole: 'user',
        timestamp: new Date().toISOString(),
      });

      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden border border-slate-200 mb-4"
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Headset size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Suporte SupplyPay</h3>
                  <p className="text-xs text-emerald-100">Online agora</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="text-slate-400" size={24} />
                  </div>
                  <p className="text-slate-500 text-sm">Olá! Como podemos ajudar você hoje?</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                      msg.senderId === user?.uid
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-[10px] mt-1 block opacity-70 ${msg.senderId === user?.uid ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Enviando...'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 hover:scale-110 transition-all active:scale-95 flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};
