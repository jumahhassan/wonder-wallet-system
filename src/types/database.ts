export type AppRole = 'super_agent' | 'sales_assistant' | 'sales_agent' | 'hr_finance';
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
export type TransactionType = 'airtime' | 'mtn_momo' | 'digicash' | 'm_gurush' | 'mpesa_kenya' | 'uganda_mobile_money';
export type CurrencyCode = 'USD' | 'SSP' | 'KES' | 'UGX';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';
export type AllocationTypes = 'lunch' | 'airtime' | 'transport' | 'equipment' | 'advance' | 'other';
export type ExpenseType = 'rent' | 'water' | 'electricity' | 'internet' | 'supplies' | 'maintenance' | 'other';
export type PayrollStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type EquipmentType = 'phone' | 'tablet' | 'laptop' | 'uniform' | 'id_card' | 'other';
export type AdvanceStatus = 'pending' | 'approved' | 'active' | 'repaid' | 'rejected';

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

export interface EmployeeSalary {
  id: string;
  employee_id: string;
  base_salary: number;
  currency: CurrencyCode;
  payment_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  effective_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  base_amount: number;
  commission_amount: number;
  deductions: number;
  net_amount: number;
  currency: CurrencyCode;
  status: PayrollStatus;
  paid_at: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAllocation {
  id: string;
  employee_id: string;
  allocation_type: AllocationTypes;
  amount: number;
  currency: CurrencyCode;
  description: string | null;
  allocation_date: string;
  status: 'pending' | 'approved' | 'disbursed' | 'rejected';
  approved_by: string | null;
  disbursed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CompanyExpense {
  id: string;
  expense_type: ExpenseType;
  amount: number;
  currency: CurrencyCode;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeEquipment {
  id: string;
  employee_id: string;
  item_name: string;
  item_type: EquipmentType;
  serial_number: string | null;
  assigned_date: string;
  returned_date: string | null;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
}

export interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  currency: CurrencyCode;
  reason: string | null;
  repayment_plan: string | null;
  monthly_deduction: number;
  remaining_balance: number;
  status: AdvanceStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
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
  hr_finance: 'HR/Finance',
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

export const ALLOCATION_TYPE_LABELS: Record<AllocationTypes, string> = {
  lunch: 'Lunch Money',
  airtime: 'Airtime',
  transport: 'Transport',
  equipment: 'Equipment',
  advance: 'Advance',
  other: 'Other',
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  rent: 'Rent',
  water: 'Water',
  electricity: 'Electricity',
  internet: 'Internet',
  supplies: 'Supplies',
  maintenance: 'Maintenance',
  other: 'Other',
};

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  laptop: 'Laptop',
  uniform: 'Uniform',
  id_card: 'ID Card',
  other: 'Other',
};
