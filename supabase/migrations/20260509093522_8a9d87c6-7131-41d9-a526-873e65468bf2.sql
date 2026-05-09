
-- 1. user_roles: prevent privilege escalation
DROP POLICY IF EXISTS "Super agents can manage roles" ON public.user_roles;

CREATE POLICY "Super agents can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Super agents can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'))
WITH CHECK (public.has_role(auth.uid(), 'super_agent'));

CREATE POLICY "Super agents can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_agent'));

-- Restrictive safeguard: no user may insert/update a row granting themselves super_agent
CREATE POLICY "Block self super_agent assignment"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (NOT (user_id = auth.uid() AND role = 'super_agent'::app_role))
WITH CHECK (NOT (user_id = auth.uid() AND role = 'super_agent'::app_role));

-- 2. agent-documents storage: restrict SELECT to privileged roles
DROP POLICY IF EXISTS "Authenticated users can view agent documents" ON storage.objects;

CREATE POLICY "Privileged roles can view agent documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-documents'
  AND (
    public.has_role(auth.uid(), 'super_agent')
    OR public.has_role(auth.uid(), 'sales_assistant')
    OR public.has_role(auth.uid(), 'hr_finance')
  )
);

-- 3. float_requests: scope policies to authenticated role
DROP POLICY IF EXISTS "Agents can create their own float requests" ON public.float_requests;
DROP POLICY IF EXISTS "Agents can view their own float requests" ON public.float_requests;
DROP POLICY IF EXISTS "Assistants and super agents can update float requests" ON public.float_requests;
DROP POLICY IF EXISTS "Assistants and super agents can view all float requests" ON public.float_requests;

CREATE POLICY "Agents can create their own float requests"
ON public.float_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can view their own float requests"
ON public.float_requests
FOR SELECT
TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Assistants and super agents can view all float requests"
ON public.float_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'sales_assistant')
  OR public.has_role(auth.uid(), 'super_agent')
);

CREATE POLICY "Assistants and super agents can update float requests"
ON public.float_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'sales_assistant')
  OR public.has_role(auth.uid(), 'super_agent')
);

-- 4. Realtime authorization: restrict channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON realtime.messages;

CREATE POLICY "Authenticated users can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow subscribing to postgres_changes on tables; per-row RLS still applies
  -- but limit broadcast/presence channels to authenticated users only
  (extension IN ('postgres_changes'))
  OR (
    extension IN ('broadcast', 'presence')
    AND auth.uid() IS NOT NULL
  )
);
