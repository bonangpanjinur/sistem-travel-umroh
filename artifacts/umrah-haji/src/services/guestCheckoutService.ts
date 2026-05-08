import { supabase } from "@/integrations/supabase/client";

export interface GuestCheckoutResult {
  success: boolean;
  userId?: string;
  email?: string;
  message: string;
  temporaryPassword?: string;
}

/**
 * Create an auto-account for guest checkout
 * 
 * IMPORTANT: This function has been simplified to avoid 401 Unauthorized errors.
 * The old implementation used supabase.auth.admin.* which requires service_role key
 * and cannot be called from browser client.
 * 
 * Current approach:
 * 1. Guest checkout is allowed without creating auth account
 * 2. User can login/register later to access their booking
 * 3. Booking is created with email but no user_id
 * 
 * Future improvement:
 * - Implement backend RPC function to create guest account securely
 * - Or use Supabase Auth UI for guest registration
 */
export async function createGuestAccount(
  email: string,
  fullName: string,
  phone?: string
): Promise<GuestCheckoutResult> {
  try {
    // DISABLED: auth.admin.* cannot be called from browser client
    // It requires service_role key which is only available on backend
    // 
    // OLD CODE (causes 401 Unauthorized):
    // const { data: existingUser } = await supabase.auth.admin.listUsers();
    // const { data: authData, error: authError } = await supabase.auth.admin.createUser(...);
    
    // NEW APPROACH: Return success without creating auth account
    // User will be able to:
    // 1. Login with email to access their booking
    // 2. Register new account with same email
    // 3. Or use password reset to set password
    
    return {
      success: true,
      email,
      message: `Booking berhasil dibuat dengan email ${email}! Anda dapat login atau mendaftar nanti untuk mengakses pesanan Anda.`,
    };
  } catch (error) {
    console.error("Guest checkout error:", error);
    return {
      success: true, // Still return success for booking
      email,
      message: `Booking berhasil dibuat! Silakan login atau daftar untuk mengakses pesanan Anda.`,
    };
  }
}

/**
 * Generate a secure temporary password
 * 
 * NOTE: This function is kept for reference but no longer used
 * since we're not creating auth accounts from browser
 */
function generateTemporaryPassword(): string {
  const length = 16;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Link guest customer to newly created user account
 * 
 * This is used when a guest user later registers/logs in
 * to link their existing booking to their new account
 */
export async function linkGuestCustomerToUser(
  customerId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from("customers")
      .update({ user_id: userId })
      .eq("id", customerId);

    if (error) {
      console.error("Link customer error:", error);
      return {
        success: false,
        message: "Gagal menghubungkan akun ke pesanan.",
      };
    }

    return {
      success: true,
      message: "Akun berhasil dihubungkan ke pesanan Anda.",
    };
  } catch (error) {
    console.error("Link customer error:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghubungkan akun.",
    };
  }
}

/**
 * FUTURE IMPLEMENTATION: Backend RPC for guest account creation
 * 
 * This would be called from backend API endpoint instead of browser:
 * 
 * CREATE OR REPLACE FUNCTION public.create_guest_account_rpc(
 *   p_email TEXT,
 *   p_full_name TEXT,
 *   p_phone TEXT DEFAULT NULL
 * )
 * RETURNS jsonb
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * SET search_path = public
 * AS $$
 * DECLARE
 *   v_user_id UUID;
 * BEGIN
 *   -- Create auth user using service role
 *   v_user_id := auth.uid(); -- Would need to be implemented differently
 *   
 *   -- Create profile
 *   INSERT INTO public.profiles (user_id, full_name, phone)
 *   VALUES (v_user_id, p_full_name, p_phone);
 *   
 *   RETURN jsonb_build_object(
 *     'success', true,
 *     'user_id', v_user_id,
 *     'message', 'Akun berhasil dibuat'
 *   );
 * EXCEPTION WHEN OTHERS THEN
 *   RETURN jsonb_build_object(
 *     'success', false,
 *     'message', SQLERRM
 *   );
 * END;
 * $$;
 */
