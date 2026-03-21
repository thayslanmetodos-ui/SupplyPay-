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
  addDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  increment,
  limit
} from 'firebase/firestore';
import { User, Transaction, AppNotification } from '../types';
import { getSecurityLevel, getLevelStyles, getLevelIcon } from '../constants';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { 
  LayoutGrid, 
  Bell, 
  Wallet, 
  Plus, 
  History, 
  Search, 
  CheckCircle2, 
  Check,
  Shield, 
  ArrowRight,
  Home,
  Users,
  Repeat,
  BarChart3,
  TrendingUp,
  LogOut,
  User as UserIcon,
  X as XIcon,
  Phone,
  CreditCard,
  ShieldAlert,
  MessageCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import TransactionChat from '../components/TransactionChat';
import { ChatWidget } from '../components/ChatWidget';
import { triggerEmail } from '../services/emailTriggerService';

function WithdrawalForm({ transaction, onComplete }: { transaction: any, onComplete: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState(user?.pix_key || '');
  const [submitting, setSubmitting] = useState(false);

  const netAmount = amount ? parseFloat(amount) * 0.85 : 0;

  const handleSubmit = async (status: 'AWAITING_PAYMENT' | 'FAILED') => {
    if (status === 'AWAITING_PAYMENT' && (!amount || !pixKey)) return;
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'transactions', transaction.id);
      
      const updateData: any = {
        status: status,
        updated_at: serverTimestamp()
      };

      if (status === 'AWAITING_PAYMENT') {
        updateData.withdrawal_amount = parseFloat(amount);
        updateData.pix_key = pixKey;
      }
      
      batch.update(txRef, updateData);

      // Notify supplier
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid: transaction.supplier_id,
        message: status === 'AWAITING_PAYMENT' 
          ? `Saque de R$ ${parseFloat(amount).toFixed(2)} aprovado! O valor já está na sua conta. Por favor, realize o pagamento para a chave Pix informada.`
          : `A solicitação de saque falhou. Por favor, verifique os dados ou entre em contato com o suporte.`,
        type: status === 'AWAITING_PAYMENT' ? 'SYSTEM' : 'WITHDRAWAL_FAILED',
        transactionId: transaction.id,
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();
      onComplete();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/notifications');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl p-4 space-y-4 border border-slate-800">
      <div className="bg-brand-input p-4 rounded-xl border border-slate-800 space-y-2">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">CPF para Transferência</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black text-brand-green tracking-tight">{transaction.cpf}</p>
          <button 
            onClick={() => navigator.clipboard.writeText(transaction.cpf)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-green transition-colors"
          >
            Copiar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-slate-500 font-bold uppercase">Valor do Saque</label>
          <input 
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-brand-input border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-500 font-bold uppercase">Sua Chave Pix para Receber</label>
          <input 
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Sua chave Pix"
            className="w-full bg-brand-input border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => handleSubmit('AWAITING_PAYMENT')}
            disabled={submitting}
            className="flex-1 bg-brand-green text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-green-dark transition-all disabled:opacity-50"
          >
            {submitting ? 'Processando...' : 'Confirmar Saque'}
          </button>
          <button 
            onClick={() => handleSubmit('FAILED')}
            disabled={submitting}
            className="px-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            Falhou
          </button>
        </div>
      </div>
    </div>
  );
}

function OperatorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'profile' | 'transactions' | 'reports' | 'notifications'>('dashboard');
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [activeCpfs, setActiveCpfs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [requestingSupplier, setRequestingSupplier] = useState<User | null>(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestFee, setRequestFee] = useState('');
  const [pixKey, setPixKey] = useState(user?.pix_key || '');
  const [savingPix, setSavingPix] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (user && user.role === 'operator' && !user.operator_code) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      updateDoc(doc(db, 'users', user.uid), { operator_code: code });
    }
  }, [user]);

  useEffect(() => {
    if (window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length > 0 && window.Notification && window.Notification.permission === 'granted') {
      const lastNote = unread[0];
      new window.Notification('SupplyPay', {
        body: lastNote.message,
      });
    }
  }, [notifications.length]);
  const [searchTerm, setSearchTerm] = useState('');
  const [banner, setBanner] = useState<{ url: string; text: string } | null>(null);

  useEffect(() => {
    // Listen to banners
    const unsubBanner = onSnapshot(doc(db, 'settings', 'banners'), (doc) => {
      if (doc.exists()) {
        setBanner(doc.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/banners');
    });

    return () => unsubBanner();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to available suppliers
    const sq = query(
      collection(db, 'users'),
      where('role', '==', 'supplier'),
      where('status', '==', 'ON'),
      where('is_approved', '==', true),
      where('is_blocked', '==', false)
    );

    const unsubSuppliers = onSnapshot(sq, (snapshot) => {
      const s = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as User))
        .filter(supplier => supplier.cpf && supplier.cpf.trim() !== '');
      setSuppliers(s);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    // Listen to active CPFs (transactions in use)
    const acq = query(
      collection(db, 'transactions'),
      where('operator_id', '==', user.uid),
      where('status', 'in', ['PENDING', 'IN_USE'])
    );

    const unsubActiveCpfs = onSnapshot(acq, (snapshot) => {
      const ac = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveCpfs(ac);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    // Listen to transactions history
    const tq = query(
      collection(db, 'transactions'),
      where('operator_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    const unsubTransactions = onSnapshot(tq, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(t);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
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
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubSuppliers();
      unsubActiveCpfs();
      unsubTransactions();
      unsubNotifications();
    };
  }, [user?.uid]);

  const handleConfirmReceipt = async (tx: Transaction) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'transactions', tx.id);
      
      batch.update(txRef, { 
        status: 'COMPLETED',
        updated_at: serverTimestamp()
      });

      // Update supplier balance and points
      batch.update(doc(db, 'users', tx.supplier_id), { 
        status: 'ON',
        balance: increment(tx.supplier_fee || 0),
        level_points: increment(10)
      });

      // Update operator balance
      batch.update(doc(db, 'users', user.uid), {
        balance: increment(-(tx.amount || 0))
      });
      
      // Notify supplier
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid: tx.supplier_id,
        message: `Pagamento confirmado! A operação foi finalizada com sucesso e o valor de R$ ${tx.supplier_fee.toFixed(2)} foi creditado em sua conta.`,
        type: 'WITHDRAWAL_COMPLETED',
        transactionId: tx.id,
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();

      // Send email to supplier
      const supplierDoc = await getDoc(doc(db, 'users', tx.supplier_id));
      if (supplierDoc.exists()) {
        const supplierData = supplierDoc.data();
        if (supplierData.email) {
          triggerEmail('transaction-confirmed', {
            email: supplierData.email,
            name: supplierData.name || 'Fornecedor',
            amount: tx.amount,
            transactionId: tx.id
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/notifications');
    }
  };

  const requestCpf = async () => {
    if (!user || !requestingSupplier) return;
    if (!requestAmount || !requestFee) return;
    
    setBuying(requestingSupplier.uid);
    try {
      const batch = writeBatch(db);
      
      // Create transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        operator_id: user.uid,
        supplier_id: requestingSupplier.uid,
        amount: parseFloat(requestAmount),
        supplier_fee: parseFloat(requestFee),
        status: 'PENDING',
        created_at: serverTimestamp(),
        operator_name: user.name,
        supplier_name: requestingSupplier.name,
        // Don't send sensitive info yet
        bank: requestingSupplier.bank || '',
        operator_pix_key: user.pix_key || ''
      });

      // Notify supplier
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid: requestingSupplier.uid,
        message: `${user.name} solicitou uma operação de R$ ${parseFloat(requestAmount).toFixed(2)}`,
        type: 'PURCHASE',
        transactionId: txRef.id,
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();
      
      // Trigger email notification to supplier
      try {
        await triggerEmail('operation-request', {
          email: requestingSupplier.email,
          name: requestingSupplier.name,
          operatorName: user.name,
          amount: parseFloat(requestAmount),
          fee: parseFloat(requestFee)
        });
      } catch (emailErr) {
        console.error('Failed to send operation request email:', emailErr);
      }

      setRequestingSupplier(null);
      setRequestAmount('');
      setRequestFee('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/notifications');
    } finally {
      setBuying(null);
    }
  };

  const savePixKey = async () => {
    if (!user?.uid) return;
    setSavingPix(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        pix_key: pixKey
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSavingPix(false);
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

  const handleOperatorWithdraw = async () => {
    if (!user || !withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    if (parseFloat(withdrawAmount) > (user.balance || 0)) {
      alert('Saldo insuficiente');
      return;
    }

    setWithdrawing(true);
    try {
      const batch = writeBatch(db);
      
      // Create withdrawal request
      const requestRef = doc(collection(db, 'withdrawal_requests'));
      batch.set(requestRef, {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        amount: parseFloat(withdrawAmount),
        pix_key: user.pix_key || '',
        status: 'PENDING',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Update operator balance (lock it)
      batch.update(doc(db, 'users', user.uid), {
        balance: increment(-parseFloat(withdrawAmount))
      });

      await batch.commit();

      // Send withdrawal request email
      triggerEmail('withdrawal-request', {
        email: user.email,
        name: user.name || 'Operador',
        amount: parseFloat(withdrawAmount)
      });

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      alert('Solicitação de saque enviada com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'withdrawal_requests');
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredActiveCpfs = activeCpfs.filter(item => 
    (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.cpf || '').includes(searchTerm) ||
    (item.bank?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!user) return null;
  const unreadCount = notifications.filter(n => !n.read).length;

  const dailyVolume = transactions
    .filter(t => {
      if (!t.created_at) return false;
      const txDate = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at);
      const today = new Date();
      return txDate.toDateString() === today.toDateString();
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (false && !user.is_approved && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white pb-24 selection:bg-brand-green/30">
        <header className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center shadow-lg shadow-brand-green/20">
              <LayoutGrid className="w-5 h-5 text-black" />
            </div>
            <span className="text-lg font-black tracking-tighter">SupplyPay</span>
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 relative z-10 flex items-center justify-center text-center">
          <div className="bg-brand-card border border-brand-border p-12 rounded-[40px] space-y-6">
            <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Aprovação Pendente</h2>
            <p className="text-slate-400 text-sm">Sua conta de operador está aguardando aprovação administrativa.</p>
            <button onClick={logout} className="bg-brand-green text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">Sair</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white pb-24 selection:bg-brand-green/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/5 blur-[120px] rounded-full"></div>
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
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sua conta ainda não foi aprovada. Algumas funções podem estar limitadas.</p>
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
            className="relative w-full rounded-[32px] overflow-hidden border border-brand-border group"
          >
            <img 
              src={banner.url} 
              alt="Banner" 
              className="w-full h-auto transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
              <p className="text-white font-black text-sm uppercase tracking-widest drop-shadow-lg">
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
                  <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white"><XIcon className="w-4 h-4" /></button>
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
                          <Bell className="w-4 h-4" />
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

        {activeTab === 'dashboard' && (
          <>
            {/* Balance Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-green rounded-[32px] p-8 relative overflow-hidden shadow-2xl shadow-brand-green/20"
            >
              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <p className="text-black/60 text-[10px] font-black uppercase tracking-widest">Saldo Disponível</p>
                  <h2 className="text-4xl font-black text-black tracking-tighter">R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 bg-black/10 backdrop-blur-md border border-black/5 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mb-0.5">Movimentação Diária</p>
                    <p className="text-lg font-black text-black">R$ {dailyVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button 
                    onClick={() => setShowWithdrawModal(true)}
                    className="flex-1 bg-black text-white p-4 rounded-2xl flex flex-col justify-center items-center gap-1 hover:bg-black/80 transition-all"
                  >
                    <ArrowUpCircle className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sacar</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="w-14 h-14 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all text-black"
                  >
                    <History className="w-6 h-6" />
                  </button>
                </div>
              </div>
              {/* Background Icon */}
              <Wallet className="absolute -right-8 -bottom-8 w-48 h-48 text-black/5 rotate-12" />
            </motion.div>

            {/* Awaiting Payment Section */}
            {transactions.some(t => t.status === 'AWAITING_PAYMENT') && (
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-amber-500">
                  <Repeat className="w-5 h-5 animate-spin-slow" /> Aguardando Pagamento
                </h3>
                <div className="space-y-4">
                  {transactions.filter(t => t.status === 'AWAITING_PAYMENT').map(t => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-card border-2 border-amber-500/30 rounded-[32px] p-6 space-y-4 shadow-xl shadow-amber-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                            <Wallet className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">{t.supplier_name}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Aguardando Fornecedor Pagar</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-amber-500 tracking-tight">R$ {t.withdrawal_amount?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="bg-brand-input p-3 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sua Chave Pix</p>
                        <p className="text-sm font-bold text-brand-green">{t.pix_key}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Receipt Section */}
            {transactions.some(t => t.status === 'PAYMENT_CONFIRMED') && (
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-brand-green">
                  <CheckCircle2 className="w-5 h-5 animate-bounce" /> Confirmar Recebimento
                </h3>
                <div className="space-y-4">
                  {transactions.filter(t => t.status === 'PAYMENT_CONFIRMED').map(t => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-card border-2 border-brand-green/30 rounded-[32px] p-6 space-y-6 shadow-xl shadow-brand-green/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                            <Wallet className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">{t.supplier_name}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Pagamento Confirmado pelo Fornecedor</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-brand-green tracking-tight">R$ {t.withdrawal_amount?.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Valor do Saque</p>
                        </div>
                      </div>

                      <div className="bg-brand-input p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-bold text-white">O fornecedor informou que já realizou o pagamento. Verifique sua conta antes de confirmar.</p>
                      </div>

                      <button 
                        onClick={() => handleConfirmReceipt(t)}
                        className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all"
                      >
                        <Check className="w-4 h-4" /> Confirmar que Recebi
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={deleteAccount}
              className="w-full py-3 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
            >
              Apagar Minha Conta
            </button>

            {/* Quick Access or Stats */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">Resumo Operacional</h3>
              <button 
                onClick={() => setActiveTab('suppliers')}
                className="text-brand-green text-xs font-black uppercase tracking-widest hover:underline"
              >
                Fornecedores
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-card p-6 rounded-[24px] border border-brand-border group hover:border-brand-green/30 transition-colors">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">CPFs Ativos</p>
                <p className="text-3xl font-black group-hover:text-brand-green transition-colors">{activeCpfs.length}</p>
              </div>
              <div className="bg-brand-card p-6 rounded-[24px] border border-brand-border group hover:border-brand-green/30 transition-colors">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Nível</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getLevelIcon(getSecurityLevel(user.level_points || 0))}</span>
                  <p className={`text-3xl font-black ${getLevelStyles(getSecurityLevel(user.level_points || 0)).text} group-hover:text-brand-green transition-colors`}>
                    {getSecurityLevel(user.level_points || 0)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">CPFs Ativos</h3>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-green transition-colors" />
              <input 
                type="text"
                placeholder="Buscar por nome, CPF ou banco..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
              />
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando seus CPFs...</div>
              ) : filteredActiveCpfs.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-brand-card rounded-full flex items-center justify-center mx-auto border border-brand-border">
                    <Shield className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum CPF encontrado.</p>
                </div>
              ) : (
                filteredActiveCpfs.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-card border border-brand-border rounded-[32px] p-6 space-y-6 hover:border-brand-green/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg tracking-tight">{item.supplier_name}</h4>
                        {item.status === 'IN_USE' ? (
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">CPF: {item.cpf} • {item.bank}</p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Aguardando aceitação do fornecedor...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-brand-input p-3 rounded-xl border border-brand-border">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">WhatsApp</p>
                        <p className="text-sm font-bold">{item.whatsapp || 'Não informado'}</p>
                      </div>
                      <div className="bg-brand-input p-3 rounded-xl border border-brand-border">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Status</p>
                        <p className={`text-sm font-bold ${item.status === 'IN_USE' ? 'text-brand-green' : 'text-yellow-500'}`}>
                          {item.status === 'IN_USE' ? 'EM USO' : 'PENDENTE'}
                        </p>
                      </div>
                    </div>

                    {item.status === 'IN_USE' && (
                      <WithdrawalForm 
                        transaction={item} 
                        onComplete={() => {}} 
                      />
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Fornecedores Disponíveis</h3>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando fornecedores...</div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-brand-card rounded-full flex items-center justify-center mx-auto border border-brand-border">
                    <Users className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum fornecedor disponível no momento.</p>
                </div>
              ) : (
                suppliers.map((s) => (
                  <motion.div 
                    key={s.uid}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-brand-card border border-brand-border rounded-[32px] p-6 space-y-6 hover:border-brand-green/20 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-input border border-brand-border rounded-2xl flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-lg tracking-tight">{s.name}</h4>
                            <CheckCircle2 className="w-4 h-4 text-brand-green" />
                          </div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{s.bank} • Ag 0001</p>
                        </div>
                      </div>
                      <div className="bg-brand-green/10 px-3 py-1 rounded-full flex items-center gap-2 border border-brand-green/20">
                        <Shield className="w-3 h-3 text-brand-green" />
                        <span className="text-[10px] font-black text-brand-green uppercase tracking-widest">Alta</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-600">Confiabilidade Operacional</span>
                        <span className="text-brand-green">90%</span>
                      </div>
                      <div className="h-1.5 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                        <div className="h-full bg-brand-green w-[90%] rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setRequestingSupplier(s)}
                      className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 active:scale-95"
                    >
                      <Repeat className="w-5 h-5" /> Solicitar Operação
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Request Modal */}
        <AnimatePresence>
          {requestingSupplier && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRequestingSupplier(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-6 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight">Solicitar Operação</h3>
                  <button onClick={() => setRequestingSupplier(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <XIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor da Operação (R$)</label>
                    <input 
                      type="number"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-brand-input border border-brand-border rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Taxa do Fornecedor (R$)</label>
                    <input 
                      type="number"
                      value={requestFee}
                      onChange={(e) => setRequestFee(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-brand-input border border-brand-border rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                </div>

                <button 
                  onClick={requestCpf}
                  disabled={buying !== null}
                  className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50"
                >
                  {buying ? 'Enviando...' : 'Confirmar Solicitação'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Histórico</h3>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando transações...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-brand-card rounded-full flex items-center justify-center mx-auto border border-brand-border">
                    <History className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhuma transação.</p>
                </div>
              ) : (
                transactions.map((t) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-brand-card border border-brand-border rounded-[24px] p-4 flex items-center justify-between hover:border-brand-green/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        t.status === 'COMPLETED' ? 'bg-brand-green/10 text-brand-green' : 
                        t.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 
                        'bg-brand-green/10 text-brand-green'
                      }`}>
                        <Repeat className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-sm tracking-tight">{t.supplier_name}</p>
                        <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : 'Agora'} • {t.status}
                        </p>
                        {(t.status === 'IN_USE' || t.status === 'COMPLETED') && (
                          <div className="mt-2 p-2 bg-brand-green/5 border border-brand-green/20 rounded-lg space-y-1">
                            <p className="text-[10px] font-black text-brand-green uppercase tracking-widest flex items-center gap-1">
                              <Shield className="w-3 h-3" /> CPF: {t.cpf}
                            </p>
                            <p className="text-[10px] font-black text-brand-green uppercase tracking-widest flex items-center gap-1">
                              <Phone className="w-3 h-3" /> Whats: {t.whatsapp}
                            </p>
                            {t.operator_pix_key && (
                              <p className="text-[10px] font-black text-brand-green uppercase tracking-widest flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> Pix: {t.operator_pix_key}
                              </p>
                            )}
                          </div>
                        )}
                        <button 
                          onClick={() => setActiveChat(t)}
                          className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-brand-input border border-brand-border rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-green hover:border-brand-green/20 transition-all"
                        >
                          <MessageCircle className="w-3 h-3" /> Abrir Chat
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm tracking-tight">R$ {t.amount.toFixed(2)}</p>
                      {t.withdrawal_amount && (
                        <p className="text-[10px] text-brand-green font-black uppercase tracking-widest">Saque: R$ {t.withdrawal_amount.toFixed(2)}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Meu Perfil</h3>
            </div>

            <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-brand-green text-black rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl shadow-brand-green/20">
                  {user.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight">{user.name}</h4>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{user.email}</p>
                </div>
              </div>

              <div className="h-px bg-brand-border" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chave Pix para Recebimento</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Sua chave Pix"
                      className="flex-1 bg-brand-input border border-brand-border rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
                    />
                    <button 
                      onClick={savePixKey}
                      disabled={savingPix}
                      className="bg-brand-green text-black px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-green-dark transition-all disabled:opacity-50"
                    >
                      {savingPix ? '...' : 'Salvar'}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-600 font-medium italic">Esta chave será mostrada ao fornecedor quando você solicitar um saque.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={deleteAccount}
              className="w-full py-4 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/10 rounded-2xl transition-colors border border-red-500/20"
            >
              Apagar Minha Conta
            </button>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Ganhos e Estatísticas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Total Movimentado</p>
                    <p className="text-4xl font-black tracking-tighter">R$ {transactions.filter(t => t.status === 'COMPLETED' || t.status === 'IN_USE').reduce((acc, curr) => acc + (curr.amount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center border border-brand-green/20">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>
                <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                  <div className="h-full bg-brand-green w-[75%] rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                </div>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Baseado em operações ativas e concluídas</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Total em Saques</p>
                    <p className="text-4xl font-black tracking-tighter text-brand-green">R$ {transactions.filter(t => t.status === 'COMPLETED' && t.withdrawal_amount).reduce((acc, curr) => acc + (curr.withdrawal_amount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center border border-brand-green/20">
                    <CreditCard className="w-7 h-7" />
                  </div>
                </div>
                <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                  <div className="h-full bg-brand-green w-[45%] rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                </div>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Valores confirmados pelos fornecedores</p>
              </motion.div>
            </div>

            {/* Performance Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6"
            >
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-600">Volume de Operações (Últimos 7 dias)</h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                      const volume = transactions
                        .filter(t => {
                          if (!t.created_at) return false;
                          const txDate = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at);
                          return txDate.toLocaleDateString('pt-BR') === date.toLocaleDateString('pt-BR');
                        })
                        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                      return { name: dateStr, volume };
                    })}
                  >
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748b', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `R$ ${value}`}
                      tick={{ fill: '#64748b', fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorVolume)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-8">
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-600">Bancos Utilizados</h4>
              <div className="space-y-6">
                {Array.from(new Set(transactions.map(t => t.bank))).filter(Boolean).map((bankName, i) => {
                  const count = transactions.filter(t => t.bank === bankName).length;
                  const percentage = (count / (transactions.length || 1)) * 100;
                  return (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">{bankName}</span>
                        <span className="text-white">{count} Operações</span>
                      </div>
                      <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                        <div 
                          className="h-full bg-brand-green rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
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
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'suppliers' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Fornecer</span>
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
          <span className="text-[9px] font-black uppercase tracking-widest">Ganhos</span>
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

      {/* Operator Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green">
                    <ArrowUpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Solicitar Saque</h3>
                </div>
                <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-brand-input p-6 rounded-2xl border border-brand-border space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Disponível</p>
                <p className="text-3xl font-black text-brand-green tracking-tighter">R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor do Saque (R$)</label>
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-brand-input border border-brand-border rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sua Chave Pix</label>
                  <div className="w-full bg-brand-input border border-brand-border rounded-2xl p-4 text-sm text-slate-400 font-bold">
                    {user.pix_key || 'Não cadastrada no perfil'}
                  </div>
                  {!user.pix_key && (
                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest">Atenção: Cadastre sua chave Pix no perfil antes de solicitar o saque.</p>
                  )}
                </div>
              </div>

              <button 
                onClick={handleOperatorWithdraw}
                disabled={withdrawing || !withdrawAmount || !user.pix_key || parseFloat(withdrawAmount) > (user.balance || 0)}
                className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50"
              >
                {withdrawing ? 'Processando...' : 'Confirmar Solicitação'}
              </button>
              
              <p className="text-[9px] text-slate-600 text-center font-black uppercase tracking-widest">O valor será enviado para sua chave Pix após aprovação administrativa.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OperatorDashboard;
