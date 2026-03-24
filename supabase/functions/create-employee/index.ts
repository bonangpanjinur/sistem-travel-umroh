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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .in("role", ["super_admin", "owner", "branch_manager"])
      .limit(1);

    if (!roleData?.length) {
      return new Response(
        JSON.stringify({ error: "Hanya admin yang dapat menambah karyawan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      fullName,
      email,
      password,
      phone,
      position,
      department,
      gender,
      salary,
      hireDate,
      branchId,
      role = "operational" // Default role for employee
    } = body;

    if (!fullName || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Nama, email, dan password wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create user in Supabase Auth
    // Note: handle_new_user() trigger will run AFTER this and insert:
    // - profile (with full_name)
    // - user_role (with 'customer' role)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
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

    // 2. Update role (Change 'customer' to the requested role)
    // The trigger inserts 'customer', we want to change it to the actual employee role
    await adminClient
      .from("user_roles")
      .update({ role, branch_id: branchId || null })
      .eq("user_id", newUserId)
      .eq("role", "customer");

    // 3. Update profile with phone
    // The trigger already created the profile with full_name
    await adminClient.from("profiles").update({
      phone: phone || null,
    }).eq("user_id", newUserId);

    // 4. Generate employee code (RPC call)
    const { data: codeData } = await adminClient.rpc("generate_employee_code");
    const employeeCode = codeData || `EMP${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

    // 5. Create employee record
    const { error: employeeError } = await adminClient.from("employees").insert({
      user_id: newUserId,
      full_name: fullName,
      email,
      phone: phone || null,
      position: position || null,
      department: department || null,
      gender: gender || null,
      salary: salary ? parseFloat(salary) : null,
      hire_date: hireDate || null,
      employee_code: employeeCode,
      is_active: true,
      branch_id: branchId || null,
    });

    if (employeeError) {
      // Cleanup on failure
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Gagal membuat data karyawan: " + employeeError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        employeeCode,
        userId: newUserId,
        message: `Karyawan ${fullName} (${employeeCode}) berhasil didaftarkan`,
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
