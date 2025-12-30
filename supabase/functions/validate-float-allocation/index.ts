import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_CURRENCIES = ['USD', 'SSP', 'KES', 'UGX'];
const MAX_ALLOCATION_AMOUNT = 1000000;
const MIN_ALLOCATION_AMOUNT = 0.01;

interface AllocationRequest {
  agent_id: string;
  amount: number;
  currency: string;
  notes?: string;
}

function validateAllocationInput(data: unknown): { valid: boolean; errors: string[]; data?: AllocationRequest } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const req = data as Record<string, unknown>;

  // Validate agent_id
  if (!req.agent_id || typeof req.agent_id !== 'string') {
    errors.push('Agent ID is required');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.agent_id)) {
    errors.push('Invalid agent ID format');
  }

  // Validate amount
  if (req.amount === undefined || req.amount === null) {
    errors.push('Amount is required');
  } else if (typeof req.amount !== 'number' || isNaN(req.amount)) {
    errors.push('Amount must be a valid number');
  } else if (req.amount < MIN_ALLOCATION_AMOUNT) {
    errors.push(`Amount must be at least ${MIN_ALLOCATION_AMOUNT}`);
  } else if (req.amount > MAX_ALLOCATION_AMOUNT) {
    errors.push(`Amount cannot exceed ${MAX_ALLOCATION_AMOUNT}`);
  }

  // Validate currency
  if (!req.currency || typeof req.currency !== 'string') {
    errors.push('Currency is required');
  } else if (!VALID_CURRENCIES.includes(req.currency)) {
    errors.push(`Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}`);
  }

  // Validate notes (optional)
  if (req.notes !== undefined && req.notes !== null) {
    if (typeof req.notes !== 'string') {
      errors.push('Notes must be a string');
    } else if (req.notes.length > 500) {
      errors.push('Notes are too long (max 500 characters)');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      agent_id: req.agent_id as string,
      amount: req.amount as number,
      currency: req.currency as string,
      notes: req.notes as string | undefined,
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized'] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized'] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has the right role (super_agent or sales_assistant)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !roleData) {
      console.log('Role check failed:', roleError?.message);
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized'] }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['super_agent', 'sales_assistant'].includes(roleData.role)) {
      console.log('User does not have permission:', roleData.role);
      return new Response(
        JSON.stringify({ success: false, errors: ['Insufficient permissions'] }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing float allocation for user:', user.id, 'with role:', roleData.role);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, errors: ['Invalid JSON body'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateAllocationInput(body);
    if (!validation.valid || !validation.data) {
      console.log('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { agent_id, amount, currency, notes } = validation.data;
    console.log('Validated allocation data:', { agent_id, amount, currency });

    // Verify the agent exists
    const { data: agentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', agent_id)
      .maybeSingle();

    if (profileError || !agentProfile) {
      console.log('Agent not found:', profileError?.message);
      return new Response(
        JSON.stringify({ success: false, errors: ['Agent not found'] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert float allocation record
    const { error: allocationError } = await supabase
      .from('float_allocations')
      .insert({
        agent_id,
        amount,
        currency,
        allocated_by: user.id,
        notes: notes || null,
      });

    if (allocationError) {
      console.error('Allocation insert error:', allocationError);
      return new Response(
        JSON.stringify({ success: false, errors: ['Failed to record allocation'] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and update wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', agent_id)
      .eq('currency', currency)
      .maybeSingle();

    if (walletError) {
      console.error('Wallet fetch error:', walletError);
      return new Response(
        JSON.stringify({ success: false, errors: ['Failed to fetch wallet'] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (wallet) {
      const newBalance = Number(wallet.balance) + amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('Wallet update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, errors: ['Failed to update wallet balance'] }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Wallet updated:', wallet.id, 'new balance:', newBalance);
    }

    console.log('Float allocation completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Float allocated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, errors: ['An unexpected error occurred'] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
