import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User, Transaction } from '../types';
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
  LogOut,
  User as UserIcon
} from 'lucide-react';

function WithdrawalForm({ transaction, token, onComplete }: { transaction: any, token: string, onComplete: () => void }) {
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const netAmount = amount ? parseFloat(amount) * 0.85 : 0;

  const handleSubmit = async (status: 'COMPLETED' | 'FAILED') => {
    if (!amount || !pixKey) return alert('Preencha todos os campos');
    setSubmitting(true);
    try {
      const res = await fetch('/api/operator/complete-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          withdrawalAmount: parseFloat(amount),
          pixKey,
          status
        })
      });
      if (res.ok) {
        alert(status === 'COMPLETED' ? 'Saque aprovado com sucesso!' : 'Saque marcado como não aprovado.');
        onComplete();
      }
    } catch (err) {
      alert('Erro de conexão');
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
          className="w-full bg-brand-input border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-blue"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-slate-500 font-bold uppercase">Chave PIX</label>
        <input 
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder="Sua chave PIX"
          className="w-full bg-brand-input border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-blue"
        />
      </div>
      
      <div className="bg-brand-blue/10 p-3 rounded-xl border border-brand-blue/20">
        <p className="text-xs text-brand-blue font-bold uppercase">Você receberá (-15%)</p>
        <p className="text-xl font-bold text-brand-blue">R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button 
          onClick={() => handleSubmit('COMPLETED')}
          disabled={submitting}
          className="bg-brand-blue text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
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

export default function OperatorDashboard() {
  const { user, token, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'my-cpfs' | 'transactions' | 'reports'>('dashboard');
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [activeCpfs, setActiveCpfs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);

  useEffect(() => {
    fetchSuppliers();
    fetchActiveCpfs();
  }, []);

  useEffect(() => {
    if (activeTab === 'suppliers') {
      fetchSuppliers();
    } else if (activeTab === 'my-cpfs') {
      fetchActiveCpfs();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operator/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCpfs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operator/active-cpfs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setActiveCpfs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operator/available-cpfs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buyCpf = async (supplierId: number) => {
    setBuying(supplierId);
    try {
      const res = await fetch('/api/operator/buy-cpf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ supplierId })
      });
      if (res.ok) {
        alert('CPF comprado com sucesso!');
        refreshUser();
        fetchSuppliers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao comprar CPF');
      }
    } catch (err) {
      alert('Erro de conexão');
    } finally {
      setBuying(null);
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
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-brand-dark"></span>
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
        {activeTab === 'dashboard' && (
          <>
            {/* Balance Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-blue rounded-[32px] p-8 relative overflow-hidden shadow-2xl shadow-blue-500/20"
            >
              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <p className="text-blue-100/80 text-sm font-medium">Saldo Disponível</p>
                  <h2 className="text-4xl font-bold">R$ {(user.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={async () => {
                      await fetch('/api/operator/add-balance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ amount: 1000 })
                      });
                      refreshUser();
                    }}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-5 h-5" /> Adicionar Fundos
                  </button>
                  <button className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all">
                    <History className="w-6 h-6" />
                  </button>
                </div>
              </div>
              {/* Background Icon */}
              <Wallet className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
            </motion.div>

            <button 
              onClick={deleteAccount}
              className="w-full py-3 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
            >
              Apagar Minha Conta
            </button>

            {/* Quick Access or Stats could go here */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Resumo</h3>
              <button 
                onClick={() => setActiveTab('suppliers')}
                className="text-brand-blue text-sm font-bold hover:underline"
              >
                Ver Fornecedores
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-card p-6 rounded-3xl border border-slate-800/50">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">CPFs Ativos</p>
                <p className="text-2xl font-bold">{activeCpfs.length}</p>
              </div>
              <div className="bg-brand-card p-6 rounded-3xl border border-slate-800/50">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Nível</p>
                <p className="text-2xl font-bold">Iniciante</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'my-cpfs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">CPFs Ativos</h3>
              <button onClick={fetchActiveCpfs} className="text-brand-blue text-sm font-bold hover:underline">Atualizar</button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500">Carregando seus CPFs...</div>
              ) : activeCpfs.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-10 h-10 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-medium">Você não tem CPFs ativos no momento.</p>
                  <p className="text-xs text-slate-600">Compre um CPF na aba Fornecedores.</p>
                </div>
              ) : (
                activeCpfs.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-card border border-slate-800/50 rounded-3xl p-6 space-y-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{item.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">CPF: {item.cpf} • {item.bank}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/30 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">WhatsApp</p>
                        <p className="text-sm font-medium">{item.whatsapp || 'Não informado'}</p>
                      </div>
                      <div className="bg-slate-800/30 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Status</p>
                        <p className="text-sm font-medium text-brand-blue">EM USO</p>
                      </div>
                    </div>

                    <WithdrawalForm 
                      transaction={item} 
                      token={token!} 
                      onComplete={fetchActiveCpfs} 
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
              <h3 className="text-xl font-bold">CPFs Disponíveis</h3>
              <button onClick={fetchSuppliers} className="text-brand-blue text-sm font-bold hover:underline">Atualizar</button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500">Carregando fornecedores...</div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-10 h-10 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-medium">Não tem nenhum CPF ativo no momento.</p>
                  <p className="text-xs text-slate-600">Tente novamente em alguns instantes.</p>
                </div>
              ) : (
                suppliers.map((s) => (
                  <motion.div 
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-brand-card border border-slate-800/50 rounded-3xl p-6 space-y-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg">{s.name}</h4>
                            <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{s.bank} • Ag 0001</p>
                        </div>
                      </div>
                      <div className="bg-slate-800/50 px-3 py-1 rounded-full flex items-center gap-2">
                        <Shield className="w-3 h-3 text-brand-blue" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alta</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-slate-500">90% de confiabilidade operacional</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-blue w-[90%] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => buyCpf(s.id)}
                      disabled={buying === s.id}
                      className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50"
                    >
                      <Repeat className="w-5 h-5" /> {buying === s.id ? 'Processando...' : 'Comprar CPF (R$ 2,70)'}
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
              <h3 className="text-xl font-bold">Histórico de Transações</h3>
              <button onClick={fetchTransactions} className="text-brand-blue text-sm font-bold hover:underline">Atualizar</button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-500">Carregando transações...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                    <History className="w-10 h-10 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhuma transação encontrada.</p>
                </div>
              ) : (
                transactions.map((t) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-brand-card border border-slate-800/50 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 
                        t.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 
                        'bg-brand-blue/10 text-brand-blue'
                      }`}>
                        <Repeat className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t.supplier_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">
                          {new Date(t.created_at).toLocaleDateString('pt-BR')} • {t.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">R$ {t.amount.toFixed(2)}</p>
                      {t.withdrawal_amount && (
                        <p className="text-[10px] text-emerald-500 font-bold">Saque: R$ {t.withdrawal_amount.toFixed(2)}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="text-center py-20 text-slate-500">
            Relatórios detalhados em breve.
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark/80 backdrop-blur-xl border-t border-slate-800/50 px-6 py-4 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-brand-blue' : 'text-slate-500 hover:text-white'}`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Painel</span>
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'suppliers' ? 'text-brand-blue' : 'text-slate-500 hover:text-white'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Fornecedores</span>
        </button>
        <button 
          onClick={() => setActiveTab('my-cpfs')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'my-cpfs' ? 'text-brand-blue' : 'text-slate-500 hover:text-white'}`}
        >
          <Shield className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">CPFs Ativos</span>
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'transactions' ? 'text-brand-blue' : 'text-slate-500 hover:text-white'}`}
        >
          <Repeat className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Transações</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'reports' ? 'text-brand-blue' : 'text-slate-500 hover:text-white'}`}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Relatórios</span>
        </button>
      </nav>
    </div>
  );
}
