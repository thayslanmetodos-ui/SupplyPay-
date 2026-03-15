export type UserRole = 'operator' | 'supplier' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  cpf?: string;
  bank?: string;
  whatsapp?: string;
  status?: 'ON' | 'OFF';
  balance: number;
  level_points: number;
  is_blocked: boolean;
  is_approved: boolean;
}

export interface Transaction {
  id: number;
  operator_id: number;
  supplier_id: number;
  amount: number;
  supplier_fee: number;
  status: 'PENDING' | 'IN_USE' | 'COMPLETED';
  withdrawal_amount?: number;
  pix_key?: string;
  created_at: string;
  operator_name?: string;
  supplier_name?: string;
}

export type SecurityLevel = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

export interface SystemSettings {
  cpf_price: number;
  supplier_fee_percentage: number;
}
