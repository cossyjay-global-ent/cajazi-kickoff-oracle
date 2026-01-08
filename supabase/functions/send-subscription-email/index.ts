import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionEmailRequest {
  type: "subscription_activated" | "subscription_expiring" | "subscription_expired";
  recipient_email: string;
  recipient_name?: string;
  plan_type: string;
  expires_at: string;
  days_remaining?: number;
}

const PLAN_LABELS: Record<string, string> = {
  '2_weeks': '2 Weeks',
  '1_month': 'Monthly',
  '6_months': '6 Months',
  '1_year': '1 Year',
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send subscription email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SubscriptionEmailRequest = await req.json();
    console.log("Subscription email payload:", JSON.stringify(payload));

    const { type, recipient_email, recipient_name, plan_type, expires_at, days_remaining } = payload;
    const planLabel = PLAN_LABELS[plan_type] || plan_type;
    const expiryDate = new Date(expires_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let subject: string;
    let htmlContent: string;

    const baseStyle = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    `;

    if (type === "subscription_activated") {
      subject = `🎉 Your VIP Subscription is Now Active!`;
      htmlContent = `
        <div style="${baseStyle}">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 16px; border-radius: 12px;">
              <h1 style="margin: 0; font-size: 24px;">VIP Subscription Activated! 🎉</h1>
            </div>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${recipient_name || "there"},
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Your <strong>${planLabel}</strong> VIP subscription is now active! You now have full access to our premium predictions.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 0 0 8px 0; color: #333;"><strong>Plan:</strong> ${planLabel}</p>
            <p style="margin: 0; color: #333;"><strong>Valid Until:</strong> ${expiryDate}</p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Head over to the VIP Predictions section to start exploring our exclusive picks!
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://cajazi-kickoff-oracle.lovable.app/vip" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              View VIP Predictions
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            Thank you for subscribing to Cajazi VIP!
          </p>
        </div>
      `;
    } else if (type === "subscription_expiring") {
      subject = `⚠️ Your VIP Subscription Expires in ${days_remaining} Day${days_remaining !== 1 ? 's' : ''}`;
      htmlContent = `
        <div style="${baseStyle}">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 16px; border-radius: 12px;">
              <h1 style="margin: 0; font-size: 24px;">Subscription Expiring Soon ⚠️</h1>
            </div>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${recipient_name || "there"},
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Your <strong>${planLabel}</strong> VIP subscription will expire in <strong>${days_remaining} day${days_remaining !== 1 ? 's' : ''}</strong>.
          </p>
          
          <div style="background: #fff7ed; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; color: #333;"><strong>Current Plan:</strong> ${planLabel}</p>
            <p style="margin: 0; color: #333;"><strong>Expires:</strong> ${expiryDate}</p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Renew now to continue enjoying uninterrupted access to our premium predictions!
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://cajazi-kickoff-oracle.lovable.app/vip" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Renew Subscription
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            Don't miss out on our winning predictions!
          </p>
        </div>
      `;
    } else if (type === "subscription_expired") {
      subject = `❌ Your VIP Subscription Has Expired`;
      htmlContent = `
        <div style="${baseStyle}">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px; border-radius: 12px;">
              <h1 style="margin: 0; font-size: 24px;">Subscription Expired ❌</h1>
            </div>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${recipient_name || "there"},
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Your <strong>${planLabel}</strong> VIP subscription has expired on <strong>${expiryDate}</strong>.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You no longer have access to VIP predictions. Resubscribe now to regain access!
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://cajazi-kickoff-oracle.lovable.app/vip" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Resubscribe Now
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            We hope to see you back soon!
          </p>
        </div>
      `;
    } else {
      throw new Error("Invalid subscription email type");
    }

    console.log("Sending subscription email to:", recipient_email);
    
    const emailResponse = await resend.emails.send({
      from: "Cajazi VIP <onboarding@resend.dev>",
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Subscription email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending subscription email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
