import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate plan duration based on plan_type pattern matching
function getPlanDurationDays(planType: string): number {
  const plan = (planType || "").toLowerCase();
  
  if (plan.includes("2") && plan.includes("week")) return 14;
  if (plan.includes("1") && plan.includes("month")) return 30;
  if (plan.includes("6") && plan.includes("month")) return 180;
  if (plan.includes("year") || plan.includes("12") && plan.includes("month")) return 365;
  
  // Default to 14 days (2 weeks) as per user's SQL
  return 14;
}

type ActivateBody = {
  subscription_id: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return json(500, { error: "Server configuration error" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing Authorization header" });

    // Validate the caller identity (must be logged in)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) return json(401, { error: "Unauthorized" });

    // Service-role client for atomic updates (bypasses RLS), but we enforce admin here
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for admin role
    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) return json(500, { error: "Failed to verify admin role" });

    // Check for super developer access
    const isSuperDeveloper = user.email === "support@cosmas.dev";

    if (!adminRole && !isSuperDeveloper) return json(403, { error: "Forbidden" });

    const body = (await req.json().catch(() => null)) as ActivateBody | null;
    const subscriptionId = body?.subscription_id;

    if (!subscriptionId) return json(400, { error: "subscription_id is required" });

    const { data: sub, error: subError } = await adminClient
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) return json(404, { error: "Subscription not found" });

    const now = new Date();
    const expiresAt = new Date(sub.expires_at);

    if (sub.status === "active") return json(409, { error: "Subscription is already active" });
    if (sub.status === "cancelled") return json(400, { error: "Cannot activate a cancelled subscription" });
    if (sub.status === "expired" || expiresAt.getTime() < now.getTime()) {
      return json(400, { error: "Cannot activate an expired subscription" });
    }

    const durationDays = getPlanDurationDays(sub.plan_type);
    const newExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Auto-link if a profile exists for payment_email (but do not require it)
    let linkedUserId: string | null = sub.user_id ?? null;
    if (sub.payment_email) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", String(sub.payment_email).toLowerCase())
        .maybeSingle();

      if (profile?.id) linkedUserId = profile.id;
    }

    const updateData: Record<string, unknown> = {
      status: "active",
      // started_at is NOT NULL in schema, but keep the original if present
      started_at: sub.started_at ?? now.toISOString(),
      expires_at: newExpiresAt.toISOString(),
      registration_status: linkedUserId ? "registered" : "pending",
      user_id: linkedUserId,
    };

    const { data: updated, error: updateError } = await adminClient
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscriptionId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return json(500, { error: "Failed to activate subscription" });
    }

    return json(200, { subscription: updated });
  } catch (e) {
    console.error("admin-activate-subscription error", e);
    return json(500, { error: "Internal server error" });
  }
});
