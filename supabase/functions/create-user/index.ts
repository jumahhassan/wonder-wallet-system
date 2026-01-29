import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: "super_agent" | "sales_assistant" | "sales_agent";
  photoUrl?: string;
  nationalIdUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client for verifying the requesting user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for creating users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify the requesting user is authenticated and is a super_agent
    const { data: { user: requestingUser }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user has permission to create users
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    const requestingUserRole = roleData?.role;
    const canCreateUsers = requestingUserRole === "super_agent" || requestingUserRole === "hr_finance";

    if (roleError || !canCreateUsers) {
      return new Response(
        JSON.stringify({ error: "Only Super Agents and HR/Finance can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body first to validate role restriction
    const { email, password, fullName, phone, role, photoUrl, nationalIdUrl }: CreateUserRequest = await req.json();

    // HR/Finance cannot create super_agent users
    if (requestingUserRole === "hr_finance" && role === "super_agent") {
      return new Response(
        JSON.stringify({ error: "HR/Finance cannot create Super Agent users. Only Super Agents can create other Super Agents." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Email, password, full name, and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating user:", { email, fullName, role, createdBy: requestingUserRole, hasPhoto: !!photoUrl, hasNationalId: !!nationalIdUrl });

    // Create the new user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The trigger should create profile, role, and wallets automatically
    // But we need to update the role if it's not sales_agent (the default)
    if (role !== "sales_agent") {
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);

      if (roleUpdateError) {
        console.error("Error updating role:", roleUpdateError);
      }
    }

    // Update profile with phone, photo_url, and national_id_url if provided
    const profileUpdates: Record<string, string> = {};
    if (phone) profileUpdates.phone = phone;
    if (photoUrl) profileUpdates.photo_url = photoUrl;
    if (nationalIdUrl) profileUpdates.national_id_url = nationalIdUrl;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", newUser.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
    }

    // Send welcome email via Brevo
    try {
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      if (brevoApiKey) {
        const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify({
            sender: {
              name: "Wonders Mobile Money",
              email: "noreply@wondersmobilemoney.com",
            },
            to: [{ email, name: fullName }],
            subject: "Welcome to Wonders Mobile Money",
            htmlContent: `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1e3a5f;">Welcome to Wonders Mobile Money!</h1>
                    <p>Dear ${fullName},</p>
                    <p>Your account has been successfully created. You have been assigned the role of <strong>${role.replace('_', ' ').toUpperCase()}</strong>.</p>
                    <p>You can now log in to your account using the credentials provided by your supervisor.</p>
                    <div style="margin: 30px 0;">
                      <p><strong>What you can do:</strong></p>
                      <ul>
                        <li>Process mobile money transactions</li>
                        <li>View your transaction history</li>
                        <li>Track your commissions</li>
                      </ul>
                    </div>
                    <p>If you have any questions, please contact your supervisor.</p>
                    <p style="margin-top: 30px;">Best regards,<br>The Wonders Mobile Money Team</p>
                  </div>
                </body>
              </html>
            `,
          }),
        });
        
        if (!emailResponse.ok) {
          console.error("Failed to send welcome email:", await emailResponse.text());
        } else {
          console.log("Welcome email sent successfully");
        }
      }
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the user creation if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email,
          role 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in create-user function:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
