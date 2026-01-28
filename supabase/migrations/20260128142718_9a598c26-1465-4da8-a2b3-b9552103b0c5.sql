-- Add hr_finance role to the enum (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_finance';