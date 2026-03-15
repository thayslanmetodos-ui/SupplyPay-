import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, UserCircle2, ArrowRight, Lock, LayoutGrid } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-green/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-green/5 blur-[120px] rounded-full pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-12 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center space-y-6">
          <div className="w-20 h-20 bg-brand-green rounded-[24px] flex items-center justify-center shadow-2xl shadow-brand-green/20 border border-brand-green/20">
            <LayoutGrid className="w-10 h-10 text-black" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
              SupplyPay
            </h1>
            <div className="h-1 w-12 bg-brand-green mx-auto rounded-full"></div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Bem-vindo</h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Escolha como deseja acessar sua conta hoje.</p>
        </div>

        <div className="space-y-6 mt-12">
          <motion.button
            whileHover={{ scale: 1.02, translateY: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup/operator')}
            className="w-full group relative bg-brand-card p-8 rounded-[32px] border border-brand-border text-left hover:border-brand-green/30 transition-all overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="bg-brand-green w-14 h-14 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-brand-green/20">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Sou Operadora</h3>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1 max-w-[200px] leading-relaxed">
                    Gestão centralizada de pagamentos e fluxos financeiros.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-brand-green transition-all transform group-hover:translate-x-1" />
            </div>
            {/* Background Pattern */}
            <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
              <Building2 className="w-32 h-32 translate-x-8 translate-y-8" />
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, translateY: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup/supplier')}
            className="w-full group relative bg-brand-card p-8 rounded-[32px] border border-brand-border text-left hover:border-brand-green/30 transition-all overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="bg-brand-input w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-green transition-colors border border-brand-border">
                  <UserCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Sou Fornecedor</h3>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1 max-w-[200px] leading-relaxed">
                    Antecipe recebíveis e gerencie seu fluxo de caixa.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-brand-green transition-all transform group-hover:translate-x-1" />
            </div>
            {/* Background Pattern */}
            <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
              <UserCircle2 className="w-32 h-32 translate-x-8 translate-y-8" />
            </div>
          </motion.button>
        </div>

        <div className="pt-12 space-y-8">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Novo por aqui? <button onClick={() => navigate('/signup/supplier')} className="text-brand-green hover:underline">Crie sua conta</button>
          </p>
          
          <div className="flex justify-center gap-3">
            <div className="w-10 h-1.5 bg-brand-green rounded-full shadow-lg shadow-brand-green/20" />
            <div className="w-10 h-1.5 bg-brand-input rounded-full" />
            <div className="w-10 h-1.5 bg-brand-input rounded-full" />
          </div>

          <div className="flex items-center justify-center gap-3 text-[10px] text-slate-700 uppercase tracking-[0.3em] font-black">
            <Lock className="w-3 h-3" /> ACESSO SEGURO
          </div>
        </div>
      </motion.div>
    </div>
  );
}
