import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  role: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const { email, fullName, role }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email}`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
                <p>You can now log in to your account and start using our services.</p>
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Brevo API error:", errorData);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    const result = await response.json();
    console.log("Welcome email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending welcome email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
