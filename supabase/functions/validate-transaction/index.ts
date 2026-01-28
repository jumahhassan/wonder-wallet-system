import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation constants
const VALID_TRANSACTION_TYPES = ['airtime', 'mtn_momo', 'digicash', 'm_gurush', 'mpesa_kenya', 'uganda_mobile_money'];
const VALID_CURRENCIES = ['USD', 'SSP', 'KES', 'UGX'];
const VALID_MOBILE_OPERATORS = ['mtn', 'digitel', 'zain'];
const MAX_AMOUNT = 1000000;
const MIN_AMOUNT = 0.01;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// Mobile operator phone prefixes (South Sudan)
const OPERATOR_PREFIXES: Record<string, { local: string; international: string }> = {
  mtn: { local: '092', international: '+21192' },
  digitel: { local: '098', international: '+21198' },
  zain: { local: '091', international: '+21191' },
};

interface TransactionRequest {
  transaction_type: string;
  amount: number;
  currency: string;
  recipient_name?: string;
  recipient_phone: string;
  metadata?: {
    destination?: string;
    notes?: string;
    mobile_operator?: string;
  };
}

// Validate phone number against mobile operator prefix
function validatePhoneForOperator(phone: string, operator: string): { valid: boolean; error?: string } {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const prefixes = OPERATOR_PREFIXES[operator];
  
  if (!prefixes) {
    return { valid: false, error: `Invalid mobile operator: ${operator}` };
  }
  
  const { local, international } = prefixes;
  
  if (cleanPhone.startsWith('+')) {
    if (!cleanPhone.startsWith(international)) {
      return { valid: false, error: `Phone number must start with ${local} or ${international} for ${operator.toUpperCase()}` };
    }
    if (cleanPhone.length !== 13) {
      return { valid: false, error: 'International phone number must be 13 characters' };
    }
  } else {
    if (!cleanPhone.startsWith(local)) {
      return { valid: false, error: `Phone number must start with ${local} or ${international} for ${operator.toUpperCase()}` };
    }
    if (cleanPhone.length !== 10) {
      return { valid: false, error: 'Local phone number must be 10 digits' };
    }
  }
  
  return { valid: true };
}

function validateTransactionInput(data: unknown): { valid: boolean; errors: string[]; data?: TransactionRequest } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const req = data as Record<string, unknown>;

  // Validate transaction_type
  if (!req.transaction_type || typeof req.transaction_type !== 'string') {
    errors.push('Transaction type is required');
  } else if (!VALID_TRANSACTION_TYPES.includes(req.transaction_type)) {
    errors.push(`Invalid transaction type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
  }

  // Validate amount
  if (req.amount === undefined || req.amount === null) {
    errors.push('Amount is required');
  } else if (typeof req.amount !== 'number' || isNaN(req.amount)) {
    errors.push('Amount must be a valid number');
  } else if (req.amount < MIN_AMOUNT) {
    errors.push(`Amount must be at least ${MIN_AMOUNT}`);
  } else if (req.amount > MAX_AMOUNT) {
    errors.push(`Amount cannot exceed ${MAX_AMOUNT}`);
  }

  // Validate currency
  if (!req.currency || typeof req.currency !== 'string') {
    errors.push('Currency is required');
  } else if (!VALID_CURRENCIES.includes(req.currency)) {
    errors.push(`Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}`);
  }

  // Validate recipient_phone
  if (!req.recipient_phone || typeof req.recipient_phone !== 'string') {
    errors.push('Recipient phone is required');
  } else {
    const phone = req.recipient_phone.trim();
    if (phone.length === 0) {
      errors.push('Recipient phone cannot be empty');
    } else if (phone.length > 20) {
      errors.push('Recipient phone is too long (max 20 characters)');
    } else if (!PHONE_REGEX.test(phone.replace(/[\s-]/g, ''))) {
      errors.push('Invalid phone number format');
    }
  }

  // Validate recipient_name (optional)
  if (req.recipient_name !== undefined && req.recipient_name !== null) {
    if (typeof req.recipient_name !== 'string') {
      errors.push('Recipient name must be a string');
    } else if (req.recipient_name.length > 100) {
      errors.push('Recipient name is too long (max 100 characters)');
    }
  }

  // Validate metadata (optional)
  let mobileOperator: string | undefined;
  if (req.metadata !== undefined && req.metadata !== null) {
    if (typeof req.metadata !== 'object') {
      errors.push('Metadata must be an object');
    } else {
      const meta = req.metadata as Record<string, unknown>;
      if (meta.notes && typeof meta.notes === 'string' && meta.notes.length > 500) {
        errors.push('Notes are too long (max 500 characters)');
      }
      if (meta.destination && typeof meta.destination === 'string' && meta.destination.length > 100) {
        errors.push('Destination is too long (max 100 characters)');
      }
      // Extract mobile operator for airtime validation
      if (meta.mobile_operator && typeof meta.mobile_operator === 'string') {
        mobileOperator = meta.mobile_operator;
      }
    }
  }

  // For airtime transactions, validate mobile operator and phone prefix
  if (req.transaction_type === 'airtime') {
    if (!mobileOperator) {
      errors.push('Mobile operator is required for airtime transactions');
    } else if (!VALID_MOBILE_OPERATORS.includes(mobileOperator)) {
      errors.push(`Invalid mobile operator. Must be one of: ${VALID_MOBILE_OPERATORS.join(', ')}`);
    } else if (req.recipient_phone && typeof req.recipient_phone === 'string') {
      // Validate phone prefix matches selected operator
      const phoneValidation = validatePhoneForOperator(req.recipient_phone.trim(), mobileOperator);
      if (!phoneValidation.valid) {
        errors.push(phoneValidation.error!);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      transaction_type: req.transaction_type as string,
      amount: req.amount as number,
      currency: req.currency as string,
      recipient_name: req.recipient_name as string | undefined,
      recipient_phone: (req.recipient_phone as string).trim(),
      metadata: req.metadata as TransactionRequest['metadata'],
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

    console.log('Processing transaction for user:', user.id);

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

    const validation = validateTransactionInput(body);
    if (!validation.valid || !validation.data) {
      console.log('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txData = validation.data;
    console.log('Validated transaction data:', JSON.stringify(txData));

    // Insert the transaction
    const { data: transaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        agent_id: user.id,
        transaction_type: txData.transaction_type,
        amount: txData.amount,
        currency: txData.currency,
        recipient_name: txData.recipient_name?.trim() || null,
        recipient_phone: txData.recipient_phone,
        metadata: txData.metadata || {},
        approval_status: 'pending',
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, errors: ['Failed to create transaction'] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction created:', transaction.id);

    return new Response(
      JSON.stringify({ success: true, data: transaction }),
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
