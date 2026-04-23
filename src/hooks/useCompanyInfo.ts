import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyInfo } from "@/lib/document-generator";

/**
 * Fetch dynamic company info from `company_settings` & primary `bank_accounts`.
 * Used as letterhead / invoice header / footer in all generated PDFs (surat,
 * invoice, e-ticket, sertifikat, dll). Falls back to a sane default if the
 * settings have not been filled in.
 */
export function useCompanyInfo() {
  const settingsQuery = useQuery({
    queryKey: ["company-info-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "company_name",
          "company_address",
          "company_phone",
          "company_email",
          "company_website",
          "company_logo",
          "company_city",
        ]);
      if (error) throw error;
      const map = new Map<string, any>();
      (data || []).forEach((row: any) => map.set(row.setting_key, row.setting_value));
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const bankQuery = useQuery({
    queryKey: ["company-info-primary-bank"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const m = settingsQuery.data;
  const unwrap = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object" && "value" in v) return String(v.value || "");
    return String(v);
  };

  const company: CompanyInfo = {
    name: unwrap(m?.get("company_name")) || "PT. Umrah Haji Travel",
    address: unwrap(m?.get("company_address")) || "Jl. Raya Utama No. 123, Jakarta",
    phone: unwrap(m?.get("company_phone")) || "(021) 1234-5678",
    email: unwrap(m?.get("company_email")) || "info@umrahhaji.com",
    website: unwrap(m?.get("company_website")) || undefined,
    logo: unwrap(m?.get("company_logo")) || undefined,
  };

  const city = unwrap(m?.get("company_city")) || "Jakarta";

  return {
    company,
    city,
    bankAccount: bankQuery.data,
    isLoading: settingsQuery.isLoading || bankQuery.isLoading,
  };
}
