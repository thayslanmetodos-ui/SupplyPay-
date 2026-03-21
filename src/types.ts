export type UserRole = 'operator' | 'supplier' | 'admin';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  cpf?: string;
  bank?: string;
  whatsapp?: string;
  status?: 'ON' | 'OFF';
  pix_key?: string;
  balance: number;
  level_points: number;
  is_blocked: boolean;
  is_approved: boolean;
  operator_code?: string;
  created_at?: any;
  last_login?: any;
}

export interface Transaction {
  id: string;
  operator_id: string;
  supplier_id: string;
  amount: number;
  supplier_fee: number;
  status: 'PENDING' | 'IN_USE' | 'AWAITING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'COMPLETED' | 'FAILED';
  withdrawal_amount?: number;
  pix_key?: string;
  created_at: any;
  operator_name?: string;
  supplier_name?: string;
  operator_pix_key?: string;
  cpf?: string;
  bank?: string;
  whatsapp?: string;
}

export type SecurityLevel = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

export interface AppNotification {
  id: string;
  uid?: string;
  type: 'PURCHASE' | 'WITHDRAWAL_COMPLETED' | 'WITHDRAWAL_FAILED' | 'SYSTEM' | 'ADMIN_MSG';
  message: string;
  transactionId?: string;
  created_at: any;
  read: boolean;
}

export interface SystemSettings {
  cpf_price: number;
  supplier_fee_percentage: number;
}
