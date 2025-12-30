import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_CURRENCIES = ['USD', 'SSP', 'KES', 'UGX'];
const MAX_TOPUP_AMOUNT = 1000000;
const MIN_TOPUP_AMOUNT = 0.01;

interface TopUpRequest {
  wallet_id: string;
  amount: number;
}

function validateTopUpInput(data: unknown): { valid: boolean; errors: string[]; data?: TopUpRequest } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const req = data as Record<string, unknown>;

  // Validate wallet_id
  if (!req.wallet_id || typeof req.wallet_id !== 'string') {
    errors.push('Wallet ID is required');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.wallet_id)) {
    errors.push('Invalid wallet ID format');
  }

  // Validate amount
  if (req.amount === undefined || req.amount === null) {
    errors.push('Amount is required');
  } else if (typeof req.amount !== 'number' || isNaN(req.amount)) {
    errors.push('Amount must be a valid number');
  } else if (req.amount < MIN_TOPUP_AMOUNT) {
    errors.push(`Amount must be at least ${MIN_TOPUP_AMOUNT}`);
  } else if (req.amount > MAX_TOPUP_AMOUNT) {
    errors.push(`Amount cannot exceed ${MAX_TOPUP_AMOUNT}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      wallet_id: req.wallet_id as string,
      amount: req.amount as number,
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

    console.log('Processing top-up for user:', user.id, 'with role:', roleData.role);

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

    const validation = validateTopUpInput(body);
    if (!validation.valid || !validation.data) {
      console.log('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { wallet_id, amount } = validation.data;
    console.log('Validated top-up data:', { wallet_id, amount });

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency, user_id')
      .eq('id', wallet_id)
      .maybeSingle();

    if (walletError || !wallet) {
      console.log('Wallet not found:', walletError?.message);
      return new Response(
        JSON.stringify({ success: false, errors: ['Wallet not found'] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newBalance = Number(wallet.balance) + amount;
    console.log('Updating wallet balance:', wallet.balance, '->', newBalance);

    // Update the wallet
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, errors: ['Failed to update wallet'] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Wallet updated successfully:', updatedWallet.id);

    return new Response(
      JSON.stringify({ success: true, data: updatedWallet }),
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
