import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExtendBody = {
  subscription_id: string;
  months?: number; // default 1
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

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) return json(401, { error: "Unauthorized" });

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

    const body = (await req.json().catch(() => null)) as ExtendBody | null;
    const subscriptionId = body?.subscription_id;
    const months = Math.max(1, Math.min(12, Number(body?.months ?? 1)));

    if (!subscriptionId) return json(400, { error: "subscription_id is required" });

    const { data: sub, error: subError } = await adminClient
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) return json(404, { error: "Subscription not found" });
    if (sub.status === "cancelled") return json(400, { error: "Cannot extend a cancelled subscription" });

    const base = new Date(sub.expires_at);
    const now = new Date();
    const effectiveBase = base.getTime() > now.getTime() ? base : now;
    const newExpiry = new Date(effectiveBase);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    const { data: updated, error: updateError } = await adminClient
      .from("subscriptions")
      .update({ expires_at: newExpiry.toISOString(), status: "active" })
      .eq("id", subscriptionId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return json(500, { error: "Failed to extend subscription" });
    }

    return json(200, { subscription: updated });
  } catch (e) {
    console.error("admin-extend-subscription error", e);
    return json(500, { error: "Internal server error" });
  }
});
