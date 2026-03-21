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
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { Transaction, AppNotification } from '../types';
import { getSecurityLevel, getLevelStyles, getLevelIcon } from '../constants';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { triggerEmail } from '../services/emailTriggerService';
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
  Repeat,
  Check,
  XCircle,
  Phone,
  Shield,
  ShieldAlert,
  MessageCircle,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import TransactionChat from '../components/TransactionChat';
import { ChatWidget } from '../components/ChatWidget';

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'reports' | 'notifications'>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    cpf: user?.cpf || '',
    bank: user?.bank || '',
    whatsapp: user?.whatsapp || ''
  });
  const [saving, setSaving] = useState(false);
  const [showCpfWarningModal, setShowCpfWarningModal] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        cpf: user.cpf || '',
        bank: user.bank || '',
        whatsapp: user.whatsapp || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...editForm,
        updated_at: serverTimestamp()
      });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length > 0 && window.Notification && window.Notification.permission === 'granted') {
      const lastNote = unread[0];
      new window.Notification('SupplyPay', {
        body: lastNote.message,
      });
    }
  }, [notifications.length]);
  const [banner, setBanner] = useState<{ url: string, text: string } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to banner
    const unsubBanner = onSnapshot(doc(db, 'settings', 'banners'), (doc) => {
      if (doc.exists()) {
        setBanner(doc.data() as any);
      }
    });

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
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(notes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubBanner();
      unsubTransactions();
      unsubNotifications();
    };
  }, [user?.uid]);

  const toggleStatus = async () => {
    if (!user?.uid) return;
    if (!user.cpf && user.status !== 'ON') {
      setShowCpfWarningModal(true);
      return;
    }
    try {
      const newStatus = user.status === 'ON' ? 'OFF' : 'ON';
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'users', user.uid), {
        status: newStatus
      });

      if (newStatus === 'ON') {
        // Trigger email
        await triggerEmail('status-active', {
          email: user.email,
          name: user.name
        });

        // Notify all operators
        const operatorsQuery = query(collection(db, 'users'), where('role', '==', 'operator'));
        const operatorsSnapshot = await getDocs(operatorsQuery);
        
        operatorsSnapshot.forEach((opDoc) => {
          const noteRef = doc(collection(db, 'notifications'));
          batch.set(noteRef, {
            uid: opDoc.id,
            message: `Novo fornecedor disponível: ${user.name} está pronto para fornecer CPFs!`,
            type: 'SYSTEM',
            created_at: serverTimestamp(),
            read: false
          });
        });
      }

      await batch.commit();
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
    // Funcionalidade de exclusão requer confirmação administrativa.
  };

  const handleRequest = async (tx: Transaction, status: 'IN_USE' | 'FAILED') => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'transactions', tx.id);
      
      if (status === 'IN_USE') {
        batch.update(txRef, { 
          status: 'IN_USE',
          cpf: user.cpf || '',
          whatsapp: user.whatsapp || '',
          bank: user.bank || ''
        });
        
        // Set supplier to OFF so they don't appear for others
        batch.update(doc(db, 'users', user.uid), { status: 'OFF' });
        
        // Notify operator
        const noteRef = doc(collection(db, 'notifications'));
        batch.set(noteRef, {
          uid: tx.operator_id,
          message: `${user.name} aceitou sua solicitação! CPF liberado.`,
          type: 'SYSTEM',
          transactionId: tx.id,
          created_at: serverTimestamp(),
          read: false
        });
      } else {
        batch.update(txRef, { status: 'FAILED' });
        
        // Notify operator
        const noteRef = doc(collection(db, 'notifications'));
        batch.set(noteRef, {
          uid: tx.operator_id,
          message: `${user.name} recusou sua solicitação de operação.`,
          type: 'SYSTEM',
          transactionId: tx.id,
          created_at: serverTimestamp(),
          read: false
        });
      }

      await batch.commit();

      // Send email to operator
      const operatorDoc = await getDoc(doc(db, 'users', tx.operator_id));
      if (operatorDoc.exists()) {
        const operatorData = operatorDoc.data();
        if (operatorData.email) {
          triggerEmail(status === 'IN_USE' ? 'operation-accepted' : 'operation-rejected', {
            email: operatorData.email,
            name: operatorData.name || 'Operador',
            supplierName: user.name || 'Fornecedor'
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/notifications');
    }
  };

  const handleConfirmPayment = async (tx: Transaction) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'transactions', tx.id);
      
      batch.update(txRef, { 
        status: 'PAYMENT_CONFIRMED',
        updated_at: serverTimestamp()
      });
      
      // Notify operator
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid: tx.operator_id,
        message: `${user.name} confirmou o pagamento do saque de R$ ${tx.withdrawal_amount?.toFixed(2)}. Por favor, confirme o recebimento.`,
        type: 'SYSTEM',
        transactionId: tx.id,
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/notifications');
    }
  };

  if (!user) return null;
  const unreadCount = notifications.filter(n => !n.read).length;

  const totalEarnings = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((acc, t) => acc + (t.supplier_fee || 0), 0);

  const totalWithdrawals = transactions
    .filter(t => t.status === 'COMPLETED' && t.withdrawal_amount)
    .reduce((acc, t) => acc + (t.withdrawal_amount || 0), 0);

  const pendingEarnings = transactions
    .filter(t => t.status === 'IN_USE' || t.status === 'PENDING')
    .reduce((acc, t) => acc + (t.supplier_fee || 0), 0);

  const isAdmin = user.role === 'admin' || user.email === 'suportethayslanbssns@gmail.com';

  const securityLevel = getSecurityLevel(user.level_points || 0);
  const styles = getLevelStyles(securityLevel);
  const LevelIcon = getLevelIcon(securityLevel);

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
        {!user.is_approved && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-lg tracking-tight text-amber-500">Aprovação Pendente</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sua conta está aguardando aprovação administrativa baseada no seu WhatsApp. Você não aparecerá para os operadores até ser aprovado.</p>
              </div>
            </div>
            <a 
              href="https://wa.me/5573998189194?text=Quero%20ser%20aprovado%20no%20supply-pay"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500 text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Phone className="w-4 h-4" /> Solicitar Acesso
            </a>
          </motion.div>
        )}
        {/* Banner */}
        {banner && banner.url && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full rounded-[32px] overflow-hidden border border-brand-green/20 group"
          >
            <img 
              src={banner.url} 
              alt="Banner" 
              className="w-full h-auto transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex items-center px-8">
              <p className="text-sm font-black uppercase tracking-widest text-white max-w-[200px] leading-relaxed">
                {banner.text}
              </p>
            </div>
          </motion.div>
        )}

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

        {/* Main Content Sections */}
        {activeTab === 'home' && (
          <>
            {/* Balance Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-green p-8 rounded-[40px] relative overflow-hidden shadow-2xl shadow-brand-green/20"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-black/60">
                    <Wallet className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Saldo Disponível</span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-black/40" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-black/60 text-xl font-black">R$</span>
                  <h2 className="text-5xl font-black text-black tracking-tighter">
                    {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="pt-4 flex items-center gap-4">
                  <div className="bg-black/10 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <ArrowUpRight className="w-3 h-3 text-black/60" />
                    <span className="text-[10px] font-black text-black/80 uppercase tracking-widest">
                      + R$ {totalEarnings.toFixed(2)} Total
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CPF Warning */}
            {!user.cpf && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border-2 border-dashed border-red-500/30 p-6 rounded-[32px] flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-red-500 uppercase tracking-tight">CPF Obrigatório</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                    Você precisa preencher seu CPF no perfil para aparecer no painel dos operadores.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Resolver
                </button>
              </motion.div>
            )}

            {/* Pending Requests */}
            {transactions.some(t => t.status === 'PENDING') && (
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-brand-green">
                  <Bell className="w-5 h-5 animate-pulse" /> Solicitações Pendentes
                </h3>
                <div className="space-y-4">
                  {transactions.filter(t => t.status === 'PENDING').map(t => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-card border-2 border-brand-green/30 rounded-[32px] p-6 space-y-6 shadow-xl shadow-brand-green/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                            <Repeat className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">{t.operator_name}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Solicitou uma operação</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-brand-green tracking-tight">R$ {t.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sua Taxa: R$ {t.supplier_fee.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleRequest(t, 'IN_USE')}
                          className="bg-brand-green text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all"
                        >
                          <Check className="w-4 h-4" /> Aceitar
                        </button>
                        <button 
                          onClick={() => handleRequest(t, 'FAILED')}
                          className="bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                        >
                          <XCircle className="w-4 h-4" /> Recusar
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Payments */}
            {transactions.some(t => t.status === 'AWAITING_PAYMENT') && (
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-amber-500">
                  <Wallet className="w-5 h-5 animate-pulse" /> Pagamentos Pendentes
                </h3>
                <div className="space-y-4">
                  {transactions.filter(t => t.status === 'AWAITING_PAYMENT').map(t => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-card border-2 border-amber-500/30 rounded-[32px] p-6 space-y-6 shadow-xl shadow-amber-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                            <ArrowUpRight className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">{t.operator_name}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Saque Aprovado</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-amber-500 tracking-tight">R$ {t.withdrawal_amount?.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Pagar para o Operador</p>
                        </div>
                      </div>

                      <div className="bg-brand-input p-4 rounded-xl border border-slate-800 space-y-2">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Chave Pix do Operador</p>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-black text-brand-green tracking-tight">{t.pix_key}</p>
                          <button 
                            onClick={() => navigator.clipboard.writeText(t.pix_key || '')}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-green transition-colors"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleConfirmPayment(t)}
                        className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all"
                      >
                        <Check className="w-4 h-4" /> Já Realizei o Pagamento
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Operator Confirmation */}
            {transactions.some(t => t.status === 'PAYMENT_CONFIRMED') && (
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-brand-green">
                  <CheckCircle2 className="w-5 h-5 animate-pulse" /> Pagamento em Verificação
                </h3>
                <div className="space-y-4">
                  {transactions.filter(t => t.status === 'PAYMENT_CONFIRMED').map(t => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-card border border-brand-green/20 rounded-[32px] p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">{t.operator_name}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Aguardando Operador Confirmar Recebimento</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-brand-green tracking-tight">R$ {t.withdrawal_amount?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="bg-brand-input p-3 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Status</p>
                        <p className="text-sm font-bold text-white">Você já confirmou o pagamento. O operador está verificando a conta.</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats (Home) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-card p-6 rounded-[24px] border border-brand-border">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Status Atual</p>
                <button 
                  onClick={toggleStatus}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] tracking-[0.1em] transition-all ${user.status === 'ON' ? 'bg-brand-green text-black' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                >
                  <Power className="w-3.5 h-3.5" /> {user.status === 'ON' ? 'DISPONÍVEL' : 'OFFLINE'}
                </button>
              </div>
              <div className="bg-brand-card p-6 rounded-[24px] border border-brand-border">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Pontos</p>
                <p className="text-2xl font-black text-white">{user.level_points || 0}</p>
              </div>
            </div>

            {/* Active Operations */}
            {transactions.some(t => t.status === 'IN_USE') && (
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-tight">Operações em Andamento</h3>
                {transactions.filter(t => t.status === 'IN_USE').map(t => (
                  <div key={t.id} className="bg-brand-card border border-brand-green/20 p-6 rounded-[32px] space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-black tracking-tight">{t.operator_name}</p>
                      <p className="text-brand-green font-black">R$ {t.amount.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => setActiveChat(t)}
                      className="w-full bg-brand-input border border-brand-border py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" /> Chat da Operação
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'profile' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* CPF Warning in Profile */}
            {!user.cpf && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                  Preencha seu CPF para começar a receber solicitações.
                </p>
              </div>
            )}

            <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-8">
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
                onClick={() => setIsEditing(!isEditing)}
                className="text-brand-green text-xs font-black uppercase tracking-widest hover:underline"
              >
                {isEditing ? 'Cancelar' : 'Editar Perfil'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nome Completo</label>
                  <input 
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-brand-input border border-brand-border rounded-xl p-4 text-sm focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">CPF (Obrigatório para aparecer no painel)</label>
                  <input 
                    type="text"
                    value={editForm.cpf}
                    onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full bg-brand-input border border-brand-border rounded-xl p-4 text-sm focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Banco / Chave PIX</label>
                  <input 
                    type="text"
                    value={editForm.bank}
                    onChange={(e) => setEditForm({...editForm, bank: e.target.value})}
                    placeholder="Ex: Nubank - Chave CPF"
                    className="w-full bg-brand-input border border-brand-border rounded-xl p-4 text-sm focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">WhatsApp</label>
                  <input 
                    type="text"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({...editForm, whatsapp: e.target.value})}
                    className="w-full bg-brand-input border border-brand-border rounded-xl p-4 text-sm focus:outline-none focus:border-brand-green"
                  />
                </div>
                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">CPF</p>
                  <p className="font-bold text-sm">{user.cpf || 'N/A'}</p>
                </div>
                <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Banco</p>
                  <p className="font-bold text-sm">{user.bank || 'N/A'}</p>
                </div>
                <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1 col-span-2">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">WhatsApp</p>
                  <p className="font-bold text-sm">{user.whatsapp || 'N/A'}</p>
                </div>
              </div>
            )}

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
          </div>
        </motion.div>
      )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
            {/* Earnings Summary */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Resumo de Ganhos</h4>
                  <TrendingUp className="w-5 h-5 text-brand-green" />
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Ganho</p>
                    <p className="text-2xl font-black text-brand-green tracking-tighter">R$ {totalEarnings.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saques Realizados</p>
                    <p className="text-2xl font-black text-white tracking-tighter">R$ {totalWithdrawals.toFixed(2)}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-brand-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ganhos Pendentes</p>
                    <p className="text-lg font-black text-amber-500 tracking-tighter">R$ {pendingEarnings.toFixed(2)}</p>
                  </div>
                  <div className="bg-amber-500/10 px-4 py-2 rounded-xl">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Aguardando</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-green" /> Histórico de Transações
                </h3>
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
                        <button 
                          onClick={() => setActiveChat(t)}
                          className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-brand-input border border-brand-border rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-green hover:border-brand-green/20 transition-all"
                        >
                          <MessageCircle className="w-3 h-3" /> Abrir Chat
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand-green tracking-tight">
                        {t.withdrawal_amount ? `Saque: R$ ${t.withdrawal_amount.toFixed(2)}` : `R$ ${t.amount.toFixed(2)}`}
                      </p>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">{t.status}</span>
                      {t.pix_key && (
                        <p className="text-[9px] font-black text-brand-green uppercase tracking-widest mt-1">Pix: {t.pix_key}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Histórico de Notificações</h3>
              <button 
                onClick={clearNotifications}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
              >
                Limpar Tudo
              </button>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="bg-brand-card border border-brand-border rounded-[32px] p-12 text-center">
                  <div className="w-16 h-16 bg-brand-border rounded-2xl flex items-center justify-center text-slate-700 mx-auto mb-4">
                    <Bell className="w-8 h-8" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhuma notificação encontrada.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => markNotificationRead(n.id)}
                    className={`bg-brand-card border border-brand-border p-6 rounded-[24px] flex items-start gap-4 hover:border-brand-green/30 transition-all cursor-pointer ${!n.read ? 'bg-brand-green/5 border-brand-green/20' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-border text-slate-500'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm ${!n.read ? 'text-white font-bold' : 'text-slate-400'}`}>{n.message}</p>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                        {n.created_at?.toDate().toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 bg-brand-green rounded-full mt-2"></div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark/80 backdrop-blur-2xl border-t border-brand-border px-6 py-4 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'home' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'reports' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Reports</span>
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === 'notifications' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Bell className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Avisos</span>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 bg-brand-green text-black text-[8px] font-black rounded-full flex items-center justify-center border-2 border-brand-dark">
              {unreadCount}
            </span>
          )}
        </button>
        <button onClick={logout} className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-red-500 transition-all">
          <LogOut className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Sair</span>
        </button>
      </nav>

      <AnimatePresence>
        {activeChat && (
          <TransactionChat 
            transactionId={activeChat.id}
            operatorId={activeChat.operator_id}
            supplierId={activeChat.supplier_id}
            onClose={() => setActiveChat(null)}
          />
        )}
      </AnimatePresence>

      <ChatWidget />

      <AnimatePresence>
        {showCpfWarningModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-brand-card border border-brand-border p-8 rounded-[40px] max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">CPF Obrigatório</h3>
                <p className="text-sm text-slate-400">Você precisa preencher seu CPF no perfil antes de ficar disponível para os operadores.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowCpfWarningModal(false);
                    setActiveTab('profile');
                  }}
                  className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all"
                >
                  Ir para Perfil
                </button>
                <button 
                  onClick={() => setShowCpfWarningModal(false)}
                  className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest py-2"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
