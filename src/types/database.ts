export type AppRole = 'super_agent' | 'sales_assistant' | 'sales_agent';
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
export type TransactionType = 'airtime' | 'mtn_momo' | 'digicash' | 'm_gurush' | 'mpesa_kenya' | 'uganda_mobile_money';
export type CurrencyCode = 'USD' | 'SSP' | 'KES' | 'UGX';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  currency: CurrencyCode;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  updated_at: string;
}

export interface Transaction {
  id: string;
  agent_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  recipient_phone: string | null;
  recipient_name: string | null;
  status: TransactionStatus;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  commission_amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  agent?: Profile;
  approver?: Profile;
}

export interface CommissionSettings {
  id: string;
  transaction_type: TransactionType;
  percentage_rate: number;
  fixed_amount: number;
  volume_tier_1_threshold: number;
  volume_tier_1_bonus: number;
  volume_tier_2_threshold: number;
  volume_tier_2_bonus: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface FloatAllocation {
  id: string;
  agent_id: string;
  allocated_by: string | null;
  amount: number;
  currency: CurrencyCode;
  notes: string | null;
  created_at: string;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  airtime: 'Airtime',
  mtn_momo: 'MTN MoMo',
  digicash: 'DigiCash',
  m_gurush: 'M-Gurush',
  mpesa_kenya: 'M-Pesa Kenya',
  uganda_mobile_money: 'Uganda Mobile Money',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  SSP: 'SSP',
  KES: 'KSh',
  UGX: 'USh',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_agent: 'Super Agent',
  sales_assistant: 'Sales Assistant',
  sales_agent: 'Sales Agent',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  failed: 'Failed',
};
