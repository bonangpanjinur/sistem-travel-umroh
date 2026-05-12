/**
 * transaction-form-generator.ts
 * Generates a "FORM TRANSAKSI PAKET UMRAH" PDF that closely matches
 * the reference layout (header centered, 4-col code grid, two-column
 * label:value pairs, pricing table, dynamic payment info, terms, signatures,
 * and passenger-list appendix).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { drawPaymentWatermark } from "./pdf/watermark";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PaymentInfoBlock {
  title: string;    // e.g. "UNTUK MELAKUKAN PEMBAYARAN MELALUI VIRTUAL ACCOUNT..."
  items: string[];  // e.g. ["VIRTUAL ACCOUNT BNI : 988636...", "VIRTUAL ACCOUNT BSI : 435952..."]
}

export interface PolicySection {
  title: string;   // e.g. "PEMBAYARAN"
  items: string[]; // bullet items
}

export interface CancellationPolicy {
  id?: string;
  name: string;
  sections: PolicySection[];
}

export interface TransactionFormTemplate {
  accentColor: string;                     // e.g. "#1e3a5f"
  fontFamily: "helvetica" | "times" | "courier";
  headerStyle: "centered" | "left";
  showLogo: boolean;
  showPassengerList: boolean;
  showSignature: boolean;
  leftSignatureLabel: string;              // "PETUGAS"
  rightSignatureLabel: string;             // "PEMESAN"
  paymentInfoBlocks: PaymentInfoBlock[];
  termsText: string;
  footerText?: string;
  cancellationPolicy?: CancellationPolicy; // structured policy (overrides termsText rendering)
}

export interface RoomCombination {
  roomType: string;
  pricePerPax: number;
  paxCount: number;
  roomCount: number;
}

export interface TransactionPassenger {
  name: string;
  roomType: string;
  basePrice: number;
  additionalCost?: number;
  discount?: number;
  totalBill: number;
}

export interface TransactionFormCompany {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;          // base64 or URL
}

export interface TransactionFormData {
  transactionCode: string;       // TRA012753
  customerCode?: string;         // JMH030594
  transactionDate: Date;
  referenceAgent?: string;       // FAIZAL AMIRUDIN

  customerName: string;
  customerAddress?: string;
  customerPhone?: string;

  packageName?: string;          // ADEN 1448 JUNI – DESEMBER
  packageType?: string;          // ADEN 9 HARI
  umrahSeason?: string;          // 1448 H
  programDays?: string;          // 9 HARI
  departureDate?: Date;
  returnDate?: Date;
  hotelMakkah?: string;
  hotelMadinah?: string;
  airline?: string;
  airport?: string;

  roomCombinations: RoomCombination[];
  discounts?: { label: string; amount: number }[];
  totalPrice: number;
  notes?: string;

  passengers: TransactionPassenger[];

  /** Optional — when provided, stamps a status-aware watermark on every page. */
  paymentStatus?: string | null;
  showWatermark?: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE: TransactionFormTemplate = {
  accentColor: "#1e3a5f",
  fontFamily: "helvetica",
  headerStyle: "centered",
  showLogo: true,
  showPassengerList: true,
  showSignature: true,
  leftSignatureLabel: "PETUGAS",
  rightSignatureLabel: "PEMESAN",
  paymentInfoBlocks: [],
  termsText: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : { r: 30, g: 58, b: 95 };
}

// ─── Layout constants (single source of truth) ───────────────────────────────
const LAYOUT = {
  MARGIN: 10,
  FOOTER_RESERVE: 14, // mm reserved at bottom for page footer
  FS_TITLE: 13,
  FS_SECTION: 9,
  FS_LABEL: 7.5,
  FS_BODY: 7.5,
  FS_SMALL: 7,
  GAP_AFTER_TITLE: 5,
  GAP_AFTER_SECTION: 4,
  ROW_LEADING: 4.5,
} as const;

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

function fmtDate(d?: Date | null) {
  if (!d) return "-";
  try {
    return format(d, "dd MMMM yyyy", { locale: idLocale }).toUpperCase();
  } catch {
    return "-";
  }
}

/** Draw a thin horizontal rule */
function hr(doc: jsPDF, y: number, margin = 10) {
  const pw = doc.internal.pageSize.width;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
}

/** Ensure enough vertical space; add page if needed */
function ensureSpace(doc: jsPDF, y: number, needed: number, margin = LAYOUT.MARGIN): number {
  const ph = doc.internal.pageSize.height;
  if (y + needed > ph - LAYOUT.FOOTER_RESERVE - 2) {
    doc.addPage();
    return margin + 5;
  }
  return y;
}

async function loadLogoBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateTransactionForm(
  data: TransactionFormData,
  company: TransactionFormCompany,
  template: TransactionFormTemplate = DEFAULT_TEMPLATE
): Promise<jsPDF> {
  // Pre-process logo
  let logoB64: string | null = null;
  if (template.showLogo && company.logo) {
    logoB64 = company.logo.startsWith("data:")
      ? company.logo
      : await loadLogoBase64(company.logo);
  }

  const font = template.fontFamily;
  const acc = hexToRgb(template.accentColor);
  const MARGIN = 10;
  const pw = 210; // A4 width mm
  const cw = pw - MARGIN * 2; // content width

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont(font);
  doc.setTextColor(0, 0, 0);

  // ── Page border ──────────────────────────────────────────────────────────
  function addPageBorder() {
    doc.setDrawColor(acc.r, acc.g, acc.b);
    doc.setLineWidth(0.8);
    doc.rect(MARGIN - 2, MARGIN - 2, pw - (MARGIN - 2) * 2, doc.internal.pageSize.height - (MARGIN - 2) * 2);
  }
  addPageBorder();

  let y = MARGIN + 4;

  // ── Logo + Title / Header ─────────────────────────────────────────────────
  const isCentered = template.headerStyle === "centered";
  const cx = pw / 2;

  if (logoB64) {
    const logoW = 20, logoH = 20;
    const logoX = isCentered ? cx - logoW / 2 : MARGIN;
    try { doc.addImage(logoB64, "PNG", logoX, y, logoW, logoH); } catch { /* skip */ }
    y += logoH + 2;
  }

  // Title
  doc.setFontSize(13);
  doc.setFont(font, "bold");
  doc.setTextColor(acc.r, acc.g, acc.b);
  doc.text("FORM TRANSAKSI PAKET UMRAH", cx, y, { align: "center" });
  y += 7;

  // Company name
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(company.name.toUpperCase(), cx, y, { align: "center" });
  y += 5;

  // Address + contact (split to fit)
  doc.setFontSize(7.5);
  doc.setFont(font, "normal");
  const contactLine = `${company.address}  TELP: ${company.phone}  EMAIL: ${company.email}`;
  const contactLines = doc.splitTextToSize(contactLine, cw - 4);
  doc.text(contactLines, cx, y, { align: "center" });
  y += contactLines.length * 4 + 3;

  hr(doc, y, MARGIN);
  y += 4;

  // ── 4-column code grid ────────────────────────────────────────────────────
  const colW4 = cw / 4;
  const codeLabels = ["KODE TRANSAKSI", "KODE PEMESAN", "TANGGAL TRANSAKSI", "NAMA REFERENSI"];
  const codeValues = [
    data.transactionCode,
    data.customerCode || "-",
    fmtDate(data.transactionDate),
    data.referenceAgent || "-",
  ];

  const gridH = 14;
  // draw 4 bordered cells
  for (let i = 0; i < 4; i++) {
    const x = MARGIN + i * colW4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(x, y, colW4, gridH);

    doc.setFontSize(6.5);
    doc.setFont(font, "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(codeLabels[i], x + 2, y + 4);

    doc.setFontSize(8);
    doc.setFont(font, "bold");
    doc.setTextColor(15, 15, 15);
    doc.text(codeValues[i], x + 2, y + 11);
  }
  y += gridH + 4;

  hr(doc, y, MARGIN);
  y += 5;

  // ─── Helper: label:value row (full width) ─────────────────────────────────
  const LABEL_W = 45;
  function labelRow(label: string, value: string) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(7.5);
    doc.setFont(font, "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(label, MARGIN, y);

    doc.setFont(font, "normal");
    doc.setTextColor(15, 15, 15);
    const valLines = doc.splitTextToSize(value || "-", cw - LABEL_W - 4);
    doc.text(valLines, MARGIN + LABEL_W, y);
    y += Math.max(valLines.length * 4.5, 6) + 1;
  }

  // ─── Helper: two-column label:value pairs ─────────────────────────────────
  const HALF = cw / 2 - 2;
  const LBL2 = 35;
  function twoColRow(lL: string, lV: string, rL: string, rV: string) {
    y = ensureSpace(doc, y, 8);
    const leftX = MARGIN;
    const rightX = MARGIN + HALF + 4;

    doc.setFontSize(7.5);
    doc.setFont(font, "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(lL, leftX, y);
    doc.setFont(font, "normal");
    doc.setTextColor(15, 15, 15);
    const lLines = doc.splitTextToSize(lV || "-", HALF - LBL2 - 2);
    doc.text(lLines, leftX + LBL2, y);

    doc.setFont(font, "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(rL, rightX, y);
    doc.setFont(font, "normal");
    doc.setTextColor(15, 15, 15);
    const rLines = doc.splitTextToSize(rV || "-", HALF - LBL2 - 2);
    doc.text(rLines, rightX + LBL2, y);

    y += Math.max(lLines.length, rLines.length) * 4.5 + 1;
  }

  // ── Customer Info ─────────────────────────────────────────────────────────
  labelRow("NAMA LENGKAP", data.customerName.toUpperCase());
  labelRow("ALAMAT LENGKAP", data.customerAddress?.toUpperCase() || "-");
  labelRow("NOMOR TELEPON", data.customerPhone || "-");
  y += 1;

  // ── Package Info ──────────────────────────────────────────────────────────
  twoColRow("PAKET UMRAH", (data.packageName || "-").toUpperCase(), "JENIS PAKET", (data.packageType || "-").toUpperCase());
  twoColRow("MUSIM UMRAH", data.umrahSeason?.toUpperCase() || "-", "PROGRAM HARI", data.programDays?.toUpperCase() || "-");
  twoColRow("TANGGAL BERANGKAT", fmtDate(data.departureDate), "TANGGAL KEMBALI", fmtDate(data.returnDate));
  twoColRow("HOTEL MAKKAH", (data.hotelMakkah || "-").toUpperCase(), "HOTEL MADINAH", (data.hotelMadinah || "-").toUpperCase());
  twoColRow("MASKAPAI", (data.airline || "-").toUpperCase(), "BANDARA", (data.airport || "-").toUpperCase());
  y += 2;

  hr(doc, y, MARGIN);
  y += 4;

  // ── Pricing Table ─────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 30);

  // Section title
  doc.setFontSize(8);
  doc.setFont(font, "bold");
  doc.setTextColor(acc.r, acc.g, acc.b);
  doc.text("HARGA PAKET & KOMBINASI KAMAR", MARGIN, y);
  y += 5;

  const pricingRows = data.roomCombinations.map((rc) => [
    rc.roomType.toUpperCase(),
    fmtIDR(rc.pricePerPax),
    `${rc.paxCount} PAX`,
    `${rc.roomCount} KAMAR`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["JENIS KAMAR", "HARGA PAKET/PAX", "JUMLAH PAX", "JUMLAH KAMAR"]],
    body: pricingRows,
    styles: { fontSize: 8, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.2, font },
    headStyles: { fillColor: [acc.r, acc.g, acc.b], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 50, halign: "right" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: cw,
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  // ── Discounts ─────────────────────────────────────────────────────────────
  if (data.discounts && data.discounts.length > 0) {
    y = ensureSpace(doc, y, 8);
    doc.setFont(font, "bold");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text("POTONGAN HARGA", MARGIN, y);
    doc.setFont(font, "normal");
    const discountText = data.discounts.map(d => `${d.label} : ${fmtIDR(d.amount)}`).join("   ");
    doc.text(discountText, MARGIN + 40, y);
    y += 7;
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 10);
  doc.setFillColor(acc.r, acc.g, acc.b);
  doc.rect(MARGIN, y - 2, cw, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(font, "bold");
  doc.text("TOTAL HARGA", MARGIN + 3, y + 5);
  doc.text(fmtIDR(data.totalPrice), pw - MARGIN - 3, y + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // ── Notes / Catatan ───────────────────────────────────────────────────────
  if (data.notes) {
    y = ensureSpace(doc, y, 12);
    doc.setFontSize(7.5);
    doc.setFont(font, "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("CATATAN", MARGIN, y);
    doc.setFont(font, "normal");
    doc.setTextColor(15, 15, 15);
    const noteLines = doc.splitTextToSize(data.notes, cw - 30);
    doc.text(noteLines, MARGIN + 30, y);
    y += noteLines.length * 4.5 + 4;
  }

  hr(doc, y, MARGIN);
  y += 5;

  // ── INFORMASI PEMBAYARAN ──────────────────────────────────────────────────
  if (template.paymentInfoBlocks.length > 0) {
    y = ensureSpace(doc, y, 10);
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    doc.setTextColor(acc.r, acc.g, acc.b);
    doc.text("INFORMASI PEMBAYARAN", MARGIN, y);
    y += 6;

    for (const block of template.paymentInfoBlocks) {
      y = ensureSpace(doc, y, 8);
      // Block title (italic)
      if (block.title) {
        doc.setFontSize(7.5);
        doc.setFont(font, "italic");
        doc.setTextColor(60, 60, 60);
        const titleLines = doc.splitTextToSize(block.title, cw);
        doc.text(titleLines, MARGIN, y);
        y += titleLines.length * 4 + 2;
      }
      // Items
      for (const item of block.items) {
        y = ensureSpace(doc, y, 5);
        doc.setFont(font, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 15, 15);
        const itemLines = doc.splitTextToSize(`   ${item}`, cw - 4);
        doc.text(itemLines, MARGIN + 3, y);
        y += itemLines.length * 4 + 1;
      }
      y += 3;
    }

    hr(doc, y, MARGIN);
    y += 4;
  }

  // ── KETERANGAN + Signature ────────────────────────────────────────────────
  if (template.termsText || template.showSignature) {
    y = ensureSpace(doc, y, 20);

    const termsW = template.showSignature ? cw * 0.62 : cw;
    const sigW   = cw - termsW - 5;
    const sigX   = MARGIN + termsW + 5;

    // Anchor signature boxes at the TOP-RIGHT of the KETERANGAN section so
    // they sit beside the title (not floating at the bottom of the policy).
    const sectionStartY = y;
    if (template.showSignature) {
      const halfSig = sigW / 2 - 2;
      const boxH = 32;
      const headerY = sectionStartY;
      const boxY = headerY + 4;

      doc.setFontSize(7.5);
      doc.setFont(font, "bold");
      doc.setTextColor(acc.r, acc.g, acc.b);
      doc.text("DISETUJUI", sigX + halfSig / 2, headerY, { align: "center" });
      doc.text("YANG MENYATAKAN", sigX + halfSig + 4 + halfSig / 2, headerY, { align: "center" });

      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.3);
      doc.rect(sigX, boxY, halfSig, boxH);
      doc.rect(sigX + halfSig + 4, boxY, halfSig, boxH);

      doc.setFontSize(7);
      doc.setFont(font, "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(template.leftSignatureLabel, sigX + halfSig / 2, boxY + boxH + 4, { align: "center" });
      doc.text(template.rightSignatureLabel, sigX + halfSig + 4 + halfSig / 2, boxY + boxH + 4, { align: "center" });
    }

    if (template.cancellationPolicy || template.termsText) {
      doc.setFontSize(8.5);
      doc.setFont(font, "bold");
      doc.setTextColor(acc.r, acc.g, acc.b);
      doc.text("KETERANGAN", MARGIN, y);
      y += 5;

      if (template.cancellationPolicy) {
        // ── Structured cancellation policy rendering ──
        const policy = template.cancellationPolicy;
        doc.setFont(font, "bold");
        doc.setFontSize(8);
        doc.setTextColor(acc.r, acc.g, acc.b);
        const titleLine = doc.splitTextToSize(policy.name.toUpperCase(), termsW);
        doc.text(titleLine, MARGIN, y);
        y += titleLine.length * 4 + 3;

        for (const section of policy.sections) {
          y = ensureSpace(doc, y, 12);
          doc.setFont(font, "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(acc.r, acc.g, acc.b);
          doc.text(section.title.toUpperCase() + ":", MARGIN, y);
          y += 4;

          doc.setFont(font, "normal");
          doc.setFontSize(7);
          doc.setTextColor(30, 30, 30);
          for (const item of section.items) {
            y = ensureSpace(doc, y, 4);
            // Hanging-indent bullet so wrapped lines stay aligned under the text
            const bulletX = MARGIN + 3;
            const textX = MARGIN + 7;
            const itemLines = doc.splitTextToSize(item, termsW - 10);
            doc.text("•", bulletX, y);
            doc.text(itemLines, textX, y);
            y += itemLines.length * 3.5 + 1.2;
          }
          y += 2;
        }
      } else {
        // ── Free-text terms rendering ──
        doc.setFont(font, "normal");
        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        const termLines = doc.splitTextToSize(template.termsText, termsW);
        doc.text(termLines, MARGIN, y);
        y += termLines.length * 3.5 + 8;
      }
      // Make sure y advances past the signature block too, so footer doesn't collide
      const sigBottom = sectionStartY + 4 + 32 + 6;
      if (y < sigBottom) y = sigBottom;
    } else if (template.showSignature) {
      // Signature only, full width split
      const halfSig = (cw / 2) - 2;
      const centerX = MARGIN + cw / 2;
      const boxH = 30;

      doc.setFontSize(8);
      doc.setFont(font, "bold");
      doc.setTextColor(acc.r, acc.g, acc.b);
      doc.text("DISETUJUI", MARGIN + halfSig / 2, y, { align: "center" });
      doc.text("YANG MENYATAKAN", centerX + 2 + halfSig / 2, y, { align: "center" });
      y += 4;

      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.3);
      doc.rect(MARGIN, y, halfSig, boxH);
      doc.rect(centerX + 2, y, halfSig, boxH);

      y += boxH + 5;
      doc.setFontSize(7.5);
      doc.setFont(font, "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(template.leftSignatureLabel, MARGIN + halfSig / 2, y, { align: "center" });
      doc.text(template.rightSignatureLabel, centerX + 2 + halfSig / 2, y, { align: "center" });
      y += 8;
    }
  }

  // ── LAMPIRAN DAFTAR JAMAAH ────────────────────────────────────────────────
  if (template.showPassengerList && data.passengers.length > 0) {
    doc.addPage();
    addPageBorder();
    let py = MARGIN + 6;

    doc.setFontSize(11);
    doc.setFont(font, "bold");
    doc.setTextColor(acc.r, acc.g, acc.b);
    doc.text("LAMPIRAN DAFTAR JAMAAH", cx, py, { align: "center" });
    py += 6;

    // Sub-header: Transaction code + date
    doc.setFontSize(8);
    doc.setFont(font, "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`${data.transactionCode}  ·  ${fmtDate(data.transactionDate)}`, cx, py, { align: "center" });
    py += 5;

    // Customer name banner
    doc.setFontSize(8.5);
    doc.setFont(font, "bold");
    doc.setTextColor(acc.r, acc.g, acc.b);
    doc.text(`PEMESAN: ${data.customerName.toUpperCase()}`, cx, py, { align: "center" });
    py += 6;

    const passengerRows = data.passengers.map((p, i) => [
      String(i + 1),
      p.name.toUpperCase(),
      p.roomType.toUpperCase(),
      fmtIDR(p.basePrice),
      fmtIDR(p.additionalCost ?? 0),
      fmtIDR(p.discount ?? 0),
      fmtIDR(p.totalBill),
    ]);

    const grandTotal = data.passengers.reduce((s, p) => s + (p.totalBill || 0), 0);

    autoTable(doc, {
      startY: py,
      head: [["NO", "NAMA", "JENIS KAMAR", "HARGA PAKET", "BIAYA TAMBAHAN", "DISKON", "TOTAL TAGIHAN"]],
      body: passengerRows,
      foot: [[
        { content: `TOTAL (${data.passengers.length} JAMAAH)`, colSpan: 6, styles: { halign: "right", fontStyle: "bold", fillColor: [acc.r, acc.g, acc.b], textColor: [255, 255, 255] } },
        { content: fmtIDR(grandTotal), styles: { halign: "right", fontStyle: "bold", fillColor: [acc.r, acc.g, acc.b], textColor: [255, 255, 255] } },
      ]],
      styles: { fontSize: 7.5, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.2, font },
      headStyles: { fillColor: [acc.r, acc.g, acc.b], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
        6: { cellWidth: 32, halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: MARGIN, right: MARGIN },
    });

    // Footer page 2
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 6;
    if (template.footerText) {
      doc.setFontSize(7.5);
      doc.setFont(font, "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(template.footerText, cx, finalY, { align: "center" });
    }
  }

  // ── Global footer on every page ───────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.height;
    drawPaymentWatermark(doc, {
      status: data.paymentStatus,
      enabled: data.showWatermark !== false,
      font,
    });
    doc.setFontSize(7);
    doc.setFont(font, "normal");
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Dicetak: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: idLocale })}`,
      MARGIN + 1,
      ph - 6
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, pw - MARGIN - 1, ph - 6, { align: "right" });
  }

  return doc;
}
