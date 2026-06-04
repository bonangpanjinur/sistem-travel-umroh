/**
 * Unified status-aware watermark utility for PDFs generated via jsPDF.
 *
 * Replaces ad-hoc inline watermark blocks across document-generator.ts and
 * transaction-form-generator.ts so every dokumen menampilkan stempel status
 * pembayaran yang konsisten (LUNAS / DP / BELUM BAYAR / DIBATALKAN).
 */
import type jsPDF from "jspdf";

export type PaymentWatermarkStatus =
  | "paid"
  | "partial"
  | "dp"
  | "unpaid"
  | "pending"
  | "cancelled"
  | "refunded";

interface WatermarkStyle {
  label: string;
  color: [number, number, number];
  opacity: number;
}

const STYLE_MAP: Record<PaymentWatermarkStatus, WatermarkStyle> = {
  paid:      { label: "LUNAS",        color: [22, 163, 74],  opacity: 0.10 },
  partial:   { label: "DP",           color: [202, 138, 4],  opacity: 0.08 },
  dp:        { label: "DP",           color: [202, 138, 4],  opacity: 0.08 },
  unpaid:    { label: "BELUM BAYAR",  color: [220, 38, 38],  opacity: 0.07 },
  pending:   { label: "BELUM BAYAR",  color: [220, 38, 38],  opacity: 0.07 },
  cancelled: { label: "DIBATALKAN",   color: [120, 113, 108], opacity: 0.10 },
  refunded:  { label: "REFUND",       color: [120, 113, 108], opacity: 0.10 },
};

export interface DrawWatermarkOptions {
  status?: string | null;
  enabled?: boolean;
  font?: string;
  /** vertical position in mm; defaults to ~middle of A4 */
  y?: number;
  /** force a custom label (overrides status mapping) */
  label?: string;
}

/**
 * Draws a diagonal watermark stamp on the current page, based on payment
 * status. Safely no-ops when status has no mapping or when disabled.
 */
export function drawPaymentWatermark(
  doc: jsPDF,
  opts: DrawWatermarkOptions = {}
): void {
  if (opts.enabled === false) return;

  const key = (opts.status ?? "").toLowerCase() as PaymentWatermarkStatus;
  const style = STYLE_MAP[key];
  if (!style && !opts.label) return;

  const label = opts.label ?? style.label;
  const color = style?.color ?? [120, 113, 108];
  const opacity = style?.opacity ?? 0.08;
  const font = opts.font ?? "helvetica";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = opts.y ?? pageHeight / 2;

  doc.saveGraphicsState();
  // jsPDF GState is not in types
  const anyDoc = doc as unknown as {
    GState?: new (o: { opacity: number }) => unknown;
    setGState?: (g: unknown) => void;
  };
  if (typeof anyDoc.GState === "function" && typeof anyDoc.setGState === "function") {
    anyDoc.setGState(new anyDoc.GState({ opacity }));
  }

  doc.setFont(font, "bold");
  doc.setFontSize(72);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(label, pageWidth / 2, y, { align: "center", angle: 35 });

  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
}