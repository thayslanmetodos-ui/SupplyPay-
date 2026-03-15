import { SecurityLevel } from "./types";

export const getSecurityLevel = (points: number): SecurityLevel => {
  if (points >= 20000) return 'Diamante';
  if (points >= 10000) return 'Ouro';
  if (points >= 5000) return 'Prata';
  return 'Bronze';
};

export const getLevelColor = (level: SecurityLevel) => {
  switch (level) {
    case 'Bronze': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'Prata': return 'text-slate-500 bg-slate-50 border-slate-200';
    case 'Ouro': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'Diamante': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
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
