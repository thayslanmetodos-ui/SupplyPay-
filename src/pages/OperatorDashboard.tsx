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
import { User, Transaction, Notification } from '../types';
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
  Shield, 
  ArrowRight,
  Home,
  Users,
  Repeat,
  BarChart3,
  TrendingUp,
  LogOut,
  User as UserIcon,
  X as XIcon
} from 'lucide-react';

function WithdrawalForm({ transaction, onComplete }: { transaction: any, onComplete: () => void }) {
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const netAmount = amount ? parseFloat(amount) * 0.85 : 0;

  const handleSubmit = async (status: 'COMPLETED' | 'FAILED') => {
    if (!amount || !pixKey) return alert('Preencha todos os campos');
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'transactions', transaction.id);
      
      batch.update(txRef, {
        withdrawal_amount: parseFloat(amount),
        pix_key: pixKey,
        status: status,
        updated_at: serverTimestamp()
      });

      // Notify supplier
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid: transaction.supplier_id,
        message: status === 'COMPLETED' 
          ? `Saque de R$ ${parseFloat(amount).toFixed(2)} aprovado!` 
          : `Saque de R$ ${parseFloat(amount).toFixed(2)} não aprovado.`,
        type: status === 'COMPLETED' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_FAILED',
        transactionId: transaction.id,
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();
      alert(status === 'COMPLETED' ? 'Saque aprovado com sucesso!' : 'Saque marcado como não aprovado.');
      onComplete();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/notifications');
      alert('Erro ao processar saque');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl p-4 space-y-4 border border-slate-800">
      <div className="space-y-2">
        <label className="text-xs text-slate-500 font-bold uppercase">Valor do Saque</label>
        <input 
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-brand-input border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-green"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-slate-500 font-bold uppercase">Chave PIX</label>
        <input 
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder="Sua chave PIX"
          className="w-full bg-brand-input border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-green"
        />
      </div>
      
      <div className="bg-brand-green/10 p-3 rounded-xl border border-brand-green/20">
        <p className="text-xs text-brand-green font-bold uppercase">Você receberá (-15%)</p>
        <p className="text-xl font-bold text-brand-green">R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button 
          onClick={() => handleSubmit('COMPLETED')}
          disabled={submitting}
          className="bg-brand-green text-black py-3 rounded-xl font-bold hover:bg-brand-green-dark transition-all disabled:opacity-50"
        >
          Aprovado
        </button>
        <button 
          onClick={() => handleSubmit('FAILED')}
          disabled={submitting}
          className="bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-xl font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          Não Aprovado
        </button>
      </div>
    </div>
  );
}

function OperatorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'my-cpfs' | 'transactions' | 'reports'>('dashboard');
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [activeCpfs, setActiveCpfs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      const s = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
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
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
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

  const buyCpf = async (supplier: User) => {
    if (!user) return;
    if (user.balance < 2.70) return alert('Saldo insuficiente');
    
    setBuying(supplier.uid);
    try {
      const batch = writeBatch(db);
      
      // Create transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        operator_id: user.uid,
        supplier_id: supplier.uid,
        amount: 2.70,
        supplier_fee: 2.70,
        status: 'IN_USE',
        created_at: serverTimestamp(),
        operator_name: user.name,
        supplier_name: supplier.name,
        cpf: supplier.cpf,
        bank: supplier.bank,
        whatsapp: supplier.whatsapp
      });

      // Update operator balance
      batch.update(doc(db, 'users', user.uid), {
        balance: increment(-2.70)
      });

      // Update supplier balance and points
      batch.update(doc(db, 'users', supplier.uid), {
        balance: increment(2.70),
        level_points: increment(10)
      });

      // Notify supplier
      const noteRef = doc(collection(db, 'notifications'));
      batch.set(noteRef, {
        uid: supplier.uid,
        message: `Seu CPF foi comprado por ${user.name}! +R$ 2,70`,
        type: 'PURCHASE',
        transactionId: txRef.id,
        created_at: serverTimestamp(),
        read: false
      });

      await batch.commit();
      alert('CPF comprado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions/users/notifications');
      alert('Erro ao comprar CPF');
    } finally {
      setBuying(null);
    }
  };

  const addBalance = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(1000)
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

  const filteredActiveCpfs = activeCpfs.filter(item => 
    (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.cpf || '').includes(searchTerm) ||
    (item.bank?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!user) return null;
  const unreadCount = notifications.filter(n => !n.read).length;

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
                  <button 
                    onClick={addBalance}
                    className="flex-1 bg-black text-brand-green py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Fundos
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

        {activeTab === 'my-cpfs' && (
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
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">CPF: {item.cpf} • {item.bank}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-brand-input p-3 rounded-xl border border-brand-border">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">WhatsApp</p>
                        <p className="text-sm font-bold">{item.whatsapp || 'Não informado'}</p>
                      </div>
                      <div className="bg-brand-input p-3 rounded-xl border border-brand-border">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Status</p>
                        <p className="text-sm font-bold text-brand-green">EM USO</p>
                      </div>
                    </div>

                    <WithdrawalForm 
                      transaction={item} 
                      onComplete={() => {}} 
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">CPFs Disponíveis</h3>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando fornecedores...</div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-brand-card rounded-full flex items-center justify-center mx-auto border border-brand-border">
                    <Users className="w-10 h-10 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum CPF disponível no momento.</p>
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
                      onClick={() => buyCpf(s)}
                      disabled={buying === s.uid}
                      className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 active:scale-95"
                    >
                      <Repeat className="w-5 h-5" /> {buying === s.uid ? 'Processando...' : 'Comprar CPF (R$ 2,70)'}
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

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

        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Relatórios</h3>
              <div className="flex items-center gap-2 bg-brand-input p-1 rounded-xl border border-brand-border">
                <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-brand-green text-black rounded-lg shadow-lg shadow-brand-green/20">Hoje</button>
                <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Semana</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Total Gasto</p>
                    <p className="text-4xl font-black tracking-tighter">R$ {(transactions.filter(t => t.status === 'COMPLETED' && !t.withdrawal_amount).reduce((acc, curr) => acc + curr.amount, 0)).toFixed(2)}</p>
                  </div>
                  <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20">
                    <TrendingUp className="w-7 h-7 rotate-180" />
                  </div>
                </div>
                <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                  <div className="h-full bg-red-500 w-[65%] rounded-full"></div>
                </div>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">+12% em relação a ontem</p>
              </div>

              <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Total Recuperado</p>
                    <p className="text-4xl font-black tracking-tighter text-brand-green">R$ {(transactions.filter(t => t.status === 'COMPLETED' && t.withdrawal_amount).reduce((acc, curr) => acc + curr.withdrawal_amount, 0)).toFixed(2)}</p>
                  </div>
                  <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center border border-brand-green/20">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>
                <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                  <div className="h-full bg-brand-green w-[42%] rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                </div>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">+5% em relação a ontem</p>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border p-8 rounded-[32px] space-y-8">
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-600">Distribuição de Bancos</h4>
              <div className="space-y-6">
                {[
                  { name: 'Nubank', count: activeCpfs.filter(c => c.bank === 'Nubank').length, color: 'bg-purple-500' },
                  { name: 'Inter', count: activeCpfs.filter(c => c.bank === 'Inter').length, color: 'bg-orange-500' },
                  { name: 'Outros', count: activeCpfs.filter(c => !['Nubank', 'Inter'].includes(c.bank)).length, color: 'bg-brand-green' }
                ].map((bank, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">{bank.name}</span>
                      <span className="text-white">{bank.count} CPFs</span>
                    </div>
                    <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-border">
                      <div 
                        className={`h-full ${bank.color} rounded-full`} 
                        style={{ width: `${activeCpfs.length > 0 ? (bank.count / activeCpfs.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
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
          onClick={() => setActiveTab('my-cpfs')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'my-cpfs' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Shield className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Ativos</span>
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'transactions' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Repeat className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Extrato</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'reports' ? 'text-brand-green scale-110' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest">Dados</span>
        </button>
      </nav>
    </div>
  );
}

export default OperatorDashboard;
