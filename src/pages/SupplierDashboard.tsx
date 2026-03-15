import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import { Transaction } from '../types';
import { getSecurityLevel, getLevelColor, getLevelIcon } from '../constants';
import { 
  User as UserIcon, 
  CreditCard, 
  Landmark, 
  Power, 
  Bell, 
  History, 
  ShieldCheck, 
  LayoutGrid, 
  LogOut,
  Home,
  Users,
  Repeat,
  BarChart3,
  CheckCircle2
} from 'lucide-react';

export default function SupplierDashboard() {
  const { user, token, refreshUser, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join', user.id);
    });

    socket.on('purchase_request', (data) => {
      setNotifications(prev => [data.message, ...prev]);
      refreshUser();
      fetchTransactions();
    });

    fetchTransactions();

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    try {
      const res = await fetch('/api/supplier/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: user?.status === 'ON' ? 'OFF' : 'ON' })
      });
      if (res.ok) {
        refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Tem certeza que deseja apagar sua conta? Esta ação é irreversível.')) return;
    try {
      const res = await fetch('/api/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  const securityLevel = getSecurityLevel(user.level_points || 0);
  const levelColor = getLevelColor(securityLevel);
  const LevelIcon = getLevelIcon(securityLevel);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold">SupplyPay</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-brand-dark"></span>
            )}
          </button>
          <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center font-bold text-sm border-2 border-brand-blue/20">
            {user.name?.substring(0, 2).toUpperCase()}
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card border border-slate-800/50 rounded-[32px] p-8 space-y-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  <CheckCircle2 className="w-5 h-5 text-brand-blue" />
                </div>
                <p className="text-slate-500 font-medium">Fornecedor Verificado</p>
              </div>
            </div>
            <button 
              onClick={toggleStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all ${user.status === 'ON' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
            >
              <Power className="w-3 h-3" /> {user.status === 'ON' ? 'DISPONÍVEL' : 'OFFLINE'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-input border border-slate-800/50 p-4 rounded-2xl space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPF</p>
              <p className="font-bold">{user.cpf || 'N/A'}</p>
            </div>
            <div className="bg-brand-input border border-slate-800/50 p-4 rounded-2xl space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Banco</p>
              <p className="font-bold">{user.bank || 'N/A'}</p>
            </div>
          </div>

          {/* Security Level */}
          <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white/10 ${levelColor}`}>
                  <LevelIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Nível de Segurança</p>
                  <p className={`text-lg font-bold ${levelColor}`}>{securityLevel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Pontos</p>
                <p className="text-lg font-bold text-white">{user.level_points || 0}</p>
              </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${levelColor.replace('text-', 'bg-')}`}
                style={{ width: `${Math.min(((user.level_points || 0) / 20000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <button 
            onClick={deleteAccount}
            className="w-full py-3 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
          >
            Apagar Minha Conta
          </button>
        </motion.div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-blue" /> Notificações
            </h3>
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-brand-card border border-slate-800/50 p-4 rounded-2xl flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">{n}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" /> Histórico
            </h3>
            <button className="text-brand-blue text-sm font-bold hover:underline">Ver tudo</button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Carregando histórico...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Nenhuma transação encontrada.</div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="bg-brand-card border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Venda de CPF</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-500">+ R$ 2,70</p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark/80 backdrop-blur-xl border-t border-slate-800/50 px-6 py-4 flex items-center justify-between z-50">
        <button className="flex flex-col items-center gap-1 text-brand-blue">
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Painel</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Perfil</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
          <Repeat className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Ganhos</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Relatórios</span>
        </button>
      </nav>
    </div>
  );
}
