import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, Search, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function EmailLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'sent_emails'),
      orderBy('sent_at', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const l = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(l);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'templates'>('logs');
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'email_templates'));
    return onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const filteredLogs = logs.filter(log => 
    log.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveTemplate = async (id: string, data: any) => {
    try {
      await setDoc(doc(db, 'email_templates', id), data, { merge: true });
      alert('Template atualizado com sucesso!');
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-black uppercase tracking-tight">Painel de E-mails</h3>
          <div className="flex bg-brand-input rounded-xl p-1 border border-brand-border">
            <button 
              onClick={() => setActiveSubTab('logs')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'logs' ? 'bg-brand-green text-black' : 'text-slate-500 hover:text-white'}`}
            >
              Logs de Envio
            </button>
            <button 
              onClick={() => setActiveSubTab('templates')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'templates' ? 'bg-brand-green text-black' : 'text-slate-500 hover:text-white'}`}
            >
              Personalizar Templates
            </button>
          </div>
        </div>
        <div className="bg-brand-green/10 px-4 py-2 rounded-full border border-brand-green/20">
          <p className="text-[10px] font-black text-brand-green uppercase tracking-widest">supplypay@gmail.com</p>
        </div>
      </div>

      {activeSubTab === 'logs' ? (
        <>
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-green transition-colors" />
            <input 
              type="text"
              placeholder="Buscar por destinatário, assunto ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-input border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/5 transition-all"
            />
          </div>

          <div className="bg-brand-card border border-brand-border rounded-[32px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-bottom border-brand-border bg-brand-input/50">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Destinatário</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Assunto</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando logs...</td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum e-mail enviado recentemente.</td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-brand-input/30 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-input border border-brand-border rounded-lg flex items-center justify-center">
                              <Mail className="w-4 h-4 text-slate-600" />
                            </div>
                            <span className="text-sm font-bold">{log.to}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-400">{log.subject}</td>
                        <td className="p-4">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-brand-input border border-brand-border rounded-md">
                            {log.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {log.sent_at?.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {log.status === 'success' ? (
                            <div className="flex items-center gap-1 text-brand-green">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Enviado</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Erro</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => setSelectedEmail(log)}
                            className="p-2 bg-brand-input border border-brand-border rounded-xl hover:border-brand-green/50 hover:text-brand-green transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['registration', 'approval', 'transaction-confirmed', 'password-reset', 'operation-request'].map(type => {
            const template = templates.find(t => t.id === type) || { subject: '', html: '' };
            return (
              <div key={type} className="bg-brand-card border border-brand-border rounded-[32px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-brand-green">{type}</h4>
                  <button 
                    onClick={() => saveTemplate(type, template)}
                    className="text-[10px] font-black uppercase tracking-widest bg-brand-green text-black px-3 py-1 rounded-lg"
                  >
                    Salvar
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assunto</label>
                    <input 
                      type="text"
                      value={template.subject}
                      onChange={(e) => {
                        const newTemplates = [...templates];
                        const idx = newTemplates.findIndex(t => t.id === type);
                        if (idx >= 0) newTemplates[idx].subject = e.target.value;
                        else newTemplates.push({ id: type, subject: e.target.value, html: '' });
                        setTemplates(newTemplates);
                      }}
                      className="w-full bg-brand-input border border-brand-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-green"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">HTML Body</label>
                    <textarea 
                      value={template.html}
                      onChange={(e) => {
                        const newTemplates = [...templates];
                        const idx = newTemplates.findIndex(t => t.id === type);
                        if (idx >= 0) newTemplates[idx].html = e.target.value;
                        else newTemplates.push({ id: type, subject: '', html: e.target.value });
                        setTemplates(newTemplates);
                      }}
                      rows={6}
                      className="w-full bg-brand-input border border-brand-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-green font-mono"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Email Preview Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-card border border-brand-border rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-input/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Visualizar E-mail</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ID: {selectedEmail.message_id || selectedEmail.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmail(null)}
                  className="p-3 bg-brand-input border border-brand-border rounded-2xl hover:bg-brand-border transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-input p-4 rounded-2xl border border-brand-border">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Para</p>
                    <p className="text-sm font-bold">{selectedEmail.to}</p>
                  </div>
                  <div className="bg-brand-input p-4 rounded-2xl border border-brand-border">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Assunto</p>
                    <p className="text-sm font-bold">{selectedEmail.subject}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-brand-border min-h-[200px]">
                  {/* Render HTML content safely or as text if preferred */}
                  <div 
                    className="text-slate-900 text-sm prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html || '<p>Conteúdo não disponível para visualização direta.</p>' }}
                  />
                </div>
              </div>

              <div className="p-8 bg-brand-input/50 border-t border-brand-border flex justify-end">
                <button 
                  onClick={() => setSelectedEmail(null)}
                  className="px-8 py-4 bg-brand-border text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-border/80 transition-all"
                >
                  Fechar Visualização
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
