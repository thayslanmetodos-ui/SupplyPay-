import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Check, LayoutGrid, Chrome, Briefcase, ArrowLeft } from 'lucide-react';
import { UserRole } from '../types';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export default function AuthPage({ mode: initialMode }: AuthPageProps) {
  const { role: urlRole } = useParams<{ role: string }>();
  const isLogin = initialMode === 'login';
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [role, setRole] = useState<UserRole>((urlRole as UserRole) || 'supplier');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bank, setBank] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password !== confirmPassword) {
      return setError('As senhas não coincidem');
    }

    if (!isLogin && !acceptedTerms) {
      return setError('Você deve aceitar os termos de serviço');
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const payload = isLogin 
        ? { email, password }
        : { email, password, role, name, cpf, birthDate, bank, whatsapp };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (!isLogin && data.user.role !== 'admin') {
          setError('CONTA_CRIADA_PENDENTE');
          setLoading(false);
          return;
        }
        authLogin(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : `/${data.user.role}`);
      } else {
        if (data.error === 'PENDING_APPROVAL') {
          setError('Sua conta está aguardando aprovação do administrador.');
        } else {
          setError(data.error || 'Ocorreu um erro');
        }
      }
    } catch (err: any) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">SupplyPay</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/" className="hover:text-white transition-colors">Suppliers</Link>
          <Link to="/" className="hover:text-white transition-colors">Operators</Link>
          <button 
            onClick={() => navigate(isLogin ? `/signup/${role}` : '/login')}
            className="bg-brand-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest bg-brand-blue/10 px-3 py-1 rounded-full">
              {role === 'operator' ? 'Operator Portal' : 'Supplier Portal'}
            </span>
            <h2 className="text-4xl font-bold text-white">
              {isLogin ? 'Entrar na Conta' : 'Criar Conta'}
            </h2>
            <p className="text-slate-400">
              {isLogin 
                ? 'Bem-vindo de volta! Acesse sua conta para gerenciar suas operações.' 
                : 'Junte-se à rede e gerencie seus pagamentos com facilidade.'}
            </p>
          </div>

          {error && (
            <div className={`p-4 rounded-xl text-sm border ${error === 'CONTA_CRIADA_PENDENTE' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
              {error === 'CONTA_CRIADA_PENDENTE' 
                ? 'Conta criada com sucesso! Aguarde a aprovação do administrador para acessar o painel.' 
                : error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Ex: João Silva"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email (Gmail)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="exemplo@gmail.com"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">WhatsApp</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                    +55
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            )}

            {!isLogin && role === 'supplier' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">CPF</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Banco Vinculado</label>
                  <input
                    type="text"
                    required
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Nome do seu banco"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-brand-input border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-brand-blue border-brand-blue' : 'border-slate-700 bg-brand-input'}`}
                  >
                    {acceptedTerms && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs text-slate-400">
                    Eu aceito os <Link to="/" className="text-brand-blue hover:underline">Termos de Serviço</Link> e <Link to="/" className="text-brand-blue hover:underline">Política de Privacidade</Link>.
                  </span>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-brand-dark px-4 text-slate-500 font-medium">Ou continue com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-brand-input border border-slate-800 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium text-white">
              <Chrome className="w-4 h-4 text-red-500" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-brand-input border border-slate-800 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium text-white">
              <Briefcase className="w-4 h-4 text-blue-400" /> Corp ID
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">
            {isLogin ? 'Não possui uma conta?' : 'Já possui uma conta?'} {' '}
            <button 
              onClick={() => navigate(isLogin ? `/signup/${role}` : '/login')}
              className="text-brand-blue font-bold hover:underline"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
