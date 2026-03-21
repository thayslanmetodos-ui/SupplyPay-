import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { X, Send, User, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { triggerEmail } from '../services/emailTriggerService';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  created_at: any;
}

interface TransactionChatProps {
  transactionId: string;
  operatorId: string;
  supplierId: string;
  onClose: () => void;
}

export default function TransactionChat({ transactionId, operatorId, supplierId, onClose }: TransactionChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transactionId || !user) return;

    let q;
    if (user.role === 'admin') {
      q = query(
        collection(db, 'messages'),
        where('transactionId', '==', transactionId),
        orderBy('created_at', 'asc')
      );
    } else {
      q = query(
        collection(db, 'messages'),
        where('transactionId', '==', transactionId),
        where(user.role === 'operator' ? 'operator_id' : 'supplier_id', '==', user.uid),
        orderBy('created_at', 'asc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messages');
      setLoading(false);
    });

    return () => unsub();
  }, [transactionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        transactionId,
        operator_id: operatorId,
        supplier_id: supplierId,
        senderId: user.uid,
        senderName: user.name || 'Usuário',
        text,
        created_at: serverTimestamp()
      });

      // Send email to the other party
      const recipientId = user.uid === operatorId ? supplierId : operatorId;
      const recipientDoc = await getDoc(doc(db, 'users', recipientId));
      if (recipientDoc.exists()) {
        const recipientData = recipientDoc.data();
        if (recipientData.email) {
          triggerEmail('new-message', {
            email: recipientData.email,
            name: recipientData.name || 'Usuário',
            senderName: user.name || 'Usuário',
            message: text
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[600px] max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-input/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Chat da Operação</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ID: {transactionId.substring(0, 8)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Carregando mensagens...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-30">
              <MessageSquare className="w-12 h-12" />
              <p className="text-[10px] font-black uppercase tracking-widest">Inicie a conversa</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-bold ${
                  msg.senderId === user?.uid 
                    ? 'bg-brand-green text-black rounded-tr-none' 
                    : 'bg-brand-input border border-brand-border text-white rounded-tl-none'
                }`}>
                  <p className="text-[9px] uppercase tracking-widest opacity-50 mb-1">
                    {msg.senderId === user?.uid ? 'Você' : msg.senderName}
                  </p>
                  {msg.text}
                </div>
                <p className="text-[8px] uppercase tracking-widest text-slate-600 mt-1">
                  {msg.created_at?.toDate ? msg.created_at.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '...'}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-6 border-t border-brand-border bg-brand-input/30">
          <div className="flex gap-2">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-brand-input border border-brand-border rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-brand-green text-black w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
