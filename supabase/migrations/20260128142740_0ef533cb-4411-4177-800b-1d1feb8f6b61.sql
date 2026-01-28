-- Create employee salaries table
CREATE TABLE public.employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  currency currency_code NOT NULL DEFAULT 'USD',
  payment_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'bi-weekly', 'monthly')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payroll records table
CREATE TABLE public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  currency currency_code NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employee allocations table (lunch, airtime, transport, etc.)
CREATE TABLE public.employee_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('lunch', 'airtime', 'transport', 'equipment', 'advance', 'other')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL DEFAULT 'USD',
  description TEXT,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'rejected')),
  approved_by UUID,
  disbursed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create company expenses table (rent, water, electricity, etc.)
CREATE TABLE public.company_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_type TEXT NOT NULL CHECK (expense_type IN ('rent', 'water', 'electricity', 'internet', 'supplies', 'maintenance', 'other')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL DEFAULT 'USD',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create equipment/tools tracking table
CREATE TABLE public.employee_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('phone', 'tablet', 'laptop', 'uniform', 'id_card', 'other')),
  serial_number TEXT,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
  notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create salary advances/loans table
CREATE TABLE public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL DEFAULT 'USD',
  reason TEXT,
  repayment_plan TEXT,
  monthly_deduction NUMERIC DEFAULT 0,
  remaining_balance NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'repaid', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_salaries
CREATE POLICY "HR/Finance and Super Agents can manage salaries"
ON public.employee_salaries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr_finance') OR has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Employees can view their own salary"
ON public.employee_salaries FOR SELECT TO authenticated
USING (employee_id = auth.uid());

-- RLS policies for payroll_records
CREATE POLICY "HR/Finance and Super Agents can manage payroll"
ON public.payroll_records FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr_finance') OR has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Employees can view their own payroll"
ON public.payroll_records FOR SELECT TO authenticated
USING (employee_id = auth.uid());

-- RLS policies for employee_allocations
CREATE POLICY "HR/Finance and Super Agents can manage allocations"
ON public.employee_allocations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr_finance') OR has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Employees can view their own allocations"
ON public.employee_allocations FOR SELECT TO authenticated
USING (employee_id = auth.uid());

-- RLS policies for company_expenses
CREATE POLICY "HR/Finance and Super Agents can manage expenses"
ON public.company_expenses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr_finance') OR has_role(auth.uid(), 'super_agent'));

-- RLS policies for employee_equipment
CREATE POLICY "HR/Finance and Super Agents can manage equipment"
ON public.employee_equipment FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr_finance') OR has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Employees can view their own equipment"
ON public.employee_equipment FOR SELECT TO authenticated
USING (employee_id = auth.uid());

-- RLS policies for salary_advances
CREATE POLICY "HR/Finance and Super Agents can manage advances"
ON public.salary_advances FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr_finance') OR has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Employees can view their own advances"
ON public.salary_advances FOR SELECT TO authenticated
USING (employee_id = auth.uid());

-- Create updated_at triggers
CREATE TRIGGER update_employee_salaries_updated_at
BEFORE UPDATE ON public.employee_salaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at
BEFORE UPDATE ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_expenses_updated_at
BEFORE UPDATE ON public.company_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_advances_updated_at
BEFORE UPDATE ON public.salary_advances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();