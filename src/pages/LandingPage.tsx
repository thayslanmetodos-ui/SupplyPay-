import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Building2, 
  UserCircle2, 
  ArrowRight, 
  Lock, 
  LayoutGrid, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Globe,
  CheckCircle2,
  ChevronRight,
  MousePointer2,
  Wallet,
  Shield,
  Cpu
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [banner, setBanner] = useState<{ url: string, text: string } | null>(null);

  useEffect(() => {
    const unsubBanner = onSnapshot(doc(db, 'settings', 'banners'), (doc) => {
      if (doc.exists()) {
        setBanner(doc.data() as any);
      }
    });
    return () => unsubBanner();
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark font-sans text-white selection:bg-brand-green/30 overflow-x-hidden">
      {/* Banner Section */}
      <AnimatePresence>
        {banner && banner.url && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-[60] bg-brand-green overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-black/10">
                  <img src={banner.url} alt="Promo" className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] font-black text-black uppercase tracking-widest leading-none">
                  {banner.text}
                </p>
              </div>
              <button 
                onClick={() => setBanner(null)}
                className="text-black/50 hover:text-black transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-green/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-green/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center shadow-lg shadow-brand-green/20 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-black fill-black" />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter">SupplyPay</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <a href="#features" className="hover:text-brand-green transition-colors">Funcionalidades</a>
          <a href="#security" className="hover:text-brand-green transition-colors">Segurança</a>
          <a href="#about" className="hover:text-brand-green transition-colors">Sobre</a>
          <button 
            onClick={() => navigate('/login')}
            className="bg-white/5 border border-white/10 text-white px-6 py-2.5 rounded-xl hover:bg-white/10 transition-all backdrop-blur-md"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/10 border border-brand-green/20"
          >
            <Cpu className="w-4 h-4 text-brand-green animate-pulse" />
            <span className="text-[10px] font-black text-brand-green uppercase tracking-widest">Infraestrutura Financeira de Alta Performance</span>
          </motion.div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase">
            Gestão de <span className="text-brand-green">CPFs</span> para Operações de Alto Volume.
          </h1>
          <p className="text-slate-400 text-lg max-w-lg leading-relaxed font-medium">
            A solução definitiva para conectar fornecedores de liquidez e operadores bancários. Segurança, velocidade e transparência em um ecossistema P2P robusto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/signup/supplier')}
              className="bg-brand-green text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20 flex items-center justify-center gap-3 group"
            >
              Começar Agora <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all backdrop-blur-md"
            >
              Ver Demonstração
            </motion.button>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-6 pt-8"
          >
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-dark bg-slate-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span className="text-white">+2.500</span> Operações processadas hoje
            </p>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
          whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative perspective-1000"
        >
          <div className="relative z-10 bg-brand-card/80 backdrop-blur-xl border border-brand-border p-8 rounded-[48px] shadow-2xl shadow-brand-green/5">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Volume em Tempo Real</p>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-4xl font-black tracking-tighter"
                  >
                    R$ 1.425.000,00
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-brand-green" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-brand-input border border-brand-border p-6 rounded-3xl space-y-2"
                >
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Operadores Ativos</p>
                  <p className="text-xl font-black">42</p>
                </motion.div>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-brand-input border border-brand-border p-6 rounded-3xl space-y-2"
                >
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tempo Médio</p>
                  <p className="text-xl font-black text-brand-green">45s</p>
                </motion.div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fluxo de Operações</p>
                {[1,2].map(i => (
                  <motion.div 
                    key={i} 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-black">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">Saque Confirmado</p>
                        <p className="text-[10px] text-slate-500 font-bold">Agora mesmo</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-brand-green">+ R$ 12.500</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-green/20 blur-[80px] rounded-full animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-green/10 blur-[80px] rounded-full animate-pulse"></div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="relative z-10 py-32 px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="text-center space-y-4 mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black uppercase tracking-tighter"
          >
            Como <span className="text-brand-green">Funciona</span>
          </motion.h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Simplicidade e eficiência em 3 passos</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-border to-transparent -translate-y-1/2 z-0"></div>
          
          {[
            { step: '01', title: 'Cadastro e Validação', desc: 'Operadores e fornecedores passam por um rigoroso processo de KYC para garantir a segurança da rede.' },
            { step: '02', title: 'Disponibilização', desc: 'Fornecedores ativam seus CPFs e definem limites. Operadores visualizam a liquidez disponível em tempo real.' },
            { step: '03', title: 'Operação Assistida', desc: 'Transferências via PIX automatizadas com monitoramento 24/7 e suporte direto via chat.' }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10 bg-brand-card border border-brand-border p-10 rounded-[40px] text-center space-y-6 hover:border-brand-green/30 transition-all group"
            >
              <div className="w-16 h-16 bg-brand-dark border border-brand-border rounded-2xl flex items-center justify-center mx-auto group-hover:bg-brand-green group-hover:text-black transition-all duration-500">
                <span className="text-2xl font-black tracking-tighter">{item.step}</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">{item.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Access Selection */}
      <section className="relative z-10 py-32 px-8 bg-brand-input/30">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Escolha seu <span className="text-brand-green">Perfil</span></h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Acesso rápido e seguro para sua operação</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.button
              whileHover={{ scale: 1.02, translateY: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/signup/operator')}
              className="group relative bg-brand-card p-10 rounded-[40px] border border-brand-border text-left hover:border-brand-green/30 transition-all overflow-hidden shadow-2xl"
            >
              <div className="space-y-8 relative z-10">
                <div className="bg-brand-green w-16 h-16 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-brand-green/20">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Sou Operadora</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    Gestão centralizada de pagamentos, fluxos financeiros e controle total de fornecedores.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-brand-green font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                  Acessar Painel <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                <Building2 className="w-48 h-48 translate-x-12 translate-y-12" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, translateY: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/signup/supplier')}
              className="group relative bg-brand-card p-10 rounded-[40px] border border-brand-border text-left hover:border-brand-green/30 transition-all overflow-hidden shadow-2xl"
            >
              <div className="space-y-8 relative z-10">
                <div className="bg-brand-input w-16 h-16 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-green transition-colors border border-brand-border">
                  <UserCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Sou Fornecedor</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    Antecipe seus recebíveis em segundos, gerencie seu fluxo de caixa e cresça seu negócio.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-brand-green font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                  Acessar Painel <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                <UserCircle2 className="w-48 h-48 translate-x-12 translate-y-12" />
              </div>
            </motion.button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-32 px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { icon: Zap, title: 'Velocidade Instantânea', desc: 'Pagamentos e antecipações processados em tempo real, sem burocracia.' },
            { icon: ShieldCheck, title: 'Segurança Bancária', desc: 'Criptografia de ponta a ponta e conformidade total com normas financeiras.' },
            { icon: Globe, title: 'Escalabilidade Global', desc: 'Infraestrutura robusta pronta para suportar o crescimento da sua empresa.' }
          ].map((feature, i) => (
            <div key={i} className="space-y-6 p-8 rounded-[32px] bg-brand-card/50 border border-brand-border hover:border-brand-green/20 transition-colors">
              <div className="w-14 h-14 bg-brand-green/10 rounded-2xl flex items-center justify-center">
                <feature.icon className="w-7 h-7 text-brand-green" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tight">{feature.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-8 border-t border-brand-border bg-brand-dark">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-black fill-black" />
              </div>
              <span className="text-xl font-black tracking-tighter">SupplyPay</span>
            </div>
            <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">
              Transformando a relação entre operadoras e fornecedores através de tecnologia financeira de ponta.
            </p>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Links Rápidos</h4>
            <ul className="space-y-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <li><a href="#" className="hover:text-brand-green transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-brand-green transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-brand-green transition-colors">Suporte</a></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Contato</h4>
            <ul className="space-y-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <li>contato@supplypay.com</li>
              <li>+55 (11) 99999-9999</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-20 text-center">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.5em]">
            &copy; 2026 SupplyPay Gateway &bull; Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}

