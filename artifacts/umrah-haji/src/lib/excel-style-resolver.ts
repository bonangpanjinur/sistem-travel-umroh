import { DEFAULT_EXCEL_STYLE, ExcelStyleConfig } from './dynamic-excel-exporter';

type GetSetting = (key: string) => string | undefined | null;

/**
 * Build ExcelStyleConfig from company_settings via a getter.
 * Avoids the 30+ line inline duplication in admin pages.
 */
export function resolveExcelStyle(getSetting: GetSetting): ExcelStyleConfig {
  const num = (key: string, fallback: number) => {
    const v = parseInt(getSetting(key) || '');
    return Number.isFinite(v) ? v : fallback;
  };
  const str = (key: string, fallback: string) => getSetting(key) || fallback;
  const bool = (key: string, fallback: boolean) => {
    const v = getSetting(key);
    if (v == null) return fallback;
    return v !== 'false';
  };

  return {
    title_bg_color: str('excel_title_bg_color', DEFAULT_EXCEL_STYLE.title_bg_color),
    title_text_color: str('excel_title_text_color', DEFAULT_EXCEL_STYLE.title_text_color),
    title_font_size: num('excel_title_font_size', DEFAULT_EXCEL_STYLE.title_font_size),
    title_bold: bool('excel_title_bold', DEFAULT_EXCEL_STYLE.title_bold),

    header_bg_color: str('excel_header_bg_color', DEFAULT_EXCEL_STYLE.header_bg_color),
    header_text_color: str('excel_header_text_color', DEFAULT_EXCEL_STYLE.header_text_color),
    header_font_size: num('excel_header_font_size', DEFAULT_EXCEL_STYLE.header_font_size),
    header_bold: bool('excel_header_bold', DEFAULT_EXCEL_STYLE.header_bold),

    section_bg_color: str('excel_section_bg_color', DEFAULT_EXCEL_STYLE.section_bg_color),
    section_text_color: str('excel_section_text_color', DEFAULT_EXCEL_STYLE.section_text_color),
    section_font_size: num('excel_section_font_size', DEFAULT_EXCEL_STYLE.section_font_size),
    section_bold: bool('excel_section_bold', DEFAULT_EXCEL_STYLE.section_bold),

    summary_bg_color: str('excel_summary_bg_color', DEFAULT_EXCEL_STYLE.summary_bg_color),
    summary_text_color: str('excel_summary_text_color', DEFAULT_EXCEL_STYLE.summary_text_color),

    row_bg_color: str('excel_row_bg_color', DEFAULT_EXCEL_STYLE.row_bg_color),
    row_text_color: str('excel_row_text_color', DEFAULT_EXCEL_STYLE.row_text_color),
    alt_row_bg_color: str('excel_alt_row_bg_color', DEFAULT_EXCEL_STYLE.alt_row_bg_color),

    border_color: str('excel_border_color', DEFAULT_EXCEL_STYLE.border_color),
    border_style: (getSetting('excel_border_style') as 'thin' | 'medium' | 'thick') || DEFAULT_EXCEL_STYLE.border_style,

    body_font_size: num('excel_body_font_size', DEFAULT_EXCEL_STYLE.body_font_size),
    footer_font_size: num('excel_footer_font_size', DEFAULT_EXCEL_STYLE.footer_font_size),
  };
}
