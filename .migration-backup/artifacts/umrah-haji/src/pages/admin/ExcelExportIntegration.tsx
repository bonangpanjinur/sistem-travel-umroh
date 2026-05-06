/**
 * INTEGRATION GUIDE: Dynamic Excel Export
 * 
 * This file shows how to integrate the dynamic Excel export functionality
 * into AdminBookings.tsx and AdminReports.tsx
 */

import { useCompanySettings } from "@/hooks/useCompanySettings";
import { exportDynamicBookingExcel, exportDynamicStatisticsExcel, ExcelStyleConfig, DEFAULT_EXCEL_STYLE } from "@/lib/dynamic-excel-exporter";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * STEP 1: Add imports to your component
 */
// import { useCompanySettings } from "@/hooks/useCompanySettings";
// import { exportDynamicBookingExcel, exportDynamicStatisticsExcel, ExcelStyleConfig } from "@/lib/dynamic-excel-exporter";

/**
 * STEP 2: Use the hook in your component
 */
// const { getSetting } = useCompanySettings();

/**
 * STEP 3: Create a function to load Excel style settings from database
 */
export function loadExcelStyleConfig(getSetting: (key: string) => any): ExcelStyleConfig {
  return {
    title_bg_color: getSetting('excel_title_bg_color') || DEFAULT_EXCEL_STYLE.title_bg_color,
    title_text_color: getSetting('excel_title_text_color') || DEFAULT_EXCEL_STYLE.title_text_color,
    title_font_size: parseInt(getSetting('excel_title_font_size')) || DEFAULT_EXCEL_STYLE.title_font_size,
    title_bold: getSetting('excel_title_bold') !== 'false',

    header_bg_color: getSetting('excel_header_bg_color') || DEFAULT_EXCEL_STYLE.header_bg_color,
    header_text_color: getSetting('excel_header_text_color') || DEFAULT_EXCEL_STYLE.header_text_color,
    header_font_size: parseInt(getSetting('excel_header_font_size')) || DEFAULT_EXCEL_STYLE.header_font_size,
    header_bold: getSetting('excel_header_bold') !== 'false',

    section_bg_color: getSetting('excel_section_bg_color') || DEFAULT_EXCEL_STYLE.section_bg_color,
    section_text_color: getSetting('excel_section_text_color') || DEFAULT_EXCEL_STYLE.section_text_color,
    section_font_size: parseInt(getSetting('excel_section_font_size')) || DEFAULT_EXCEL_STYLE.section_font_size,
    section_bold: getSetting('excel_section_bold') !== 'false',

    summary_bg_color: getSetting('excel_summary_bg_color') || DEFAULT_EXCEL_STYLE.summary_bg_color,
    summary_text_color: getSetting('excel_summary_text_color') || DEFAULT_EXCEL_STYLE.summary_text_color,

    row_bg_color: getSetting('excel_row_bg_color') || DEFAULT_EXCEL_STYLE.row_bg_color,
    row_text_color: getSetting('excel_row_text_color') || DEFAULT_EXCEL_STYLE.row_text_color,
    alt_row_bg_color: getSetting('excel_alt_row_bg_color') || DEFAULT_EXCEL_STYLE.alt_row_bg_color,

    border_color: getSetting('excel_border_color') || DEFAULT_EXCEL_STYLE.border_color,
    border_style: (getSetting('excel_border_style') || DEFAULT_EXCEL_STYLE.border_style) as 'thin' | 'medium' | 'thick',

    body_font_size: parseInt(getSetting('excel_body_font_size')) || DEFAULT_EXCEL_STYLE.body_font_size,
    footer_font_size: parseInt(getSetting('excel_footer_font_size')) || DEFAULT_EXCEL_STYLE.footer_font_size,
  };
}

/**
 * STEP 4: In AdminBookings.tsx - Export Booking to Excel
 */
export function handleExportBookingExcel(
  bookings: any[],
  getSetting: (key: string) => any,
  dateFrom?: Date,
  dateTo?: Date
) {
  if (!bookings || bookings.length === 0) return;

  const styleConfig = loadExcelStyleConfig(getSetting);
  const companyName = getSetting('company_name') || 'Vins Tour Travel';

  // Transform booking data to match the expected format
  const bookingData = bookings.map(b => ({
    booking_code: b.booking_code,
    customer_name: b.customer?.full_name || '-',
    customer_phone: b.customer?.phone || '-',
    package_name: b.departure?.package?.name || '-',
    departure_date: b.departure?.departure_date || new Date().toISOString(),
    total_pax: b.total_pax || 0,
    room_type: b.room_type || '-',
    total_price: Number(b.total_price) || 0,
    paid_amount: Number(b.paid_amount) || 0,
    remaining_amount: Number(b.remaining_amount) || 0,
    booking_status: b.booking_status || 'pending',
    payment_status: b.payment_status || 'pending',
    created_at: b.created_at || new Date().toISOString(),
  }));

  exportDynamicBookingExcel(bookingData, companyName, styleConfig, dateFrom, dateTo);
}

/**
 * STEP 5: In AdminBookings.tsx - Export Statistics to Excel
 */
export function handleExportStatisticsExcel(
  periodStats: any,
  periodLabel: string,
  dateFrom: Date | undefined,
  dateTo: Date | undefined,
  getSetting: (key: string) => any
) {
  if (!periodStats) return;

  const styleConfig = loadExcelStyleConfig(getSetting);
  const companyName = getSetting('company_name') || 'Vins Tour Travel';

  const dateFromStr = dateFrom 
    ? format(dateFrom, 'd MMMM yyyy', { locale: id })
    : 'Awal Periode';
  
  const dateToStr = dateTo
    ? format(dateTo, 'd MMMM yyyy', { locale: id })
    : 'Akhir Periode';

  exportDynamicStatisticsExcel(periodStats, companyName, periodLabel, dateFromStr, dateToStr, styleConfig);
}

/**
 * STEP 6: In your JSX, add buttons like this:
 */

/*
// For Booking Export
<Button
  onClick={() => handleExportBookingExcel(bookings, getSetting, dateRange.from, dateRange.to)}
  disabled={!bookings?.length}
  className="gap-2"
>
  <FileSpreadsheet className="h-4 w-4" />
  Export Excel (Dinamis)
</Button>

// For Statistics Export
<Button
  onClick={() => handleExportStatisticsExcel(periodStats, periodRange?.label, periodRange?.from, periodRange?.to, getSetting)}
  disabled={!periodStats}
  className="gap-2"
>
  <FileSpreadsheet className="h-4 w-4" />
  Export Excel (Dinamis)
</Button>
*/

/**
 * STEP 7: Add the ExcelExportSettingsForm to AdminSettings.tsx
 */

/*
// In AdminSettings.tsx, add this import:
import { ExcelExportSettingsForm } from "@/components/admin/ExcelExportSettingsForm";

// Add a new nav item in NAV_ITEMS array:
{ 
  id: "excel-export",
  label: "Export Excel",
  icon: FileSpreadsheet,
  description: "Kustomisasi warna & styling export",
  adminOnly: true
},

// Add this in the content section:
{activeSection === "excel-export" && (
  <>
    <SectionHead 
      icon={FileSpreadsheet} 
      title="Pengaturan Export Excel" 
      desc="Kustomisasi warna, font, dan styling untuk export Excel" 
    />
    <ExcelExportSettingsForm />
  </>
)}
*/

export const INTEGRATION_COMPLETE = true;
