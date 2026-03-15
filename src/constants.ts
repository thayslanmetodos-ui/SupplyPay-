import { SecurityLevel } from "./types";

export const getSecurityLevel = (points: number): SecurityLevel => {
  if (points >= 20000) return 'Diamante';
  if (points >= 10000) return 'Ouro';
  if (points >= 5000) return 'Prata';
  return 'Bronze';
};

export const getLevelStyles = (level: SecurityLevel) => {
  switch (level) {
    case 'Bronze': return {
      text: 'text-amber-500',
      bg: 'bg-amber-500',
      lightBg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    };
    case 'Prata': return {
      text: 'text-slate-400',
      bg: 'bg-slate-400',
      lightBg: 'bg-slate-400/10',
      border: 'border-slate-400/20'
    };
    case 'Ouro': return {
      text: 'text-yellow-500',
      bg: 'bg-yellow-500',
      lightBg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    };
    case 'Diamante': return {
      text: 'text-brand-green',
      bg: 'bg-brand-green',
      lightBg: 'bg-brand-green/10',
      border: 'border-brand-green/20'
    };
  }
};

export const getLevelIcon = (level: SecurityLevel) => {
  switch (level) {
    case 'Bronze': return '🥉';
    case 'Prata': return '🥈';
    case 'Ouro': return '🥇';
    case 'Diamante': return '💎';
  }
};
