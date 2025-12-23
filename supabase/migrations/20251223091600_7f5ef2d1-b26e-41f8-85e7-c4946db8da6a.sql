-- Create enums for the system
CREATE TYPE public.app_role AS ENUM ('super_agent', 'sales_assistant', 'sales_agent');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');
CREATE TYPE public.transaction_type AS ENUM ('airtime', 'mtn_momo', 'digicash', 'm_gurush', 'mpesa_kenya', 'uganda_mobile_money');
CREATE TYPE public.currency_code AS ENUM ('USD', 'SSP', 'KES', 'UGX');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'sales_agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency currency_code NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);

-- Create exchange_rates table
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency currency_code NOT NULL,
  to_currency currency_code NOT NULL,
  rate DECIMAL(15,6) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency currency_code NOT NULL DEFAULT 'USD',
  recipient_phone TEXT,
  recipient_name TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  commission_amount DECIMAL(15,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create commission_settings table
CREATE TABLE public.commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type transaction_type NOT NULL,
  percentage_rate DECIMAL(5,2) NOT NULL DEFAULT 1.5,
  fixed_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  volume_tier_1_threshold DECIMAL(15,2) DEFAULT 10000,
  volume_tier_1_bonus DECIMAL(5,2) DEFAULT 0.5,
  volume_tier_2_threshold DECIMAL(15,2) DEFAULT 50000,
  volume_tier_2_bonus DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_type)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create float_management table
CREATE TABLE public.float_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  allocated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency currency_code NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.float_allocations ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Super agents and sales assistants can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_agent') OR
  public.has_role(auth.uid(), 'sales_assistant')
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super agents can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Super agents can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallets"
ON public.wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super agents can view all wallets"
ON public.wallets FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Super agents and sales assistants can manage wallets"
ON public.wallets FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_agent') OR
  public.has_role(auth.uid(), 'sales_assistant')
);

-- RLS Policies for exchange_rates
CREATE POLICY "Anyone authenticated can view exchange rates"
ON public.exchange_rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super agents can manage exchange rates"
ON public.exchange_rates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

-- RLS Policies for transactions
CREATE POLICY "Agents can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

CREATE POLICY "Super agents and sales assistants can view all transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_agent') OR
  public.has_role(auth.uid(), 'sales_assistant')
);

CREATE POLICY "Authenticated users can create transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Super agents and sales assistants can update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_agent') OR
  public.has_role(auth.uid(), 'sales_assistant')
);

-- RLS Policies for commission_settings
CREATE POLICY "Anyone authenticated can view commission settings"
ON public.commission_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super agents can manage commission settings"
ON public.commission_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

-- RLS Policies for audit_logs
CREATE POLICY "Super agents can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for float_allocations
CREATE POLICY "Agents can view their own float allocations"
ON public.float_allocations FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

CREATE POLICY "Super agents and sales assistants can view all allocations"
ON public.float_allocations FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_agent') OR
  public.has_role(auth.uid(), 'sales_assistant')
);

CREATE POLICY "Super agents and sales assistants can manage allocations"
ON public.float_allocations FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_agent') OR
  public.has_role(auth.uid(), 'sales_assistant')
);

-- Create trigger for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sales_agent');
  
  INSERT INTO public.wallets (user_id, currency, balance) VALUES
    (NEW.id, 'USD', 0),
    (NEW.id, 'SSP', 0),
    (NEW.id, 'KES', 0),
    (NEW.id, 'UGX', 0);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Insert default exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'SSP', 130.50),
  ('USD', 'KES', 153.25),
  ('USD', 'UGX', 3750.00),
  ('SSP', 'USD', 0.00766),
  ('KES', 'USD', 0.00652),
  ('UGX', 'USD', 0.000267),
  ('SSP', 'KES', 1.174),
  ('KES', 'SSP', 0.852),
  ('SSP', 'UGX', 28.74),
  ('UGX', 'SSP', 0.0348),
  ('KES', 'UGX', 24.47),
  ('UGX', 'KES', 0.0409);

-- Insert default commission settings
INSERT INTO public.commission_settings (transaction_type, percentage_rate, fixed_amount, volume_tier_1_threshold, volume_tier_1_bonus, volume_tier_2_threshold, volume_tier_2_bonus) VALUES
  ('airtime', 2.0, 0.50, 5000, 0.5, 20000, 1.0),
  ('mtn_momo', 1.5, 0.25, 10000, 0.5, 50000, 1.0),
  ('digicash', 1.5, 0.25, 10000, 0.5, 50000, 1.0),
  ('m_gurush', 1.5, 0.25, 10000, 0.5, 50000, 1.0),
  ('mpesa_kenya', 2.5, 1.00, 5000, 0.75, 25000, 1.5),
  ('uganda_mobile_money', 2.5, 1.00, 5000, 0.75, 25000, 1.5);