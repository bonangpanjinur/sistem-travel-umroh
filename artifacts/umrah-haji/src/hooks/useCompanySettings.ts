import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

export type CompanySetting = Database['public']['Tables']['company_settings']['Row'];
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .order("setting_key");
      if (error) throw error;
      return data;
    },
  });

  const getSetting = useCallback((key: string): any => {
    const setting = settings.find((s) => s.setting_key === key);
    return setting?.setting_value ?? null;
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // First try to update, if no rows affected, insert
      const { error: updateError, count } = await supabase
        .from("company_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("setting_key", key);
      
      if (updateError) throw updateError;
      
      // If no rows were updated, insert a new one
      if (count === 0) {
        const { error: insertError } = await supabase
          .from("company_settings")
          .insert({
            setting_key: key,
            setting_value: value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Pengaturan berhasil disimpan");
    },
    onError: (error: any) => {
      console.error("Update setting error:", error);
      toast.error(`Gagal menyimpan pengaturan: ${error.message || "Terjadi kesalahan sistem"}`);
    },
  });

  const updateMultipleSettings = useMutation({
    mutationFn: async (updates: { key: string; value: any }[]) => {
      // Use a single request if possible, but the current schema uses key-value rows
      // We'll stick to individual updates for now as per original logic but with better error handling
      for (const { key, value } of updates) {
        // First try to update, if no rows affected, insert
        const { error: updateError, count } = await supabase
          .from("company_settings")
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq("setting_key", key);
        
        if (updateError) throw updateError;
        
        // If no rows were updated, insert a new one
        if (count === 0) {
          const { error: insertError } = await supabase
            .from("company_settings")
            .insert({
              setting_key: key,
              setting_value: value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Semua pengaturan berhasil diperbarui");
    },
    onError: (error: any) => {
      console.error("Update multiple settings error:", error);
      toast.error(`Gagal memperbarui pengaturan: ${error.message || "Terjadi kesalahan sistem"}`);
    },
  });

  return {
    settings,
    isLoading,
    getSetting,
    updateSetting: updateSettingMutation.mutate,
    updateMultipleSettings: updateMultipleSettings.mutate,
    resetDatabase: async (confirmText: string) => {
      if (confirmText !== "RESET DATABASE SEKARANG") {
        toast.error("Teks konfirmasi tidak sesuai");
        return;
      }

      const { data, error } = await supabase.rpc('reset_database' as any, { confirm_text: confirmText });
      if (error) {
        console.error("Reset database error:", error);
        toast.error(`Gagal reset database: ${error.message}`);
        throw error;
      }
      queryClient.invalidateQueries();
      toast.success("Database berhasil direset. Semua data transaksi telah dihapus.");
      return data;
    },
    isUpdating: updateSettingMutation.isPending || updateMultipleSettings.isPending,
  };
}

export function useBankAccounts() {
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (account: Database['public']['Tables']['bank_accounts']['Insert']) => {
      const { error } = await supabase.from("bank_accounts").insert(account);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Rekening bank berhasil ditambahkan");
    },
    onError: (error: any) => {
      console.error("Create bank account error:", error);
      toast.error(`Gagal menambahkan rekening: ${error.message}`);
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, ...data }: Database['public']['Tables']['bank_accounts']['Update'] & { id: string }) => {
      const { error } = await supabase
        .from("bank_accounts")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Data rekening berhasil diperbarui");
    },
    onError: (error: any) => {
      console.error("Update bank account error:", error);
      toast.error(`Gagal memperbarui rekening: ${error.message}`);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Rekening berhasil dihapus");
    },
    onError: (error: any) => {
      console.error("Delete bank account error:", error);
      toast.error(`Gagal menghapus rekening: ${error.message}`);
    },
  });

  return {
    accounts,
    isLoading,
    primaryAccount: accounts.find((a) => a.is_primary),
    createAccount: createAccountMutation.mutate,
    updateAccount: updateAccountMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
  };
}
