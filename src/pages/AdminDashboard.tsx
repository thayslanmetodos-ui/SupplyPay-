import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User, SystemSettings, Transaction, AppNotification } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  query, 
  where, 
  serverTimestamp,
  writeBatch,
  addDoc,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { 
  Users, 
  Settings, 
  ShieldAlert, 
  DollarSign, 
  TrendingUp, 
  Search, 
  LayoutGrid, 
  Bell, 
  LogOut,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Ban,
  Image as ImageIcon,
  X,
  Repeat,
  History as HistoryIcon,
  User as UserIcon,
  Headset,
  Mail,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { AdminChat } from '../components/AdminChat';
import EmailLogs from '../components/EmailLogs';
import { triggerEmail } from '../services/emailTriggerService';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [banners, setBanners] = useState<{ url: string, text: string } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Modal states
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean, userId: string, userName: string }>({ isOpen: false, userId: '', userName: '' });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPoints, setNewPoints] = useState<number>(0);
  const [messageText, setMessageText] = useState('');

  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'settings' | 'reports' | 'profile' | 'chat' | 'emails' | 'withdrawals'>('users');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [txSearchTerm, setTxSearchTerm] = useState('');

  const transactionStats = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    const volume = allTransactions
      .filter(tx => {
        const txDate = tx.created_at?.toDate();
        return txDate && txDate.toDateString() === date.toDateString();
      })
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);
    return { name: dayName, volume };
  });

  const updatePoints = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        level_points: newPoints
      });
      
      // Notify user about security level update
      await addDoc(collection(db, 'notifications'), {
        uid: uid,
        message: `Seu nível de segurança foi atualizado! Seus pontos agora são: ${newPoints}`,
        type: 'SYSTEM',
        read: false,
        created_at: serverTimestamp()
      });
      
      setSelectedUser(prev => prev ? { ...prev, level_points: newPoints } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  useEffect(() => {
    // Listen to all users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    // Listen to settings
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      const settingsData: any = {};
      snapshot.docs.forEach(doc => {
        if (doc.id === 'banners') {
          setBanners(doc.data() as any);
        } else {
          settingsData[doc.id] = parseFloat(doc.data().value);
        }
      });
      setSettings(settingsData as SystemSettings);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'settings');
    });

    // Listen to transactions
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setAllTransactions(txs);
      
      // Calculate stats
      const totalVolume = txs.reduce((acc, tx) => acc + (tx.amount || 0), 0);
      const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
      const pendingApproval = users.filter(u => !u.is_approved && u.role !== 'admin').length;
      
      setStats({
        totalUsers: users.length,
        totalVolume,
        totalBalance,
        pendingApproval,
        pendingWithdrawals: withdrawalRequests.filter(w => w.status === 'PENDING').length
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    // Listen to withdrawal requests
    const unsubWithdrawals = onSnapshot(query(collection(db, 'withdrawal_requests'), orderBy('created_at', 'desc')), (snapshot) => {
      setWithdrawalRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'withdrawal_requests');
    });

    return () => {
      unsubUsers();
      unsubSettings();
      unsubTransactions();
      unsubWithdrawals();
    };
  }, [users.length, withdrawalRequests.length]); // Re-calculate stats when users list or withdrawals change

  const toggleBlock = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        is_blocked: !currentStatus,
        status: !currentStatus ? 'OFF' : 'ON' // Force offline if blocked
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        uid: messageModal.userId,
        message: messageText,
        type: 'ADMIN_MSG',
        read: false,
        created_at: serverTimestamp()
      });
      setMessageModal({ isOpen: false, userId: '', userName: '' });
      setMessageText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    }
  };

  const updateBanners = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banners) return;
    try {
      await setDoc(doc(db, 'settings', 'banners'), banners);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/banners');
    }
  };

  const approveUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        is_approved: true
      });
      
      await addDoc(collection(db, 'notifications'), {
        uid: uid,
        message: 'Sua conta foi aprovada! Você já pode começar a operar.',
        type: 'SYSTEM',
        read: false,
        created_at: serverTimestamp()
      });

      // Send approval email
      const approvedUser = users.find(u => u.uid === uid);
      if (approvedUser?.email) {
        triggerEmail('approval', {
          email: approvedUser.email,
          name: approvedUser.name || 'Usuário'
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleWithdrawalAction = async (requestId: string, status: 'COMPLETED' | 'REJECTED', uid: string, amount: number) => {
    try {
      const batch = writeBatch(db);
      const requestRef = doc(db, 'withdrawal_requests', requestId);
      
      batch.update(requestRef, {
        status,
        updated_at: serverTimestamp()
      });

      if (status === 'REJECTED') {
        // Return balance to user
        batch.update(doc(db, 'users', uid), {
          balance: increment(amount)
        });
      }

      // Notify user
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid,
        message: status === 'COMPLETED' 
          ? `Seu saque de R$ ${amount.toFixed(2)} foi processado com sucesso!` 
          : `Seu saque de R$ ${amount.toFixed(2)} foi recusado. O valor foi estornado para seu saldo.`,
        type: status === 'COMPLETED' ? 'SYSTEM' : 'WITHDRAWAL_FAILED',
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();

      // Send email
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser?.email) {
        if (status === 'COMPLETED') {
          triggerEmail('withdrawal-completed', {
            email: targetUser.email,
            name: targetUser.name || 'Usuário',
            amount
          });
        } else {
          triggerEmail('withdrawal-rejected', {
            email: targetUser.email,
            name: targetUser.name || 'Usuário',
            amount,
            reason: 'Dados incorretos ou saldo insuficiente.' // Default reason
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'withdrawal_requests/notifications');
    }
  };

  const updateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'cpf_price'), { value: settings.cpf_price.toString() });
      batch.set(doc(db, 'settings', 'supplier_fee_percentage'), { value: settings.supplier_fee_percentage.toString() });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings');
    }
  };

  const [bulkCpfs, setBulkCpfs] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCpfs.trim()) return;
    
    setIsBulkAdding(true);
    try {
      const lines = bulkCpfs.split('\n').filter(l => l.trim());
      const batch = writeBatch(db);

      for (const line of lines) {
        const [name, cpf, bank] = line.split(',').map(s => s.trim());
        // For bulk add, we create a dummy user or just a record
        // In this system, CPFs are users with role 'supplier'
        // But they need an email/auth to login. 
        // If we just want to add "available CPFs", maybe they should be a separate collection?
        // Looking at OperatorDashboard, it fetches users with role 'supplier' and status 'ON'.
        // So bulk adding here might not make sense unless we create actual user accounts.
        // Let's assume for now we create "pre-approved" supplier profiles.
        const tempId = Math.random().toString(36).substring(7);
        const userRef = doc(collection(db, 'users'));
        batch.set(userRef, {
          name,
          cpf,
          bank: bank || 'Sistema',
          role: 'supplier',
          email: `${tempId}@supplypay.system`, // Dummy email
          balance: 0,
          level_points: 0,
          is_blocked: false,
          is_approved: true,
          status: 'ON', // Make them available immediately
          created_at: serverTimestamp()
        });
      }

      await batch.commit();
      setBulkCpfs('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    } finally {
      setIsBulkAdding(false);
    }
  };

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });
  }, [user?.uid]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  };

  const clearNotifications = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cpf?.includes(searchTerm)
  );

  const filteredTransactions = allTransactions.filter(tx => {
    const search = txSearchTerm.toLowerCase();
    const operator = users.find(u => u.uid === tx.operator_id);
    const supplier = users.find(u => u.uid === tx.supplier_id);
    
    return (
      tx.id?.toLowerCase().includes(search) ||
      operator?.name?.toLowerCase().includes(search) ||
      operator?.operator_code?.toLowerCase().includes(search) ||
      supplier?.name?.toLowerCase().includes(search) ||
      tx.cpf?.includes(search)
    );
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white pb-12 selection:bg-brand-green/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-green/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-brand-border bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center shadow-lg shadow-brand-green/20">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <span className="text-xl font-black block leading-none tracking-tighter">SupplyPay</span>
            <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.2em]">Admin Control</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500 mr-8">
            <button onClick={() => setActiveTab('users')} className={`hover:text-brand-green transition-colors ${activeTab === 'users' ? 'text-brand-green' : ''}`}>Users</button>
            <button onClick={() => setActiveTab('transactions')} className={`hover:text-brand-green transition-colors ${activeTab === 'transactions' ? 'text-brand-green' : ''}`}>Transactions</button>
            <button onClick={() => setActiveTab('withdrawals')} className={`hover:text-brand-green transition-colors ${activeTab === 'withdrawals' ? 'text-brand-green' : ''}`}>
              Withdrawals {stats?.pendingWithdrawals > 0 && <span className="ml-1 bg-brand-green text-black px-1.5 rounded-full text-[8px]">{stats.pendingWithdrawals}</span>}
            </button>
            <button onClick={() => setActiveTab('reports')} className={`hover:text-brand-green transition-colors ${activeTab === 'reports' ? 'text-brand-green' : ''}`}>Reports</button>
            <button onClick={() => setActiveTab('chat')} className={`hover:text-brand-green transition-colors ${activeTab === 'chat' ? 'text-brand-green' : ''}`}>Support Chat</button>
            <button onClick={() => setActiveTab('emails')} className={`hover:text-brand-green transition-colors ${activeTab === 'emails' ? 'text-brand-green' : ''}`}>Email Logs</button>
            <button onClick={() => setActiveTab('settings')} className={`hover:text-brand-green transition-colors ${activeTab === 'settings' ? 'text-brand-green' : ''}`}>Settings</button>
            <button onClick={() => setActiveTab('profile')} className={`hover:text-brand-green transition-colors ${activeTab === 'profile' ? 'text-brand-green' : ''}`}>Profile</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-brand-green transition-colors relative"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-brand-green rounded-full border-2 border-brand-dark"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 bg-brand-card border border-brand-border rounded-[32px] shadow-2xl overflow-hidden z-50 text-white"
                  >
                    <div className="p-6 border-b border-brand-border flex items-center justify-between">
                      <h4 className="font-black text-[10px] uppercase tracking-widest">Notificações</h4>
                      {notifications.length > 0 && (
                        <button onClick={clearNotifications} className="text-[10px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest">Limpar</button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                          <Bell className="w-8 h-8 text-slate-800 mx-auto mb-4" />
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nenhuma notificação</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => markAsRead(n.id)}
                            className={`p-6 border-b border-brand-border hover:bg-white/5 transition-colors cursor-pointer ${!n.read ? 'bg-brand-green/5' : ''}`}
                          >
                            <p className="text-sm font-bold tracking-tight mb-1">{n.message}</p>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                              {n.created_at?.toDate().toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-10 h-10 bg-brand-green text-black rounded-full flex items-center justify-center font-black text-xs border-2 border-brand-green/20">
              {user.name?.substring(0, 2).toUpperCase()}
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-12 relative z-10">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl flex items-center justify-between">
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'text-brand-green', bg: 'bg-brand-green/10' },
            { label: 'Volume Transacionado', value: `R$ ${(stats?.totalVolume || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Saldo em Custódia', value: `R$ ${(stats?.totalBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-brand-green', bg: 'bg-brand-green/10' },
            { label: 'Aguardando Aprovação', value: stats?.pendingApproval || 0, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6 hover:border-brand-green/20 transition-colors"
            >
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center border border-current/10`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Users Table */}
            <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black uppercase tracking-tight">Gerenciamento de Usuários</h3>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-brand-input border border-brand-border rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all"
                />
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-[32px] overflow-x-auto shadow-2xl scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-brand-input/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Usuário</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">WhatsApp</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Saldo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Tipo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Último Login</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredUsers.map((u) => (
                    <tr 
                      key={u.uid} 
                      onClick={() => {
                        setSelectedUser(u);
                        setNewPoints(u.level_points || 0);
                      }}
                      className="hover:bg-brand-green/5 transition-colors group cursor-pointer border-b border-brand-border last:border-0"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 bg-brand-input border border-brand-border rounded-xl flex items-center justify-center font-black text-xs text-slate-500 group-hover:text-brand-green transition-colors">
                              {u.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-brand-card ${u.status === 'ON' ? 'bg-brand-green shadow-[0_0_10px_rgba(0,255,0,0.3)]' : 'bg-slate-700'}`}></div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm tracking-tight truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-400 whitespace-nowrap">
                        {u.whatsapp || '-'}
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-brand-green whitespace-nowrap">
                        R$ {(u.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${u.role === 'admin' ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : u.role === 'operator' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {u.role !== 'admin' && (
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${u.is_approved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {u.is_approved ? 'APROVADO' : 'PENDENTE'}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {u.last_login ? u.last_login.toDate().toLocaleString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-8 h-8 bg-brand-green/10 rounded-lg flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-black transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black uppercase tracking-tight">Todas as Transações</h3>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar por ID, Operador (Código), Fornecedor ou CPF..."
                  value={txSearchTerm}
                  onChange={(e) => setTxSearchTerm(e.target.value)}
                  className="bg-brand-input border border-brand-border rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all w-80"
                />
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-[32px] overflow-x-auto shadow-2xl scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-brand-input/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">ID / Data</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Operador</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Fornecedor</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredTransactions.map((tx) => {
                    const operator = users.find(u => u.uid === tx.operator_id);
                    const supplier = users.find(u => u.uid === tx.supplier_id);
                    return (
                      <tr key={tx.id} className="hover:bg-brand-green/5 transition-colors group border-b border-brand-border last:border-0">
                        <td className="px-8 py-5">
                          <p className="font-black text-sm tracking-tight truncate">#{tx.id?.substring(0, 8)}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                            {tx.created_at?.toDate().toLocaleString('pt-BR')}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-sm">{operator?.name || 'Sistema'}</p>
                          <p className="text-[10px] text-brand-green font-black uppercase tracking-widest">Cód: {operator?.operator_code || 'N/A'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-sm">{supplier?.name || tx.supplier_name}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">CPF: {tx.cpf || 'N/A'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-black text-sm text-brand-green">R$ {(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            tx.status === 'FAILED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            tx.status === 'IN_USE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Settings Panel */}
            <div className="space-y-8">
              <h3 className="text-2xl font-black uppercase tracking-tight">Configurações do Sistema</h3>
              <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 shadow-2xl">
                {settings ? (
                  <form onSubmit={updateSettings} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Preço do CPF (R$)</label>
                      <div className="relative group">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                        <input 
                          type="number"
                          step="0.01"
                          value={settings.cpf_price}
                          onChange={(e) => setSettings({...settings, cpf_price: parseFloat(e.target.value)})}
                          className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Taxa do Fornecedor (%)</label>
                      <div className="relative group">
                        <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                        <input 
                          type="number"
                          step="0.1"
                          value={settings.supplier_fee_percentage}
                          onChange={(e) => setSettings({...settings, supplier_fee_percentage: parseFloat(e.target.value)})}
                          className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 active:scale-95"
                    >
                      Salvar Alterações
                    </button>
                  </form>
                ) : (
                  <p className="text-slate-600 text-center font-black uppercase tracking-widest text-[10px]">Carregando configurações...</p>
                )}
              </div>

              {/* Bulk Add CPFs */}
              <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-8 shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex items-center justify-center text-brand-green">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Bulk Add CPFs</h3>
                </div>
                
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
                  Formato: <code className="text-brand-green">Nome, CPF, Banco</code> (um por linha).
                </p>

                <form onSubmit={handleBulkAdd} className="space-y-6">
                  <textarea 
                    value={bulkCpfs}
                    onChange={(e) => setBulkCpfs(e.target.value)}
                    placeholder="João Silva, 12345678901, Nubank&#10;Maria Souza, 98765432100, Inter"
                    className="w-full h-40 bg-brand-input border border-brand-border rounded-2xl p-5 text-sm focus:outline-none focus:border-brand-green/50 transition-all resize-none font-mono"
                  />
                  <button 
                    type="submit"
                    disabled={isBulkAdding || !bulkCpfs.trim()}
                    className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-green/20 active:scale-95"
                  >
                    {isBulkAdding ? 'Adicionando...' : 'Adicionar CPFs'}
                  </button>
                </form>
              </div>
            </div>

            {/* Banner Management */}
            <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex items-center justify-center text-brand-green">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">Gerenciar Banners</h3>
              </div>
              
              <form onSubmit={updateBanners} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">URL da Imagem</label>
                  <input 
                    type="text"
                    value={banners?.url || ''}
                    onChange={(e) => setBanners({ ...banners!, url: e.target.value })}
                    placeholder="https://exemplo.com/banner.jpg"
                    className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Texto do Banner</label>
                  <input 
                    type="text"
                    value={banners?.text || ''}
                    onChange={(e) => setBanners({ ...banners!, text: e.target.value })}
                    placeholder="Aproveite as novas taxas!"
                    className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 active:scale-95"
                >
                  Atualizar Banner
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black uppercase tracking-tight">Solicitações de Saque</h3>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-[32px] overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-input/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Usuário</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Chave Pix</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {withdrawalRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-slate-600 font-black uppercase tracking-widest text-[10px]">Nenhuma solicitação encontrada</td>
                    </tr>
                  ) : (
                    withdrawalRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-brand-green/5 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-black text-sm tracking-tight">{req.name}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{req.role}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-black text-sm text-brand-green">R$ {req.amount.toFixed(2)}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-400">{req.pix_key}</p>
                        </td>
                        <td className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          {req.created_at?.toDate().toLocaleString('pt-BR')}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            req.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {req.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleWithdrawalAction(req.id, 'COMPLETED', req.uid, req.amount)}
                                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                                title="Aprovar e Marcar como Pago"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleWithdrawalAction(req.id, 'REJECTED', req.uid, req.amount)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-black transition-all"
                                title="Recusar e Estornar Saldo"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight">Relatórios do Sistema</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Lucro Total (Taxas)</p>
                <p className="text-3xl font-black text-brand-green">
                  R$ {allTransactions.reduce((acc, tx) => acc + (tx.status === 'COMPLETED' ? (tx.amount * 0.1) : 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Estimado com base em 10% de taxa média</p>
              </div>
              <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Operações Concluídas</p>
                <p className="text-3xl font-black text-blue-500">
                  {allTransactions.filter(tx => tx.status === 'COMPLETED').length}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Transações com sucesso</p>
              </div>
              <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ticket Médio</p>
                <p className="text-3xl font-black text-amber-500">
                  R$ {(allTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0) / (allTransactions.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Valor médio por operação</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 shadow-2xl">
                <h4 className="font-black text-lg mb-6 uppercase tracking-tight">Volume de Transações (7 Dias)</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={transactionStats}>
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00FF00" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00FF00" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '16px' }}
                        itemStyle={{ color: '#00FF00', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="volume" stroke="#00FF00" fillOpacity={1} fill="url(#colorVolume)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 shadow-2xl">
                <h4 className="font-black text-lg mb-6 uppercase tracking-tight">Distribuição por Status</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Concluídas', value: allTransactions.filter(tx => tx.status === 'COMPLETED').length },
                          { name: 'Em Uso', value: allTransactions.filter(tx => tx.status === 'IN_USE').length },
                          { name: 'Pendentes', value: allTransactions.filter(tx => tx.status === 'PENDING').length },
                          { name: 'Falhas', value: allTransactions.filter(tx => tx.status === 'FAILED').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '16px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 shadow-2xl">
              <h4 className="font-black text-lg mb-6 uppercase tracking-tight">Histórico de Lucros Recentes</h4>
              <div className="space-y-4">
                {allTransactions.filter(tx => tx.status === 'COMPLETED').slice(0, 10).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-brand-input rounded-2xl border border-brand-border">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Taxa de Operação #{tx.id?.substring(0, 8)}</p>
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{tx.created_at?.toDate().toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className="font-black text-brand-green">+ R$ {(tx.amount * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight">Suporte em Tempo Real</h3>
            <AdminChat />
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="space-y-8">
            <EmailLogs />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight">Meu Perfil Admin</h3>
            
            <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 shadow-2xl space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-brand-green text-black rounded-[32px] flex items-center justify-center text-3xl font-black shadow-2xl shadow-brand-green/20">
                  {user.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight">{user.name}</h4>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{user.email}</p>
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-brand-green/10 text-brand-green rounded-full border border-brand-green/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Administrador Master</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-brand-border">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">ID do Administrador</p>
                  <p className="font-mono text-sm bg-brand-input p-3 rounded-xl border border-brand-border">{user.uid}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Data de Registro</p>
                  <p className="font-bold text-sm bg-brand-input p-3 rounded-xl border border-brand-border">18/03/2026</p>
                </div>
              </div>

              <div className="pt-8">
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-3 bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
                >
                  <LogOut className="w-5 h-5" /> Sair da Conta
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Desktop Sidebar/Nav Helper */}
      <div className="hidden md:block fixed left-8 top-1/2 -translate-y-1/2 space-y-4 z-50">
        {[
          { id: 'users', icon: Users, label: 'Usuários' },
          { id: 'transactions', icon: Repeat, label: 'Transações' },
          { id: 'withdrawals', icon: ArrowDownCircle, label: 'Saques' },
          { id: 'reports', icon: BarChart3, label: 'Relatórios' },
          { id: 'chat', icon: Headset, label: 'Suporte' },
          { id: 'settings', icon: Settings, label: 'Ajustes' },
          { id: 'profile', icon: UserIcon, label: 'Perfil' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
              activeTab === tab.id 
                ? 'bg-brand-green text-black border-brand-green shadow-lg shadow-brand-green/20' 
                : 'bg-brand-card text-slate-500 border-brand-border hover:border-brand-green/50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="absolute left-16 bg-brand-card border border-brand-border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {messageModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMessageModal({ isOpen: false, userId: '', userName: '' })}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Enviar Mensagem</h3>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Para: {messageModal.userName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMessageModal({ isOpen: false, userId: '', userName: '' })}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <textarea 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem personalizada aqui..."
                    className="w-full h-40 bg-brand-input border border-brand-border rounded-2xl p-5 text-sm focus:outline-none focus:border-brand-green/50 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setMessageModal({ isOpen: false, userId: '', userName: '' })}
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-brand-border hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={sendMessage}
                    className="flex-1 bg-brand-green text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20"
                  >
                    Enviar Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-card border border-brand-border rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Detalhes do Usuário</h3>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{selectedUser.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-sm">{selectedUser.email}</p>
                  </div>
                  <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">CPF</p>
                    <p className="font-bold text-sm">{selectedUser.cpf || 'Não informado'}</p>
                  </div>
                  <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Banco</p>
                    <p className="font-bold text-sm">{selectedUser.bank || 'Não informado'}</p>
                  </div>
                  <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Chave Pix</p>
                    <p className="font-bold text-sm">{selectedUser.pix_key || 'Não informado'}</p>
                  </div>
                  <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saldo</p>
                    <p className="font-bold text-sm text-brand-green">R$ {(selectedUser.balance || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-brand-input border border-brand-border p-5 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Status Aprovação</p>
                    <p className="font-bold text-sm uppercase">{selectedUser.is_approved ? 'APROVADO' : 'PENDENTE'}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-brand-border">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Gerenciar Nível de Segurança</h4>
                  <div className="flex gap-4">
                    <input 
                      type="number"
                      value={newPoints}
                      onChange={(e) => setNewPoints(parseInt(e.target.value))}
                      className="flex-1 bg-brand-input border border-brand-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all"
                      placeholder="Pontos de nível"
                    />
                    <button 
                      onClick={() => updatePoints(selectedUser.uid)}
                      className="bg-brand-green text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20"
                    >
                      Atualizar Pontos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setMessageModal({ isOpen: true, userId: selectedUser.uid, userName: selectedUser.name || '' });
                      setSelectedUser(null);
                    }}
                    className="flex-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Enviar Mensagem
                  </button>
                  {!selectedUser.is_approved && (
                    <button 
                      onClick={() => {
                        approveUser(selectedUser.uid);
                        setSelectedUser(null);
                      }}
                      className="flex-1 bg-brand-green text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aprovar Usuário
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      toggleBlock(selectedUser.uid, !!selectedUser.is_blocked);
                      setSelectedUser(null);
                    }}
                    className={`flex-1 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${selectedUser.is_blocked ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}`}
                  >
                    {selectedUser.is_blocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    {selectedUser.is_blocked ? 'Desbloquear Usuário' : 'Banir Usuário'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark/80 backdrop-blur-2xl border-t border-brand-border px-6 py-4 flex md:hidden items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'users' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Users</span>
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'transactions' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <Repeat className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Trans</span>
        </button>
        <button 
          onClick={() => setActiveTab('withdrawals')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'withdrawals' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <ArrowDownCircle className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Saques</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'reports' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Reports</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'chat' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <Headset className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('emails')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'emails' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <Mail className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Emails</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Set</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-brand-green scale-110' : 'text-slate-600'}`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
