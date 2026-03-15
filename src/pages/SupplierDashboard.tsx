import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { Transaction, Notification } from '../types';
import { getSecurityLevel, getLevelStyles, getLevelIcon } from '../constants';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { 
  User as UserIcon, 
  CreditCard, 
  Power, 
  Bell, 
  History, 
  LayoutGrid, 
  LogOut,
  Home,
  BarChart3,
  CheckCircle2,
  X,
  Repeat
} from 'lucide-react';

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to transactions
    const q = query(
      collection(db, 'transactions'),
      where('supplier_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubTransactions = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    // Listen to notifications
    const nq = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubNotifications = onSnapshot(nq, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubTransactions();
      unsubNotifications();
    };
  }, [user?.uid]);

  const toggleStatus = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: user.status === 'ON' ? 'OFF' : 'ON'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const clearNotifications = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(note => {
        batch.delete(doc(db, 'notifications', note.id));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications');
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Tem certeza que deseja apagar sua conta? Esta ação é irreversível.')) return;
    alert('Funcionalidade de exclusão requer confirmação administrativa.');
  };

  if (!user) return null;

  const securityLevel = getSecurityLevel(user.level_points || 0);
  const styles = getLevelStyles(securityLevel);
  const LevelIcon = getLevelIcon(securityLevel);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white pb-24 selection:bg-brand-green/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-green/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center shadow-lg shadow-brand-green/20">
            <LayoutGrid className="w-5 h-5 text-black" />
          </div>
          <span className="text-lg font-black tracking-tighter">SupplyPay</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-brand-green transition-colors relative"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-green rounded-full border-2 border-brand-dark"></span>
            )}
          </button>
          <div className="w-10 h-10 bg-brand-green text-black rounded-full flex items-center justify-center font-black text-xs border-2 border-brand-green/20">
            {user.name?.substring(0, 2).toUpperCase()}
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 relative z-10">
        {/* Notifications Overlay */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-16 right-6 w-80 bg-brand-card border border-brand-border rounded-2xl shadow-2xl z-[60] overflow-hidden"
            >
              <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-input">
                <h4 className="text-xs font-black uppercase tracking-widest">Notificações</h4>
                <div className="flex items-center gap-2">
                  <button onClick={clearNotifications} className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase font-black">Limpar</button>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Sem notificações</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-4 border-b border-brand-border hover:bg-white/5 transition-colors cursor-pointer ${!n.read ? 'bg-brand-green/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-brand-green/10 rounded-lg flex items-center justify-center text-brand-green shrink-0">
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-200">{n.message}</p>
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString() : 'Agora'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-input border border-brand-border rounded-2xl flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">{user.name}</h2>
                  <CheckCircle2 className="w-5 h-5 text-brand-green" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor Verificado</p>
              </div>
            </div>
            <button 
              onClick={toggleStatus}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[10px] tracking-[0.1em] transition-all shadow-lg ${user.status === 'ON' ? 'bg-brand-green text-black shadow-brand-green/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
            >
              <Power className="w-3.5 h-3.5" /> {user.status === 'ON' ? 'DISPONÍVEL' : 'OFFLINE'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">CPF</p>
              <p className="font-bold text-sm">{user.cpf || 'N/A'}</p>
            </div>
            <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Banco</p>
              <p className="font-bold text-sm">{user.bank || 'N/A'}</p>
            </div>
          </div>

          {/* Security Level */}
          <div className={`${styles.lightBg} border ${styles.border} rounded-[24px] p-6 space-y-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-black/20 ${styles.text}`}>
                  <span className="text-xl">{LevelIcon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Nível de Segurança</p>
                  <p className={`text-xl font-black tracking-tight ${styles.text}`}>{securityLevel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Pontos</p>
                <p className="text-xl font-black text-white tracking-tight">{user.level_points || 0}</p>
              </div>
            </div>
            <div className="h-2.5 bg-brand-input rounded-full overflow-hidden border border-brand-border">
              <div 
                className={`h-full transition-all duration-1000 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] ${styles.bg}`}
                style={{ width: `${Math.min(((user.level_points || 0) / 20000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <button 
            onClick={deleteAccount}
            className="w-full py-3 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
          >
            Apagar Minha Conta
          </button>
        </motion.div>

        {/* History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-brand-green" /> Histórico de Ganhos
            </h3>
            <button className="text-brand-green text-[10px] font-black uppercase tracking-widest hover:underline">Ver tudo</button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-600 font-black uppercase tracking-widest text-[10px]">Carregando histórico...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-600 font-black uppercase tracking-widest text-[10px]">Nenhuma transação encontrada.</div>
            ) : (
              transactions.map((t) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-brand-card border border-brand-border p-5 rounded-[24px] flex items-center justify-between hover:border-brand-green/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-brand-input border border-brand-border rounded-xl flex items-center justify-center text-slate-500">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight">Venda de CPF</p>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : 'Agora'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-brand-green tracking-tight">+ R$ 2,70</p>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.status}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark/80 backdrop-blur-2xl border-t border-brand-border px-6 py-4 flex items-center justify-between z-50">
        <button className="flex flex-col items-center gap-1.5 text-brand-green scale-110 transition-all">
          <Home className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-400 transition-all">
          <UserIcon className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-400 transition-all">
          <BarChart3 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Ganhos</span>
        </button>
        <button onClick={logout} className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-red-500 transition-all">
          <LogOut className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Sair</span>
        </button>
      </nav>
    </div>
  );
}
