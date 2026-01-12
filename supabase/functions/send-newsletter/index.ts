import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendNewsletterRequest {
  subject: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token by getting user with admin client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has admin role
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { subject, content }: SendNewsletterRequest = await req.json();

    if (!subject || !content) {
      return new Response(
        JSON.stringify({ error: "Subject and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate subject length
    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject must be 200 characters or less" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch verified, active subscribers
    const { data: subscribers, error: subError } = await supabaseAdmin
      .from("newsletter_subscriptions")
      .select("email")
      .eq("verified", true)
      .is("unsubscribed_at", null);

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active subscribers found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending newsletter to ${subscribers.length} subscribers`);

    // Build unsubscribe URL base
    const appUrl = "https://kickoffprediction.com";

    // Send emails in batches to avoid rate limits
    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 1000;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      
      const emailPromises = batch.map(async (subscriber) => {
        const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .footer a { color: #10b981; text-decoration: none; }
    .unsubscribe { margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚽ KickoffPrediction</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>You are receiving this email because you subscribed on kickoffprediction.com</p>
    <p class="unsubscribe">
      <a href="${unsubscribeUrl}">Unsubscribe</a> from future emails
    </p>
    <p>© ${new Date().getFullYear()} KickoffPrediction. All rights reserved.</p>
  </div>
</body>
</html>`;

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "KickoffPrediction <newsletter@kickoffprediction.com>",
              to: [subscriber.email],
              subject: subject,
              html: htmlContent,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to send to ${subscriber.email}:`, errorData);
            return false;
          }
          return true;
        } catch (error) {
          console.error(`Error sending to ${subscriber.email}:`, error);
          return false;
        }
      });

      const results = await Promise.all(emailPromises);
      successCount += results.filter(Boolean).length;
      failCount += results.filter(r => !r).length;

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Log the newsletter to database
    const { error: logError } = await supabaseAdmin
      .from("newsletters")
      .insert({
        subject,
        content,
        sent_by_admin_id: user.id,
        recipient_count: successCount,
      });

    if (logError) {
      console.error("Error logging newsletter:", logError);
      // Don't fail the request, emails were already sent
    }

    console.log(`Newsletter sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Newsletter sent to ${successCount} subscribers`,
        successCount,
        failCount,
        totalSubscribers: subscribers.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-newsletter function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
