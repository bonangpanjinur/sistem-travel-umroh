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
      role = "operational", // Default role for employee
      existingUserId = null, // Optional existing user ID
    } = body;

    if (!fullName || (!existingUserId && (!email || !password))) {
      return new Response(
        JSON.stringify({ error: "Nama, email, dan password wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUserId = existingUserId;
    let isNewUser = !existingUserId;

    if (isNewUser) {
      // 1. Create user in Supabase Auth
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
      targetUserId = newUser.user.id;
    } else {
      // Check if user already has an employee record
      const { data: existingEmployee } = await adminClient
        .from("employees")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();
      
      if (existingEmployee) {
        return new Response(
          JSON.stringify({ error: "User ini sudah terdaftar sebagai karyawan" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    try {
      // 2. Update/Assign role
      if (isNewUser) {
        // The trigger inserts 'customer', we want to change it to the actual employee role
        const { error: roleError } = await adminClient
          .from("user_roles")
          .update({ role, branch_id: branchId || null })
          .eq("user_id", targetUserId)
          .eq("role", "customer");
        
        if (roleError) throw new Error("Gagal memperbarui role: " + roleError.message);
      } else {
        // For existing user, check if they already have the role or add it
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("role", role)
          .maybeSingle();
        
        if (!existingRole) {
          const { error: roleError } = await adminClient
            .from("user_roles")
            .insert({ user_id: targetUserId, role, branch_id: branchId || null });
          
          if (roleError) throw new Error("Gagal menambahkan role: " + roleError.message);
        }
      }

      // 3. Update profile with phone
      const { error: profileError } = await adminClient.from("profiles").update({
        phone: phone || null,
        full_name: fullName, // Ensure profile name matches employee name
      }).eq("user_id", targetUserId);

      if (profileError) throw new Error("Gagal memperbarui profil: " + profileError.message);

      // 4. Generate employee code (RPC call)
      const { data: codeData, error: codeError } = await adminClient.rpc("generate_employee_code");
      if (codeError) console.error("Error generating code:", codeError);
      const employeeCode = codeData || `EMP${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

      // 5. Create employee record
      const { data: employeeRecord, error: employeeError } = await adminClient.from("employees").insert({
        user_id: targetUserId,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        position: position || null,
        department: department || null,
        gender: gender || null,
        salary: salary ? parseFloat(salary) : null,
        hire_date: hireDate || null,
        employee_code: employeeCode,
        is_active: true,
        branch_id: branchId || null,
      }).select().single();

      if (employeeError) throw new Error("Gagal membuat data karyawan: " + employeeError.message);

      // 6. Log Audit Action
      await adminClient.from("audit_logs").insert({
        user_id: callerUser.id,
        table_name: "employees",
        record_id: employeeRecord.id,
        action: "CREATE_EMPLOYEE",
        action_type: "CREATE",
        new_data: { fullName, email, role, employeeCode, isExistingUser: !isNewUser },
        severity: "info",
        branch_id: branchId || null,
        metadata: { source: "edge-function:create-employee" }
      });

      return new Response(
        JSON.stringify({
          success: true,
          employeeCode,
          userId: targetUserId,
          message: `Karyawan ${fullName} (${employeeCode}) berhasil didaftarkan`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (innerError: any) {
      // Cleanup on failure ONLY if it was a new user
      if (isNewUser) {
        console.error("Error in create-employee steps, rolling back user creation:", innerError);
        await adminClient.auth.admin.deleteUser(targetUserId);
      }
      
      return new Response(
        JSON.stringify({ error: innerError.message || "Gagal memproses data karyawan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
