import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keep in sync with client plan types
const PLAN_DURATIONS_DAYS: Record<string, number> = {
  "2_weeks": 14,
  "1_month": 30,
  "6_months": 180,
  "yearly": 365,
  "1_year": 365,
};

type CreateBody = {
  email: string;
  plan_type: string;
  // Optional override when admin picks a custom expiry in UI
  expires_at?: string;
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

    const body = (await req.json().catch(() => null)) as CreateBody | null;
    const email = body?.email?.trim().toLowerCase();
    const planType = body?.plan_type;

    if (!email) return json(400, { error: "email is required" });
    if (!planType) return json(400, { error: "plan_type is required" });

    const now = new Date();

    let expiresAt: Date;
    if (body?.expires_at) {
      const d = new Date(body.expires_at);
      if (Number.isNaN(d.getTime())) return json(400, { error: "expires_at is invalid" });
      expiresAt = d;
    } else {
      const durationDays = PLAN_DURATIONS_DAYS[planType] ?? 30;
      expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    if (expiresAt.getTime() <= now.getTime()) {
      return json(400, { error: "expires_at must be in the future" });
    }

    const { data: existingProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileError) return json(500, { error: "Failed to check user profile" });

    const insertData: Record<string, unknown> = {
      payment_email: email,
      plan_type: planType,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      registration_status: existingProfile ? "registered" : "pending",
      user_id: existingProfile?.id ?? null,
    };

    const { data: created, error: insertError } = await adminClient
      .from("subscriptions")
      .insert(insertData)
      .select("*")
      .single();

    if (insertError || !created) {
      return json(500, { error: "Failed to create subscription" });
    }

    return json(200, { subscription: created });
  } catch (e) {
    console.error("admin-create-subscription error", e);
    return json(500, { error: "Internal server error" });
  }
});
