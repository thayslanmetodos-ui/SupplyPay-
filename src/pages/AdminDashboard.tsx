import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User, SystemSettings, Transaction } from '../types';
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
  writeBatch
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
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        settingsData[doc.id] = parseFloat(doc.data().value);
      });
      setSettings(settingsData as SystemSettings);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'settings');
    });

    // Listen to transactions for stats
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      
      // Calculate stats
      const totalVolume = txs.reduce((acc, tx) => acc + tx.amount, 0);
      const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
      const pendingApprovals = users.filter(u => !u.is_approved && u.role !== 'admin').length;
      
      setStats({
        totalUsers: users.length,
        totalVolume,
        totalBalance,
        pendingApprovals
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubUsers();
      unsubSettings();
      unsubTransactions();
    };
  }, [users.length]); // Re-calculate stats when users list changes

  const toggleBlock = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        is_blocked: !currentStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const approveUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        is_approved: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
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
      alert('Configurações atualizadas');
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
      alert('CPFs adicionados com sucesso');
      setBulkCpfs('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    } finally {
      setIsBulkAdding(false);
    }
  };

  if (!user) return null;

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cpf?.includes(searchTerm)
  );

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
            <button className="hover:text-brand-green transition-colors">Overview</button>
            <button className="hover:text-brand-green transition-colors">Users</button>
            <button className="hover:text-brand-green transition-colors">Transactions</button>
            <button className="hover:text-brand-green transition-colors">Settings</button>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-brand-green transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-green rounded-full border-2 border-brand-dark"></span>
            </button>
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
            { label: 'Aprovações Pendentes', value: stats?.pendingApprovals || 0, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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

            <div className="bg-brand-card border border-brand-border rounded-[32px] overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-input/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Usuário</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">WhatsApp</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Tipo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-brand-green/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-brand-input border border-brand-border rounded-xl flex items-center justify-center font-black text-xs text-slate-500 group-hover:text-brand-green transition-colors">
                            {u.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-sm tracking-tight">{u.name}</p>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-400">
                        {u.whatsapp || '-'}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : u.role === 'operator' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {u.role !== 'admin' && (
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.is_approved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {u.is_approved ? 'Aprovado' : 'Pendente'}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role !== 'admin' && !u.is_approved && (
                            <button 
                              onClick={() => approveUser(u.uid)}
                              className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all border border-emerald-500/10"
                              title="Aprovar Usuário"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button 
                              onClick={() => toggleBlock(u.uid, !!u.is_blocked)}
                              className={`p-2.5 rounded-xl transition-all border ${u.is_blocked ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/10 hover:bg-red-500/20'}`}
                              title={u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                            >
                              {u.is_blocked ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight">Configurações</h3>
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

            <div className="bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-6 shadow-2xl">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-600">Ações Rápidas</h4>
              <button className="w-full flex items-center justify-between p-5 bg-brand-input border border-brand-border rounded-2xl hover:border-brand-green/30 transition-all group">
                <div className="flex items-center gap-4">
                  <BarChart3 className="w-6 h-6 text-brand-green" />
                  <span className="text-sm font-black tracking-tight">Exportar Relatório</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-all" />
              </button>
              <button className="w-full flex items-center justify-between p-5 bg-brand-input border border-brand-border rounded-2xl hover:border-brand-green/30 transition-all group">
                <div className="flex items-center gap-4">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                  <span className="text-sm font-black tracking-tight">Revisar Alertas</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-all" />
              </button>
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
        </div>
      </main>
    </div>
  );
}
