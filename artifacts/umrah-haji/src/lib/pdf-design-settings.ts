/**
 * PDF Design Settings Utility
 * Manages global and document-specific design settings for PDF generation
 */

export interface PDFDesignSettings {
  // Global settings
  fontFamily: "helvetica" | "times" | "courier";
  fontSizeHeader: number;
  fontSizeBody: number;
  textColor: string; // hex color
  accentColor: string; // hex color
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showLogo: boolean;
  logoPosition: "left" | "center" | "right";
  pageOrientation: "portrait" | "landscape";
  showPageNumber: boolean;
  showTimestamp: boolean;
}

export interface DocumentSpecificSettings {
  pageOrientation?: "portrait" | "landscape";
  fontFamily?: "helvetica" | "times" | "courier";
  headerBgColor?: string;
  headerTextColor?: string;
  accentColor?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  // Specific flags for content visibility
  showBankInfo?: boolean;
  showNotesSection?: boolean;
  showPackageInfo?: boolean;
  watermarkPaid?: boolean;
  numberPrefix?: string;
  numberFormat?: string;
  showPhoto?: boolean;
  showQrCode?: boolean;
  includeCompanyLogo?: boolean;
  borderColor?: string;
  backgroundImageUrl?: string;
  showLetterhead?: boolean;
}

/**
 * Converts hex color to RGB array for jsPDF
 * @param hex - Hex color string (e.g., "#FF0000")
 * @returns RGB array [r, g, b]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [0, 0, 0]; // Default to black if invalid
  }
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Merges global settings with document-specific overrides
 * @param globalSettings - Global PDF design settings
 * @param documentSettings - Document-specific settings (optional)
 * @returns Merged settings with document-specific values taking precedence
 */
export function mergeDesignSettings(
  globalSettings: PDFDesignSettings,
  documentSettings?: DocumentSpecificSettings
): PDFDesignSettings {
  if (!documentSettings) {
    return globalSettings;
  }

  return {
    fontFamily: documentSettings.fontFamily || globalSettings.fontFamily,
    fontSizeHeader: globalSettings.fontSizeHeader,
    fontSizeBody: globalSettings.fontSizeBody,
    textColor: documentSettings.headerTextColor || globalSettings.textColor, // Use headerTextColor for general text color override
    accentColor: documentSettings.accentColor || globalSettings.accentColor,
    marginTop: globalSettings.marginTop,
    marginBottom: globalSettings.marginBottom,
    marginLeft: globalSettings.marginLeft,
    marginRight: globalSettings.marginRight,
    showLogo: documentSettings.includeCompanyLogo !== undefined ? documentSettings.includeCompanyLogo : globalSettings.showLogo,
    logoPosition: globalSettings.logoPosition,
    pageOrientation: documentSettings.pageOrientation || globalSettings.pageOrientation,
    showPageNumber: globalSettings.showPageNumber,
    showTimestamp: globalSettings.showTimestamp,
  };
}

/**
 * Validates hex color format
 * @param hex - Hex color string
 * @returns True if valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Gets font name for jsPDF
 * @param fontFamily - Font family name
 * @returns Font name compatible with jsPDF
 */
export function getFontNameForJsPDF(fontFamily: "helvetica" | "times" | "courier"): string {
  const fontMap: Record<string, string> = {
    helvetica: "helvetica",
    times: "times",
    courier: "courier",
  };
  return fontMap[fontFamily] || "helvetica";
}

/**
 * Applies design settings to jsPDF document
 * @param doc - jsPDF document instance
 * @param settings - Design settings to apply
 */
export function applyDesignSettingsToDoc(doc: any, settings: PDFDesignSettings): void {
  // Set default font
  doc.setFont(getFontNameForJsPDF(settings.fontFamily));

  // Set default text color
  const [r, g, b] = hexToRgb(settings.textColor);
  doc.setTextColor(r, g, b);
}

/**
 * Example of how to use design settings in PDF generation
 * This function demonstrates the pattern for other PDF generators
 */
export function examplePDFWithDesignSettings(
  doc: any,
  globalSettings: PDFDesignSettings,
  documentSettings?: DocumentSpecificSettings
): void {
  // Merge settings
  const finalSettings = mergeDesignSettings(globalSettings, documentSettings);

  // Apply to document
  applyDesignSettingsToDoc(doc, finalSettings);

  // Use settings in your PDF generation logic
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Use margins
  let currentY = finalSettings.marginTop;
  const contentWidth = pageWidth - finalSettings.marginLeft - finalSettings.marginRight;

  // Example: Add title with header font size
  doc.setFontSize(finalSettings.fontSizeHeader);
  doc.text("Document Title", finalSettings.marginLeft, currentY);
  currentY += 10;

  // Example: Add body text with body font size
  doc.setFontSize(finalSettings.fontSizeBody);
  doc.text("Body text content", finalSettings.marginLeft, currentY);

  // Example: Add footer with page number if enabled
  if (finalSettings.showPageNumber) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - finalSettings.marginRight,
        pageHeight - finalSettings.marginBottom,
        { align: "right" }
      );
    }
  }

  // Example: Add timestamp if enabled
  if (finalSettings.showTimestamp) {
    const now = new Date().toLocaleString("id-ID");
    doc.setFontSize(8);
    doc.text(`Generated: ${now}`, finalSettings.marginLeft, pageHeight - finalSettings.marginBottom);
  }
}
