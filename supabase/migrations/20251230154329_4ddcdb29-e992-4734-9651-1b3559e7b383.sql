-- Add CHECK constraints for positive amounts and valid values

-- Transactions table: amount must be positive
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);

-- Wallets table: balance cannot be negative
ALTER TABLE public.wallets 
ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);

-- Float allocations: amount must be positive
ALTER TABLE public.float_allocations 
ADD CONSTRAINT float_allocations_amount_positive CHECK (amount > 0);

-- Commission settings: rates must be non-negative
ALTER TABLE public.commission_settings 
ADD CONSTRAINT commission_percentage_non_negative CHECK (percentage_rate >= 0);

ALTER TABLE public.commission_settings 
ADD CONSTRAINT commission_fixed_non_negative CHECK (fixed_amount >= 0);

-- Exchange rates: rate must be positive
ALTER TABLE public.exchange_rates 
ADD CONSTRAINT exchange_rate_positive CHECK (rate > 0);

-- Add length constraints on text fields
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_phone_length CHECK (length(phone) <= 20);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_full_name_length CHECK (length(full_name) <= 100);

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_recipient_name_length CHECK (length(recipient_name) <= 100);

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_recipient_phone_length CHECK (length(recipient_phone) <= 20);