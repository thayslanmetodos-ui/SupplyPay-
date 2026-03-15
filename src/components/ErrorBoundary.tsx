import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      let errorDetail = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = 'Erro de Permissão ou Banco de Dados';
            errorDetail = parsed;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-brand-card border border-brand-border rounded-[32px] p-10 space-y-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto text-red-500">
              <ShieldAlert className="w-10 h-10" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight text-white">{errorMessage}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {errorDetail 
                  ? `Não foi possível completar a operação: ${errorDetail.operationType} em ${errorDetail.path}. Verifique suas permissões.`
                  : 'Nossa equipe técnica já foi notificada. Por favor, tente recarregar a página.'}
              </p>
            </div>

            {errorDetail && (
              <div className="bg-brand-input border border-brand-border rounded-2xl p-4 text-left overflow-hidden">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Detalhes Técnicos</p>
                <pre className="text-[10px] text-red-400 font-mono overflow-x-auto">
                  {JSON.stringify(errorDetail, null, 2)}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-brand-green text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-xl shadow-brand-green/20"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 bg-brand-input border border-brand-border text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-border transition-all"
              >
                <Home className="w-4 h-4" /> Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
