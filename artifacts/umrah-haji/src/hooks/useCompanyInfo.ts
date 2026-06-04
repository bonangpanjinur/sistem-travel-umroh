import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyInfo, DocumentLayout } from "@/lib/document-generator";

export interface DocumentSettings {
  letterhead_show_logo: boolean;
  letterhead_show_website: boolean;
  invoice_number_prefix: string;
  invoice_number_format: string;
  invoice_show_bank_info: boolean;
  invoice_show_notes_section: boolean;
  invoice_show_package_info: boolean;
  invoice_watermark_paid: boolean;
  eticket_header_color: string;
  certificate_border_color: string;
  certificate_text_color: string;
  document_footer_show_timestamp: boolean;
  document_footer_show_page_number: boolean;
  invoice_accent_color?: string;
  pdf_default_font?: 'helvetica' | 'times' | 'courier';
  // Passport letter per-document overrides
  passport_letter_page_orientation?: 'portrait' | 'landscape';
  passport_letter_font_family?: 'helvetica' | 'times' | 'courier';
  passport_letter_accent_color?: string;
  passport_letter_show_photo?: boolean;
  passport_letter_show_qr_code?: boolean;
  // Leave permit per-document overrides
  leave_permit_page_orientation?: 'portrait' | 'landscape';
  leave_permit_font_family?: 'helvetica' | 'times' | 'courier';
  leave_permit_accent_color?: string;
  leave_permit_include_company_logo?: boolean;
  // Certificate per-document overrides
  certificate_page_orientation?: 'portrait' | 'landscape';
  certificate_font_family?: 'helvetica' | 'times' | 'courier';
  certificate_background_image_url?: string;
  // General letter per-document overrides
  general_letter_page_orientation?: 'portrait' | 'landscape';
  general_letter_font_family?: 'helvetica' | 'times' | 'courier';
  general_letter_accent_color?: string;
  general_letter_show_letterhead?: boolean;
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

  const unwrapOptionalString = (v: any): string | undefined => {
    const s = unwrap(v);
    return s || undefined;
  };

  const unwrapOptionalFont = (v: any): 'helvetica' | 'times' | 'courier' | undefined => {
    const s = unwrap(v);
    if (s === 'helvetica' || s === 'times' || s === 'courier') return s;
    return undefined;
  };

  const unwrapOptionalOrientation = (v: any): 'portrait' | 'landscape' | undefined => {
    const s = unwrap(v);
    if (s === 'portrait' || s === 'landscape') return s;
    return undefined;
  };

  // Try to get logo from company_settings first, then fallback to website_settings
  const companyLogoUrl = unwrap(m?.get("company_logo_url"));
  const websiteLogoUrl = companyLogoUrl || websiteSettings?.logo_url || undefined;

  // Dynamic logo source: 'website' (default) or 'custom' (uploaded specifically for documents)
  const docLogoSource = unwrap(m?.get("doc_logo_source")) || "website";
  const docCustomLogoUrl = unwrap(m?.get("doc_custom_logo_url")) || undefined;
  
  // The effective logo to use in documents
  const logoUrl = (docLogoSource === "custom" && docCustomLogoUrl) ? docCustomLogoUrl : websiteLogoUrl;

  // Priority: pdf_global_* (new consolidated keys) > legacy keys > defaults
  const documentSettings: DocumentSettings = {
    // Letterhead settings
    letterhead_show_logo: unwrapBoolean(
      m?.get("pdf_global_show_logo") ?? m?.get("letterhead_show_logo"),
      true
    ),
    letterhead_show_website: unwrapBoolean(
      m?.get("pdf_global_show_website") ?? m?.get("letterhead_show_website"),
      true
    ),

    // Invoice numbering
    invoice_number_prefix: unwrap(m?.get("invoice_number_prefix")) || "INV",
    invoice_number_format: unwrap(m?.get("invoice_number_format")) || "YYYY-MM-{SEQ}",

    // Invoice content visibility
    invoice_show_bank_info: unwrapBoolean(m?.get("invoice_show_bank_info"), true),
    invoice_show_notes_section: unwrapBoolean(m?.get("invoice_show_notes_section"), true),
    invoice_show_package_info: unwrapBoolean(m?.get("invoice_show_package_info"), true),
    invoice_watermark_paid: unwrapBoolean(m?.get("invoice_watermark_paid"), true),

    // Legacy document-specific colors (still respected as fallbacks)
    eticket_header_color: unwrap(m?.get("pdf_global_accent_color") ?? m?.get("eticket_header_color")) || "#16a34a",
    certificate_border_color: unwrap(m?.get("certificate_border_color")) || "#daa520",
    certificate_text_color: unwrap(m?.get("certificate_text_color")) || "#165634",

    // Footer metadata
    document_footer_show_timestamp: unwrapBoolean(
      m?.get("pdf_global_show_timestamp") ?? m?.get("document_footer_show_timestamp"),
      true
    ),
    document_footer_show_page_number: unwrapBoolean(
      m?.get("pdf_global_show_page_number") ?? m?.get("document_footer_show_page_number"),
      true
    ),

    // Global accent color and font
    invoice_accent_color: unwrap(
      m?.get("pdf_global_accent_color") ?? m?.get("invoice_accent_color")
    ) || "#16a34a",
    pdf_default_font: (unwrap(
      m?.get("pdf_global_font_family") ?? m?.get("pdf_default_font")
    ) as any) || "helvetica",

    // ── Passport letter per-document overrides ───────────────────────────
    passport_letter_page_orientation: unwrapOptionalOrientation(m?.get("passport_letter_page_orientation")),
    passport_letter_font_family: unwrapOptionalFont(m?.get("passport_letter_font_family")),
    passport_letter_accent_color: unwrapOptionalString(m?.get("passport_letter_accent_color")),
    passport_letter_show_photo: m?.has("passport_letter_show_photo")
      ? unwrapBoolean(m.get("passport_letter_show_photo"), false)
      : undefined,
    passport_letter_show_qr_code: m?.has("passport_letter_show_qr_code")
      ? unwrapBoolean(m.get("passport_letter_show_qr_code"), false)
      : undefined,

    // ── Leave permit per-document overrides ──────────────────────────────
    leave_permit_page_orientation: unwrapOptionalOrientation(m?.get("leave_permit_page_orientation")),
    leave_permit_font_family: unwrapOptionalFont(m?.get("leave_permit_font_family")),
    leave_permit_accent_color: unwrapOptionalString(m?.get("leave_permit_accent_color")),
    leave_permit_include_company_logo: m?.has("leave_permit_include_company_logo")
      ? unwrapBoolean(m.get("leave_permit_include_company_logo"), true)
      : undefined,

    // ── Certificate per-document overrides ───────────────────────────────
    certificate_page_orientation: unwrapOptionalOrientation(m?.get("certificate_page_orientation")),
    certificate_font_family: unwrapOptionalFont(m?.get("certificate_font_family")),
    certificate_background_image_url: unwrapOptionalString(m?.get("certificate_background_image_url")),

    // ── General letter per-document overrides ────────────────────────────
    general_letter_page_orientation: unwrapOptionalOrientation(m?.get("general_letter_page_orientation")),
    general_letter_font_family: unwrapOptionalFont(m?.get("general_letter_font_family")),
    general_letter_accent_color: unwrapOptionalString(m?.get("general_letter_accent_color")),
    general_letter_show_letterhead: m?.has("general_letter_show_letterhead")
      ? unwrapBoolean(m.get("general_letter_show_letterhead"), true)
      : undefined,
  };

  // Parse invoice layout (Specific > Global hierarchy)
  const invoiceLayoutRaw = m?.get("document_layout_invoice");
  let invoiceLayout: DocumentLayout | undefined = undefined;

  if (invoiceLayoutRaw) {
    try {
      const parsed = typeof invoiceLayoutRaw === 'string' ? JSON.parse(invoiceLayoutRaw) : invoiceLayoutRaw;
      invoiceLayout = {
        show_logo: parsed.show_logo !== undefined ? parsed.show_logo : documentSettings.letterhead_show_logo,
        show_header: parsed.show_header !== undefined ? parsed.show_header : true,
        show_company_info: parsed.show_company_info !== undefined ? parsed.show_company_info : true,
        show_date: parsed.show_date !== undefined ? parsed.show_date : true,
        show_signature: parsed.show_signature !== undefined ? parsed.show_signature : true,
        show_stamp: parsed.show_stamp !== undefined ? parsed.show_stamp : true,
        show_bank_info: parsed.show_bank_info !== undefined ? parsed.show_bank_info : documentSettings.invoice_show_bank_info,
        footer_text: parsed.footer_text ?? "",
        page_orientation: parsed.page_orientation ?? "portrait",
      };
    } catch (e) {
      console.error("Failed to parse invoice layout", e);
    }
  }

  if (!invoiceLayout) {
    invoiceLayout = {
      show_logo: documentSettings.letterhead_show_logo,
      show_header: true,
      show_company_info: true,
      show_date: true,
      show_signature: true,
      show_stamp: true,
      show_bank_info: documentSettings.invoice_show_bank_info,
      footer_text: "",
      page_orientation: "portrait",
    };
  }

  const company: CompanyInfo = {
    name: unwrap(m?.get("company_name")) || "PT. Umrah Haji Travel",
    address: unwrap(m?.get("company_address")) || "Jl. Raya Utama No. 123, Jakarta",
    phone: unwrap(m?.get("company_phone")) || "(021) 1234-5678",
    email: unwrap(m?.get("company_email")) || "info@umrahhaji.com",
    website: unwrap(m?.get("company_website")) || undefined,
    logo: logoUrl,
    city: unwrap(m?.get("company_city")) || "Jakarta",
    settings: {
      // Global / legacy
      invoice_accent_color: documentSettings.invoice_accent_color,
      invoice_show_bank_info: documentSettings.invoice_show_bank_info,
      invoice_show_notes_section: documentSettings.invoice_show_notes_section,
      invoice_show_package_info: documentSettings.invoice_show_package_info,
      invoice_watermark_paid: documentSettings.invoice_watermark_paid,
      document_footer_show_timestamp: documentSettings.document_footer_show_timestamp,
      document_footer_show_page_number: documentSettings.document_footer_show_page_number,
      pdf_default_font: documentSettings.pdf_default_font,
      // Passport letter overrides
      passport_letter_page_orientation: documentSettings.passport_letter_page_orientation,
      passport_letter_font_family: documentSettings.passport_letter_font_family,
      passport_letter_accent_color: documentSettings.passport_letter_accent_color,
      passport_letter_show_photo: documentSettings.passport_letter_show_photo,
      passport_letter_show_qr_code: documentSettings.passport_letter_show_qr_code,
      // Leave permit overrides
      leave_permit_page_orientation: documentSettings.leave_permit_page_orientation,
      leave_permit_font_family: documentSettings.leave_permit_font_family,
      leave_permit_accent_color: documentSettings.leave_permit_accent_color,
      leave_permit_include_company_logo: documentSettings.leave_permit_include_company_logo,
      // Certificate overrides
      certificate_page_orientation: documentSettings.certificate_page_orientation,
      certificate_font_family: documentSettings.certificate_font_family,
      certificate_border_color: documentSettings.certificate_border_color,
      certificate_text_color: documentSettings.certificate_text_color,
      certificate_background_image_url: documentSettings.certificate_background_image_url,
      // General letter overrides
      general_letter_page_orientation: documentSettings.general_letter_page_orientation,
      general_letter_font_family: documentSettings.general_letter_font_family,
      general_letter_accent_color: documentSettings.general_letter_accent_color,
      general_letter_show_letterhead: documentSettings.general_letter_show_letterhead,
    },
    layout: invoiceLayout,
  };

  return {
    company,
    city: company.city,
    documentSettings,
    bankAccount: bankQuery.data,
    isLoading: settingsQuery.isLoading || bankQuery.isLoading || websiteSettingsQuery.isLoading,
  };
}
