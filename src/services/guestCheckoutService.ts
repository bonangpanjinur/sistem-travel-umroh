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
 * This function:
 * 1. Checks if email already exists
 * 2. Creates a new auth user with temporary password
 * 3. Creates a profile record
 * 4. Sends password reset email for security
 */
export async function createGuestAccount(
  email: string,
  fullName: string,
  phone?: string
): Promise<GuestCheckoutResult> {
  try {
    // 1. Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some((u) => u.email === email);

    if (emailExists) {
      return {
        success: false,
        message: "Email sudah terdaftar. Silakan login dengan email ini.",
      };
    }

    // 2. Generate temporary password
    const tempPassword = generateTemporaryPassword();

    // 3. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser(
      {
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          phone: phone || null,
        },
      }
    );

    if (authError || !authData?.user) {
      console.error("Auth creation error:", authError);
      return {
        success: false,
        message: "Gagal membuat akun. Silakan coba lagi.",
      };
    }

    const userId = authData.user.id;

    // 4. Create profile record
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      phone: phone || null,
      avatar_url: null,
      bio: null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail the entire process, profile can be created later
    }

    // 5. Send password reset email for security (user sets their own password)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      console.warn("Password reset email error:", resetError);
      // Don't fail, user can use forgot password later
    }

    return {
      success: true,
      userId,
      email,
      message: `Akun berhasil dibuat! Email verifikasi telah dikirim ke ${email}. Silakan cek email untuk mengatur kata sandi.`,
    };
  } catch (error) {
    console.error("Guest checkout error:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat membuat akun. Silakan coba lagi.",
    };
  }
}

/**
 * Generate a secure temporary password
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
