import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { auth, db, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { User, Mail, Lock, Eye, EyeOff, Check, LayoutGrid, Chrome, Briefcase, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        return;
      }
      
      if (!userDoc.exists()) {
        // If it's a new user via Google, we might need them to choose a role or default to supplier
        // For this flow, let's assume they use the signup page if they want to choose a role
        // or we default to supplier if they just click Google on login
        const newUser = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Usuário Google',
          role: role, // Use current selected role
          balance: 0,
          level_points: 0,
          is_blocked: false,
          is_approved: role === 'admin' ? true : false,
          created_at: serverTimestamp(),
          status: 'OFF'
        };
        try {
          await setDoc(doc(db, 'users', user.uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          return;
        }
        
        if (newUser.role !== 'admin') {
          setError('CONTA_CRIADA_PENDENTE');
          setLoading(false);
          return;
        }
      } else {
        const userData = userDoc.data();
        if (userData.is_blocked) {
          setError('Sua conta está bloqueada.');
          await auth.signOut();
          setLoading(false);
          return;
        }
        if (!userData.is_approved && userData.role !== 'admin') {
          setError('Sua conta está aguardando aprovação do administrador.');
          await auth.signOut();
          setLoading(false);
          return;
        }
        navigate(userData.role === 'admin' ? '/admin' : `/${userData.role}`);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google');
    } finally {
      setLoading(false);
    }
  };

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
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', user.uid));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          return;
        }

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.is_blocked) {
            setError('Sua conta está bloqueada.');
            await auth.signOut();
            return;
          }
          if (!userData.is_approved && userData.role !== 'admin') {
            setError('Sua conta está aguardando aprovação do administrador.');
            await auth.signOut();
            return;
          }
          navigate(userData.role === 'admin' ? '/admin' : `/${userData.role}`);
        } else {
          setError('Perfil de usuário não encontrado.');
          await auth.signOut();
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });

        const newUser = {
          uid: user.uid,
          email: user.email,
          name: name,
          role: role,
          whatsapp,
          cpf: role === 'supplier' ? cpf : null,
          bank: role === 'supplier' ? bank : null,
          balance: 0,
          level_points: 0,
          is_blocked: false,
          is_approved: role === 'admin' ? true : false,
          created_at: serverTimestamp(),
          status: 'OFF'
        };

        try {
          await setDoc(doc(db, 'users', user.uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          return;
        }

        if (role !== 'admin') {
          setError('CONTA_CRIADA_PENDENTE');
          await auth.signOut();
        } else {
          navigate('/admin');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white selection:bg-brand-green/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-green/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center shadow-lg shadow-brand-green/20 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter">SupplyPay</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
          <Link to="/" className="hover:text-brand-green transition-colors">Home</Link>
          <Link to="/" className="hover:text-brand-green transition-colors">Soluções</Link>
          <button 
            onClick={() => navigate(isLogin ? `/signup/${role}` : '/login')}
            className="bg-white/5 border border-white/10 text-white px-6 py-2.5 rounded-xl hover:bg-white/10 transition-all backdrop-blur-md"
          >
            {isLogin ? 'Criar Conta' : 'Entrar'}
          </button>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[440px] w-full"
        >
          <div className="bg-brand-card/50 backdrop-blur-2xl border border-brand-border p-8 md:p-10 rounded-[32px] shadow-2xl space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] bg-brand-green/10 px-3 py-1 rounded-full border border-brand-green/20">
                  {role === 'operator' ? 'Portal Operador' : 'Portal Fornecedor'}
                </span>
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight">
                {isLogin ? 'Bem-vindo' : 'Começar Agora'}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isLogin 
                  ? 'Acesse sua conta para gerenciar suas operações financeiras com segurança.' 
                  : 'Crie sua conta em segundos e comece a operar na maior rede de pagamentos.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-2xl text-xs font-medium border ${error === 'CONTA_CRIADA_PENDENTE' ? 'bg-brand-green/10 border-brand-green/30 text-brand-green' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
                >
                  <div className="flex gap-3">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>
                      {error === 'CONTA_CRIADA_PENDENTE' 
                        ? 'Conta criada! Aguarde a aprovação do administrador para acessar.' 
                        : error}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                      placeholder="João Silva"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Profissional</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                    placeholder="exemplo@gmail.com"
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm group-focus-within:text-brand-green transition-colors">
                      +55
                    </div>
                    <input
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              )}

              {!isLogin && role === 'supplier' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">CPF</label>
                    <input
                      type="text"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Banco</label>
                    <input
                      type="text"
                      required
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                      placeholder="Nome do banco"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Senha de Acesso</label>
                  {isLogin && <button type="button" className="text-[10px] font-bold text-brand-green hover:underline">Esqueceu?</button>}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-green transition-colors" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${acceptedTerms ? 'bg-brand-green border-brand-green shadow-lg shadow-brand-green/20' : 'border-brand-border bg-brand-input'}`}
                    >
                      {acceptedTerms && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Eu aceito os <Link to="/" className="text-brand-green font-bold hover:underline">Termos de Serviço</Link> e <Link to="/" className="text-brand-green font-bold hover:underline">Política de Privacidade</Link>.
                    </span>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar Agora' : 'Finalizar Cadastro')}
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-border"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em]">
                <span className="bg-brand-card/50 backdrop-blur-md px-4 text-slate-600 font-bold">Ou continue com</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-3 bg-brand-input border border-brand-border py-3.5 rounded-2xl hover:bg-brand-border transition-all text-xs font-bold text-white group disabled:opacity-50"
              >
                <Chrome className="w-4 h-4 text-brand-green group-hover:scale-110 transition-transform" /> Google
              </button>
              <button className="flex items-center justify-center gap-3 bg-brand-input border border-brand-border py-3.5 rounded-2xl hover:bg-brand-border transition-all text-xs font-bold text-white group">
                <Briefcase className="w-4 h-4 text-brand-green group-hover:scale-110 transition-transform" /> Corp ID
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 font-medium">
              {isLogin ? 'Não possui uma conta?' : 'Já possui uma conta?'} {' '}
              <button 
                onClick={() => navigate(isLogin ? `/signup/${role}` : '/login')}
                className="text-brand-green font-bold hover:underline"
              >
                {isLogin ? 'Criar conta gratuita' : 'Acessar minha conta'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 py-8 px-8 text-center">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">
          &copy; 2026 SupplyPay Gateway &bull; Secure &bull; Fast &bull; Reliable
        </p>
      </footer>
    </div>
  );
}
