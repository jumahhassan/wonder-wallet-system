-- Create float_requests table for agents to request money
CREATE TABLE public.float_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency public.currency_code NOT NULL DEFAULT 'SSP',
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.float_requests ENABLE ROW LEVEL SECURITY;

-- Agents can view their own requests
CREATE POLICY "Agents can view their own float requests"
  ON public.float_requests
  FOR SELECT
  USING (auth.uid() = agent_id);

-- Agents can create their own requests
CREATE POLICY "Agents can create their own float requests"
  ON public.float_requests
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Sales assistants and super agents can view all requests
CREATE POLICY "Assistants and super agents can view all float requests"
  ON public.float_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('sales_assistant', 'super_agent')
    )
  );

-- Sales assistants and super agents can update requests (approve/reject)
CREATE POLICY "Assistants and super agents can update float requests"
  ON public.float_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('sales_assistant', 'super_agent')
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_float_requests_updated_at
  BEFORE UPDATE ON public.float_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for float_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.float_requests;