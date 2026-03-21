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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { User, Mail, Lock, Eye, EyeOff, Check, LayoutGrid, Chrome, Briefcase, ArrowLeft, ShieldCheck, Zap, X } from 'lucide-react';
import { UserRole } from '../types';
import { triggerEmail } from '../services/emailTriggerService';

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

  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      await triggerEmail('password-reset', { email: resetEmail });
      setResetSuccess(true);
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 3000);
    } catch (err) {
      setError('Erro ao enviar email de recuperação.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const adminEmails = [
        'suportethayslanbssns@gmail.com',
        'supplypayorg@gmail.com'
      ];
      const isAdminEmail = adminEmails.includes(user.email || '');
      
      // Check if user exists in Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        return;
      }
      
      if (!userDoc.exists()) {
        if (isAdminEmail) {
          const newUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Admin',
            role: 'admin',
            balance: 0,
            level_points: 0,
            is_blocked: false,
            is_approved: true,
            created_at: serverTimestamp(),
            last_login: serverTimestamp(),
            status: 'OFF'
          };
          await setDoc(doc(db, 'users', user.uid), newUser);
          navigate('/admin');
        } else {
          setTempUser(user);
          setShowInfoForm(true);
        }
      } else {
        const userData = userDoc.data();
        
        // Force admin role if email matches
        if (isAdminEmail && userData.role !== 'admin') {
          await updateDoc(doc(db, 'users', user.uid), { 
            role: 'admin', 
            is_approved: true,
            last_login: serverTimestamp()
          });
          navigate('/admin');
          return;
        }

        await updateDoc(doc(db, 'users', user.uid), {
          last_login: serverTimestamp()
        });

        if (userData.is_blocked) {
          setError('Sua conta está bloqueada.');
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

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUser) return;
    setLoading(true);
    try {
      const newUser = {
        uid: tempUser.uid,
        email: tempUser.email,
        name: tempUser.displayName || name,
        role: role,
        whatsapp,
        cpf: role === 'supplier' ? cpf : null,
        bank: role === 'supplier' ? bank : null,
        balance: 0,
        level_points: 0,
        is_blocked: false,
        is_approved: false, // Needs admin approval based on phone
        created_at: serverTimestamp(),
        last_login: serverTimestamp(),
        status: 'OFF'
      };

      await setDoc(doc(db, 'users', tempUser.uid), newUser);
      
      // Trigger registration email
      await triggerEmail('registration', { email: tempUser.email, name: newUser.name });

      navigate(`/${role}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${tempUser.uid}`);
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
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[440px] w-full"
        >
          <div className="bg-brand-card/50 backdrop-blur-2xl border border-brand-border p-8 md:p-10 rounded-[32px] shadow-2xl space-y-8">
            <AnimatePresence mode="wait">
              {!showInfoForm ? (
                <motion.div 
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-4xl font-bold text-white tracking-tight">Bem-vindo</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Acesse sua conta usando sua conta Google para gerenciar suas operações.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl text-xs font-medium border bg-red-500/10 border-red-500/30 text-red-400 flex gap-3">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-4 bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl disabled:opacity-50"
                  >
                    <Chrome className="w-6 h-6" />
                    {loading ? 'Entrando...' : 'Entrar com Google'}
                  </button>

                  <div className="text-center">
                    <button 
                      onClick={() => setShowResetModal(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-green transition-colors"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="info"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Quase lá!</h2>
                    <p className="text-slate-400 text-sm">Precisamos de mais algumas informações para completar seu perfil.</p>
                  </div>

                  <form onSubmit={handleInfoSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Conta</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole('supplier')}
                          className={`py-3 rounded-xl border text-xs font-bold transition-all ${role === 'supplier' ? 'bg-brand-green border-brand-green text-black' : 'bg-brand-input border-brand-border text-slate-400'}`}
                        >
                          Fornecedor
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('operator')}
                          className={`py-3 rounded-xl border text-xs font-bold transition-all ${role === 'operator' ? 'bg-brand-green border-brand-green text-black' : 'bg-brand-input border-brand-border text-slate-400'}`}
                        >
                          Operador
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-white focus:outline-none focus:border-brand-green/50 transition-all"
                        placeholder="+55 (00) 00000-0000"
                      />
                    </div>

                    {role === 'supplier' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CPF</label>
                          <input
                            type="text"
                            required
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-white focus:outline-none focus:border-brand-green/50 transition-all"
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Banco / Chave Pix</label>
                          <input
                            type="text"
                            required
                            value={bank}
                            onChange={(e) => setBank(e.target.value)}
                            className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 px-4 text-white focus:outline-none focus:border-brand-green/50 transition-all"
                            placeholder="Nome do banco ou Chave Pix"
                          />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : 'Concluir Cadastro'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">Recuperar Senha</h3>
                <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {resetSuccess ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto text-brand-green">
                    <Check className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-400">Email de recuperação enviado com sucesso!</p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seu Email</label>
                    <input 
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full bg-brand-input border border-brand-border rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar Email de Recuperação'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 py-8 px-8 text-center">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">
          &copy; 2026 SupplyPay Gateway &bull; Secure &bull; Fast &bull; Reliable
        </p>
      </footer>
    </div>
  );
}
