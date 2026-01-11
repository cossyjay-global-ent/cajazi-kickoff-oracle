import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExpireBody = {
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

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) return json(401, { error: "Unauthorized" });

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) return json(500, { error: "Failed to verify admin role" });
    if (!adminRole) return json(403, { error: "Forbidden" });

    const body = (await req.json().catch(() => null)) as ExpireBody | null;
    const subscriptionId = body?.subscription_id;
    if (!subscriptionId) return json(400, { error: "subscription_id is required" });

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await adminClient
      .from("subscriptions")
      .update({ status: "expired", expires_at: nowIso })
      .eq("id", subscriptionId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return json(500, { error: "Failed to expire subscription" });
    }

    return json(200, { subscription: updated });
  } catch (e) {
    console.error("admin-expire-subscription error", e);
    return json(500, { error: "Internal server error" });
  }
});
