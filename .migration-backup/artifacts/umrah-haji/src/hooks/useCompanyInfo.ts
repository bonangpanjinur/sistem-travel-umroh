import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyInfo } from "@/lib/document-generator";

export interface DocumentSettings {
  letterhead_show_logo: boolean;
  letterhead_show_website: boolean;
  invoice_number_prefix: string;
  invoice_number_format: string;
  invoice_show_bank_info: boolean;
  invoice_show_notes_section: boolean;
  eticket_header_color: string;
  certificate_border_color: string;
  certificate_text_color: string;
  document_footer_show_timestamp: boolean;
  document_footer_show_page_number: boolean;
}

/**
 * Fetch dynamic company info from `company_settings` & primary `bank_accounts`.
 * Also fetches logo from `website_settings` as fallback.
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
        .select("setting_key, setting_value");
      if (error) throw error;
      const map = new Map<string, any>();
      (data || []).forEach((row: any) => map.set(row.setting_key, row.setting_value));
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const websiteSettingsQuery = useQuery({
    queryKey: ["company-info-website-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_settings")
        .select("logo_url, company_name")
        .maybeSingle();
      if (error) throw error;
      return data;
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
  const websiteSettings = websiteSettingsQuery.data;
  
  const unwrap = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object" && "value" in v) return String(v.value || "");
    return String(v);
  };

  const unwrapBoolean = (v: any, defaultVal: boolean = false): boolean => {
    if (v == null) return defaultVal;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true";
    return defaultVal;
  };

  // Try to get logo from company_settings first, then fallback to website_settings
  const logoUrl = unwrap(m?.get("company_logo_url")) || websiteSettings?.logo_url || undefined;

  const company: CompanyInfo = {
    name: unwrap(m?.get("company_name")) || "PT. Umrah Haji Travel",
    address: unwrap(m?.get("company_address")) || "Jl. Raya Utama No. 123, Jakarta",
    phone: unwrap(m?.get("company_phone")) || "(021) 1234-5678",
    email: unwrap(m?.get("company_email")) || "info@umrahhaji.com",
    website: unwrap(m?.get("company_website")) || undefined,
    logo: logoUrl,
  };

  const city = unwrap(m?.get("company_city")) || "Jakarta";

  const documentSettings: DocumentSettings = {
    letterhead_show_logo: unwrapBoolean(m?.get("letterhead_show_logo"), true),
    letterhead_show_website: unwrapBoolean(m?.get("letterhead_show_website"), true),
    invoice_number_prefix: unwrap(m?.get("invoice_number_prefix")) || "INV",
    invoice_number_format: unwrap(m?.get("invoice_number_format")) || "YYYY-MM-{SEQ}",
    invoice_show_bank_info: unwrapBoolean(m?.get("invoice_show_bank_info"), true),
    invoice_show_notes_section: unwrapBoolean(m?.get("invoice_show_notes_section"), true),
    eticket_header_color: unwrap(m?.get("eticket_header_color")) || "#16a34a",
    certificate_border_color: unwrap(m?.get("certificate_border_color")) || "#daa520",
    certificate_text_color: unwrap(m?.get("certificate_text_color")) || "#165634",
    document_footer_show_timestamp: unwrapBoolean(m?.get("document_footer_show_timestamp"), true),
    document_footer_show_page_number: unwrapBoolean(m?.get("document_footer_show_page_number"), true),
  };

  return {
    company,
    city,
    documentSettings,
    bankAccount: bankQuery.data,
    isLoading: settingsQuery.isLoading || bankQuery.isLoading || websiteSettingsQuery.isLoading,
  };
}
