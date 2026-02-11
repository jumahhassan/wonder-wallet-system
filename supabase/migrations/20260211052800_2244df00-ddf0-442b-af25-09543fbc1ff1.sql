
-- Step 1: Add network column
ALTER TABLE public.wallets ADD COLUMN network text DEFAULT NULL;

-- Step 2: Drop old unique constraint
ALTER TABLE public.wallets DROP CONSTRAINT wallets_user_id_currency_key;

-- Step 3: Add new unique constraint including network  
ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_currency_network_key UNIQUE (user_id, currency, network);

-- Step 4: Create network-specific SSP wallets for existing users
INSERT INTO public.wallets (user_id, currency, balance, network)
SELECT u.user_id, 'SSP', 0, n.network
FROM (SELECT DISTINCT user_id FROM public.wallets) u
CROSS JOIN (VALUES ('mtn'), ('zain'), ('digitel')) AS n(network)
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w 
  WHERE w.user_id = u.user_id AND w.currency = 'SSP' AND w.network = n.network
);

-- Step 5: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  INSERT INTO public.wallets (user_id, currency, balance, network) VALUES
    (NEW.id, 'SSP', 0, 'mtn'),
    (NEW.id, 'SSP', 0, 'zain'),
    (NEW.id, 'SSP', 0, 'digitel');
  
  RETURN NEW;
END;
$function$;
