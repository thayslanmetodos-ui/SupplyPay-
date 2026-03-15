import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User, SystemSettings } from '../types';
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
  const { user, token, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [usersRes, settingsRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!usersRes.ok || !settingsRes.ok || !statsRes.ok) {
        throw new Error('Falha ao carregar dados do servidor');
      }

      const usersData = await usersRes.json();
      const settingsData = await settingsRes.json();
      const statsData = await statsRes.json();

      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }
      
      setStats(statsData);
      
      // Format settings array to object
      if (Array.isArray(settingsData)) {
        const formattedSettings = settingsData.reduce((acc: any, curr: any) => {
          acc[curr.key] = parseFloat(curr.value);
          return acc;
        }, {} as SystemSettings);
        setSettings(formattedSettings);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/toggle-block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, block: !currentStatus })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const approveUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const settingsArray = [
        { key: 'cpf_price', value: settings.cpf_price.toString() },
        { key: 'supplier_fee_percentage', value: settings.supplier_fee_percentage.toString() }
      ];
      
      const res = await fetch('/api/admin/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsArray })
      });
      if (res.ok) alert('Configurações atualizadas');
    } catch (err) {
      console.error(err);
    }
  };

  const [bulkCpfs, setBulkCpfs] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCpfs.trim()) return;
    
    setIsBulkAdding(true);
    try {
      // Expecting format: Name, CPF, Bank (one per line)
      const lines = bulkCpfs.split('\n').filter(l => l.trim());
      const cpfs = lines.map(line => {
        const [name, cpf, bank] = line.split(',').map(s => s.trim());
        return { name, cpf, bank: bank || 'Sistema' };
      });

      const res = await fetch('/api/admin/bulk-add-cpfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cpfs })
      });

      if (res.ok) {
        alert('CPFs adicionados com sucesso');
        setBulkCpfs('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao adicionar CPFs');
      }
    } catch (err) {
      alert('Erro de conexão');
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
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white pb-12">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-slate-800/50 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold block leading-none">SupplyPay</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Admin Control</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400 mr-8">
            <button className="hover:text-white transition-colors">Overview</button>
            <button className="hover:text-white transition-colors">Users</button>
            <button className="hover:text-white transition-colors">Transactions</button>
            <button className="hover:text-white transition-colors">Settings</button>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-brand-dark"></span>
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
              {user.name?.substring(0, 2).toUpperCase()}
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-12">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="text-xs font-bold uppercase tracking-widest hover:underline">Tentar Novamente</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Volume Transacionado', value: `R$ ${(stats?.totalVolume || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Saldo em Custódia', value: `R$ ${(stats?.totalBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Aprovações Pendentes', value: stats?.pendingApprovals || 0, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-brand-card border border-slate-800/50 p-6 rounded-3xl space-y-4"
            >
              <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Users Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Gerenciamento de Usuários</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-brand-input border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="bg-brand-card border border-slate-800/50 rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/30">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">WhatsApp</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-xs text-slate-400">
                            {u.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {u.whatsapp || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500' : u.role === 'operator' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.role !== 'admin' && (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.is_approved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {u.is_approved ? 'Aprovado' : 'Pendente'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role !== 'admin' && !u.is_approved && (
                            <button 
                              onClick={() => approveUser(u.id)}
                              className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
                              title="Aprovar Usuário"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button 
                              onClick={() => toggleBlock(u.id, !!u.is_blocked)}
                              className={`p-2 rounded-lg transition-colors ${u.is_blocked ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
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
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Configurações do Sistema</h3>
            <div className="bg-brand-card border border-slate-800/50 rounded-3xl p-8">
              {settings ? (
                <form onSubmit={updateSettings} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preço do CPF (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="number"
                        step="0.01"
                        value={settings.cpf_price}
                        onChange={(e) => setSettings({...settings, cpf_price: parseFloat(e.target.value)})}
                        className="w-full bg-brand-input border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Taxa do Fornecedor (%)</label>
                    <div className="relative">
                      <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="number"
                        step="0.1"
                        value={settings.supplier_fee_percentage}
                        onChange={(e) => setSettings({...settings, supplier_fee_percentage: parseFloat(e.target.value)})}
                        className="w-full bg-brand-input border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Salvar Alterações
                  </button>
                </form>
              ) : (
                <p className="text-slate-500 text-center">Carregando configurações...</p>
              )}
            </div>

            <div className="bg-brand-card border border-slate-800/50 rounded-3xl p-8 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500">Ações Rápidas</h4>
              <button className="w-full flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-medium">Exportar Relatório</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-medium">Revisar Alertas</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Bulk Add CPFs */}
            <div className="bg-brand-card border border-slate-800/50 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Adicionar CPFs em Massa</h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Insira os dados no formato: <code className="text-indigo-400">Nome, CPF, Banco</code> (um por linha).
              </p>

              <form onSubmit={handleBulkAdd} className="space-y-4">
                <textarea 
                  value={bulkCpfs}
                  onChange={(e) => setBulkCpfs(e.target.value)}
                  placeholder="João Silva, 12345678901, Nubank&#10;Maria Souza, 98765432100, Inter"
                  className="w-full h-32 bg-brand-input border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
                />
                <button 
                  type="submit"
                  disabled={isBulkAdding || !bulkCpfs.trim()}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
