
-- 1. Replace the weak self-only restrictive policy with a full block on super_agent assignment
DROP POLICY IF EXISTS "Block self super_agent assignment" ON public.user_roles;

CREATE POLICY "Block super_agent role assignment via client"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (role <> 'super_agent'::app_role)
WITH CHECK (role <> 'super_agent'::app_role);

-- Note: Super agent promotions must now be performed via an edge function using the
-- service role key, which bypasses RLS. Existing super_agent rows are unaffected
-- (the USING clause only applies to UPDATE/DELETE of super_agent rows, which is
-- now also blocked from the client — intended).

-- 2. Tighten realtime.messages scoping by topic
DROP POLICY IF EXISTS "Authenticated users can subscribe to broadcast and presence" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated broadcast and presence subscriptions" ON realtime.messages;

CREATE POLICY "Scoped realtime broadcast and presence subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension IN ('broadcast', 'presence')
  AND auth.uid() IS NOT NULL
  AND (
    -- User-scoped channels: "user:<uid>:..."
    topic LIKE 'user:' || auth.uid()::text || ':%'
    OR topic = 'user:' || auth.uid()::text
    -- Role-scoped channels: "role:<role>:..." restricted to that role
    OR (topic LIKE 'role:super_agent:%' AND public.has_role(auth.uid(), 'super_agent'::app_role))
    OR (topic LIKE 'role:sales_assistant:%' AND public.has_role(auth.uid(), 'sales_assistant'::app_role))
    OR (topic LIKE 'role:sales_agent:%' AND public.has_role(auth.uid(), 'sales_agent'::app_role))
    OR (topic LIKE 'role:hr_finance:%' AND public.has_role(auth.uid(), 'hr_finance'::app_role))
    OR (topic LIKE 'role:marketing:%' AND public.has_role(auth.uid(), 'marketing'::app_role))
    -- Public channels: "public:..." readable by any authenticated user
    OR topic LIKE 'public:%'
  )
);
