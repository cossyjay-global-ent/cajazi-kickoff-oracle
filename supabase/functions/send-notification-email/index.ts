import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_follower" | "new_prediction";
  recipient_email: string;
  recipient_name: string;
  actor_name: string;
  prediction_title?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send notification email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationRequest = await req.json();
    console.log("Notification payload:", JSON.stringify(payload));

    const { type, recipient_email, recipient_name, actor_name, prediction_title } = payload;

    let subject: string;
    let htmlContent: string;

    if (type === "new_follower") {
      subject = `${actor_name} started following you!`;
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 16px;">New Follower! 🎉</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${recipient_name || "there"},
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            <strong>${actor_name}</strong> has started following you on the predictions platform!
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Keep making great predictions to keep your followers engaged.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #888; font-size: 12px;">
            You received this email because someone followed you. You can manage your notification preferences in your profile settings.
          </p>
        </div>
      `;
    } else if (type === "new_prediction") {
      subject = `${actor_name} made a new prediction!`;
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 16px;">New Prediction! ⚽</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${recipient_name || "there"},
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            <strong>${actor_name}</strong> just made a new prediction:
          </p>
          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #333; font-size: 18px; font-weight: bold; margin: 0;">
              ${prediction_title || "New Prediction"}
            </p>
          </div>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Check it out and see if you agree!
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #888; font-size: 12px;">
            You received this email because you're following ${actor_name}. You can unfollow to stop receiving these notifications.
          </p>
        </div>
      `;
    } else {
      throw new Error("Invalid notification type");
    }

    console.log("Sending email to:", recipient_email);
    
    const emailResponse = await resend.emails.send({
      from: "Predictions <onboarding@resend.dev>",
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
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
