-- Add 'escalated' value to approval_status enum
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'escalated';

-- Add escalation columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS escalated_by uuid,
ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS escalation_reason text;