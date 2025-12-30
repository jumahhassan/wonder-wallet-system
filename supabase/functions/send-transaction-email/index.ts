import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionEmailRequest {
  email: string;
  fullName: string;
  transactionType: string;
  amount: number;
  currency: string;
  recipientName?: string;
  recipientPhone?: string;
  status: string;
  transactionId: string;
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

    const {
      email,
      fullName,
      transactionType,
      amount,
      currency,
      recipientName,
      recipientPhone,
      status,
      transactionId,
    }: TransactionEmailRequest = await req.json();

    console.log(`Sending transaction email to ${email} for transaction ${transactionId}`);

    const formattedType = transactionType.replace(/_/g, ' ').toUpperCase();
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);

    const statusColor = status === 'approved' || status === 'completed' ? '#22c55e' : 
                        status === 'rejected' || status === 'failed' ? '#ef4444' : '#f59e0b';

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
        subject: `Transaction ${status.toUpperCase()}: ${formattedType} - ${formattedAmount}`,
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1e3a5f;">Transaction Notification</h1>
                <p>Dear ${fullName},</p>
                <p>Your transaction has been processed. Here are the details:</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td>
                      <td style="padding: 8px 0;">${transactionId.slice(0, 8).toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">Type:</td>
                      <td style="padding: 8px 0;">${formattedType}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                      <td style="padding: 8px 0;">${formattedAmount}</td>
                    </tr>
                    ${recipientName ? `
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">Recipient:</td>
                      <td style="padding: 8px 0;">${recipientName}</td>
                    </tr>
                    ` : ''}
                    ${recipientPhone ? `
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                      <td style="padding: 8px 0;">${recipientPhone}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                      <td style="padding: 8px 0;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                          ${status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
                <p>If you have any questions about this transaction, please contact your supervisor.</p>
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
    console.log("Transaction email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending transaction email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
