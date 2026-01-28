-- Create storage bucket for agent documents (photos and IDs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', false);

-- Storage policy: Authenticated users can view documents
CREATE POLICY "Authenticated users can view agent documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-documents');

-- Storage policy: Super agents and sales assistants can upload documents
CREATE POLICY "Super agents and sales assistants can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-documents' AND
  (has_role(auth.uid(), 'super_agent') OR has_role(auth.uid(), 'sales_assistant'))
);

-- Storage policy: Super agents and sales assistants can update documents
CREATE POLICY "Super agents and sales assistants can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  (has_role(auth.uid(), 'super_agent') OR has_role(auth.uid(), 'sales_assistant'))
);

-- Storage policy: Super agents can delete documents
CREATE POLICY "Super agents can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  has_role(auth.uid(), 'super_agent')
);

-- Add photo and national ID fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS national_id_url TEXT;

-- Create SIM card inventory table
CREATE TABLE public.sim_card_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocated_by UUID REFERENCES auth.users(id),
  allocated_to UUID REFERENCES auth.users(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SIM card sales table
CREATE TABLE public.sim_card_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  quantity_sold INTEGER NOT NULL CHECK (quantity_sold > 0),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.sim_card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_card_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for sim_card_inventory
CREATE POLICY "Super agents and sales assistants can view all inventory"
ON public.sim_card_inventory FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_agent') OR has_role(auth.uid(), 'sales_assistant'));

CREATE POLICY "Super agents and sales assistants can manage inventory"
ON public.sim_card_inventory FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_agent') OR has_role(auth.uid(), 'sales_assistant'));

CREATE POLICY "Agents can view their own inventory allocations"
ON public.sim_card_inventory FOR SELECT
TO authenticated
USING (allocated_to = auth.uid());

-- RLS policies for sim_card_sales
CREATE POLICY "Super agents and sales assistants can view all sales"
ON public.sim_card_sales FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_agent') OR has_role(auth.uid(), 'sales_assistant'));

CREATE POLICY "Super agents and sales assistants can manage sales"
ON public.sim_card_sales FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_agent') OR has_role(auth.uid(), 'sales_assistant'));

CREATE POLICY "Agents can view their own sales"
ON public.sim_card_sales FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

CREATE POLICY "Agents can record their own sales"
ON public.sim_card_sales FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());