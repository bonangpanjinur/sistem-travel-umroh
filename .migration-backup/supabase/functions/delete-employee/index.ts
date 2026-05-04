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
        JSON.stringify({ error: "Hanya admin yang dapat menghapus karyawan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: "ID karyawan wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get employee data before deletion
    const { data: employee, error: fetchError } = await adminClient
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (fetchError || !employee) {
      return new Response(
        JSON.stringify({ error: "Karyawan tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = employee.user_id;
    const fullName = employee.full_name;
    const employeeCode = employee.employee_code;

    // 2. Delete employee record (this will cascade to work_schedules, etc.)
    const { error: deleteEmployeeError } = await adminClient
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (deleteEmployeeError) {
      return new Response(
        JSON.stringify({ error: "Gagal menghapus data karyawan: " + deleteEmployeeError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. If employee has a user_id, delete the auth user (cascades to profiles, user_roles)
    if (userId) {
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch (authDeleteError: any) {
        console.error("Warning: Failed to delete auth user:", authDeleteError);
        // Don't fail the whole operation if auth deletion fails
        // The employee record is already deleted
      }
    }

    // 4. Log the audit action
    try {
      await adminClient.from("audit_logs").insert({
        user_id: callerUser.id,
        table_name: "employees",
        record_id: employeeId,
        action: "DELETE_EMPLOYEE",
        action_type: "DELETE",
        old_data: {
          id: employeeId,
          full_name: fullName,
          employee_code: employeeCode,
          user_id: userId,
        },
        severity: "warning",
        branch_id: employee.branch_id || null,
        metadata: {
          source: "edge-function:delete-employee",
          deleted_by: callerUser.id,
          auth_user_deleted: userId ? true : false,
        },
      });
    } catch (auditError: any) {
      console.error("Warning: Failed to log audit action:", auditError);
      // Don't fail if audit logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Karyawan ${fullName} (${employeeCode}) dan akun terkait berhasil dihapus`,
        employeeId,
        userId,
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
