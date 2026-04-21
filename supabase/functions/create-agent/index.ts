import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "owner", "branch_manager"])
      .limit(1);

    if (!roleData?.length) {
      return new Response(
        JSON.stringify({ error: "Hanya admin yang dapat menambah agent" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      companyName,
      commissionRate,
      bankName,
      bankAccountNumber,
      bankAccountName,
      npwp,
      branchId,
      parentAgentId,
    } = body;

    if (!fullName || !email) {
      return new Response(
        JSON.stringify({ error: "Nama dan email wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with admin API (doesn't affect caller session)
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: "Gagal membuat akun: " + createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;

    // Add agent role
    await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: parentAgentId ? "sub_agent" : "agent" });

    // Generate agent code
    const prefix = parentAgentId ? "SUB" : "AGT";
    const now = new Date();
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const agentCode = `${prefix}${String(now.getFullYear()).slice(2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${rand}`;

    // Create agent record
    const { error: agentError } = await adminClient.from("agents").insert({
      user_id: newUserId,
      agent_code: agentCode,
      company_name: companyName || null,
      commission_rate: parseFloat(commissionRate) || 5,
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_name: bankAccountName || null,
      npwp: npwp || null,
      branch_id: branchId || null,
      parent_agent_id: parentAgentId || null,
      is_active: true,
    });

    if (agentError) {
      // Cleanup: delete the user if agent creation fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Gagal membuat agent: " + agentError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    await adminClient.from("profiles").upsert({
      id: newUserId,
      user_id: newUserId,
      full_name: fullName,
      phone: phone || null,
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({
        success: true,
        agentCode,
        email,
        message: `Agent ${agentCode} berhasil dibuat`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
