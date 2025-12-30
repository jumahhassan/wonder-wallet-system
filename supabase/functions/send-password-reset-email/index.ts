import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetEmailRequest {
  email: string;
  fullName: string;
  resetLink: string;
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

    const { email, fullName, resetLink }: PasswordResetEmailRequest = await req.json();

    console.log(`Sending password reset email to ${email}`);

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
        subject: "Reset Your Password - Wonders Mobile Money",
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1e3a5f;">Password Reset Request</h1>
                <p>Dear ${fullName},</p>
                <p>We received a request to reset your password for your Wonders Mobile Money account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #1e3a5f;">${resetLink}</a></p>
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
    console.log("Password reset email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending password reset email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
