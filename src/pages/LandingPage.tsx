import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, UserCircle2, ArrowRight, Lock, LayoutGrid } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            SupplyPay
          </h1>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Bem-vindo</h2>
          <p className="text-slate-400">Escolha como deseja acessar sua conta hoje.</p>
        </div>

        <div className="space-y-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup/operator')}
            className="w-full group relative bg-brand-card p-6 rounded-3xl border border-slate-800/50 text-left hover:border-brand-blue/50 transition-all overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-brand-blue w-12 h-12 rounded-xl flex items-center justify-center text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sou Operadora</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Gestão centralizada de pagamentos, contratos e fluxos financeiros.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-brand-blue transition-colors" />
            </div>
            {/* Background Pattern */}
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
              <Building2 className="w-24 h-24 translate-x-4 translate-y-4" />
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup/supplier')}
            className="w-full group relative bg-brand-card p-6 rounded-3xl border border-slate-800/50 text-left hover:border-brand-blue/50 transition-all overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center text-white">
                  <UserCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sou Fornecedor</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Antecipe recebíveis, acompanhe suas faturas e gerencie seu fluxo.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-brand-blue transition-colors" />
            </div>
            {/* Background Pattern */}
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
              <UserCircle2 className="w-24 h-24 translate-x-4 translate-y-4" />
            </div>
          </motion.button>
        </div>

        <div className="pt-8 space-y-6">
          <p className="text-sm text-slate-500">
            Novo por aqui? <button onClick={() => navigate('/signup/supplier')} className="text-indigo-500 font-semibold hover:underline">Crie sua conta</button>
          </p>
          
          <div className="flex justify-center gap-2">
            <div className="w-8 h-1 bg-indigo-600 rounded-full" />
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            <Lock className="w-3 h-3" /> ACESSO SEGURO
          </div>
        </div>
      </motion.div>
    </div>
  );
}
