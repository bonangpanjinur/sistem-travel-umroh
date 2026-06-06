import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardingPassPassenger {
  full_name:        string;
  passport_number?: string | null;
  nationality?:     string | null;
  birth_date?:      string | null;
  passenger_type:   'adult' | 'child' | 'infant';
  room_type?:       string | null;
  room_number?:     string | null;
  seat_number?:     string | null;
  gender?:          string | null;
}

export interface BoardingPassData {
  booking_code:    string;
  package_name?:   string | null;
  package_type?:   string | null;   // 'umrah' | 'haji' | 'wisata'
  departure_date?: string | null;
  return_date?:    string | null;
  duration_days?:  number | null;
  airline_name?:   string | null;
  airline_code?:   string | null;
  flight_number?:  string | null;
  hotel_makkah?:   string | null;
  hotel_madinah?:  string | null;
  public_token?:   string | null;   // for QR URL
  company_name?:   string | null;
  company_phone?:  string | null;
  company_logo?:   string | null;   // base64 or URL
  accent_color?:   string;          // hex, default teal
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : { r: 20, g: 150, b: 120 };
}

function roomTypeLabel(rt?: string | null): string {
  const map: Record<string, string> = {
    single: 'Single', double: 'Double', triple: 'Triple',
    quad: 'Quad', quint: 'Quint',
  };
  return rt ? (map[rt.toLowerCase()] ?? rt) : '—';
}

function paxTypeLabel(pt: string): string {
  return pt === 'adult' ? 'Dewasa' : pt === 'child' ? 'Anak' : 'Bayi';
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy', { locale: localeId }); }
  catch { return d; }
}

async function getQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 200, margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

// ─── Single boarding pass on one jsPDF page ────────────────────────────────────

const W  = 210; // mm (A5 landscape width)
const H  = 110; // mm custom height — feels like a real boarding pass

/**
 * Generate a single boarding pass PDF page.
 * Returns a jsPDF doc with one page.
 */
export async function generateBoardingPassPage(
  doc: jsPDF,
  passenger: BoardingPassPassenger,
  data: BoardingPassData,
  isFirstPage = true,
): Promise<void> {
  if (!isFirstPage) doc.addPage([W, H], 'landscape');

  const accent = hexToRgb(data.accent_color || '#0d9488'); // teal-600
  const darkNavy = { r: 15, g: 23, b: 42 };
  const gray     = { r: 100, g: 116, b: 139 };
  const lightBg  = { r: 248, g: 250, b: 252 };

  const divX = 130; // x where right column starts (mm)
  const qrX  = W - 32; // QR right margin area centre

  // ── Background ──────────────────────────────────────────────────────────────
  // Main white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Header strip
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, 0, W, 14, 'F');

  // Right column subtle bg
  doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
  doc.rect(divX, 0, W - divX, H, 'F');

  // Dashed vertical separator
  doc.setDrawColor(200, 210, 220);
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.4);
  doc.line(divX, 0, divX, H);
  doc.setLineDashPattern([], 0);

  // ── Header ───────────────────────────────────────────────────────────────────
  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(data.company_name || 'Vinstour Travel', 7, 9);

  // E-BOARDING PASS label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('E-BOARDING PASS', W - 8, 9, { align: 'right' });

  // ── Left column: passenger info ──────────────────────────────────────────────
  const leftPad = 7;
  let y = 22;

  const drawLabel = (label: string, value: string, cx: number, cy: number, maxW = 50) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray.r, gray.g, gray.b);
    doc.text(label.toUpperCase(), cx, cy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy.r, darkNavy.g, darkNavy.b);
    const lines = doc.splitTextToSize(value || '—', maxW);
    doc.text(lines[0] || '—', cx, cy + 5);
    return cy + 5 + 5;
  };

  // Passenger name — big
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray.r, gray.g, gray.b);
  doc.text('NAMA PENUMPANG', leftPad, y);
  y += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy.r, darkNavy.g, darkNavy.b);
  const nameLine = doc.splitTextToSize((passenger.full_name || '—').toUpperCase(), 118);
  doc.text(nameLine[0] || '—', leftPad, y);
  y += 10;

  // Row 1: Passport no + Nationality
  drawLabel('No. Paspor', passenger.passport_number || '—', leftPad, y, 45);
  drawLabel('Kebangsaan', passenger.nationality || 'INDONESIA', leftPad + 52, y, 40);
  y += 13;

  // Row 2: Pax type + Room
  const roomVal = passenger.room_number
    ? `${roomTypeLabel(passenger.room_type)} (No. ${passenger.room_number})`
    : roomTypeLabel(passenger.room_type);
  drawLabel('Tipe Penumpang', paxTypeLabel(passenger.passenger_type), leftPad, y, 45);
  drawLabel('Kamar', roomVal, leftPad + 52, y, 58);
  y += 13;

  // Row 3: Seat + Package name
  if (passenger.seat_number) {
    drawLabel('Kursi', passenger.seat_number, leftPad, y, 45);
  }
  if (data.package_name) {
    drawLabel('Paket', data.package_name, passenger.seat_number ? leftPad + 52 : leftPad, y, 70);
  }
  y += 13;

  // Booking code box
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.roundedRect(leftPad, y, 55, 10, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('KODE BOOKING', leftPad + 4, y + 3.5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.booking_code, leftPad + 4, y + 8.5);

  // ── Footer strip ─────────────────────────────────────────────────────────────
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, H - 8, divX, 8, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  const footerText = [
    data.company_phone ? `📞 ${data.company_phone}` : '',
    'Dokumen resmi perjalanan ibadah Anda',
  ].filter(Boolean).join('  ·  ');
  doc.text(footerText, leftPad, H - 2.5);

  // ── Right column: flight info ────────────────────────────────────────────────
  const rPad = divX + 6;
  let ry = 20;

  const drawRightField = (label: string, value: string, cy: number) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray.r, gray.g, gray.b);
    doc.text(label.toUpperCase(), rPad, cy);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy.r, darkNavy.g, darkNavy.b);
    const val = doc.splitTextToSize(value || '—', W - rPad - 34);
    doc.text(val[0] || '—', rPad, cy + 4.5);
  };

  const rightFields: { label: string; value: string }[] = [];

  if (data.airline_name)   rightFields.push({ label: 'Maskapai',      value: data.airline_name });
  if (data.flight_number)  rightFields.push({ label: 'No. Penerbangan', value: data.flight_number });
  rightFields.push({ label: 'Berangkat', value: fmtDate(data.departure_date) });
  if (data.return_date)    rightFields.push({ label: 'Kembali',        value: fmtDate(data.return_date) });
  if (data.duration_days)  rightFields.push({ label: 'Durasi',         value: `${data.duration_days} Hari` });
  if (data.hotel_makkah)   rightFields.push({ label: 'Hotel Makkah',   value: data.hotel_makkah });
  if (data.hotel_madinah)  rightFields.push({ label: 'Hotel Madinah',  value: data.hotel_madinah });

  for (const f of rightFields) {
    if (ry > H - 30) break; // don't overflow
    drawRightField(f.label, f.value, ry);
    ry += 12;
  }

  // ── QR Code ──────────────────────────────────────────────────────────────────
  const qrContent = data.public_token
    ? `${window.location.origin}/transaksi/${data.public_token}`
    : `${data.booking_code}|${passenger.passport_number || ''}|${passenger.full_name}`;

  try {
    const qrDataUrl = await getQRDataUrl(qrContent);
    const qrSize = 28;
    const qrLeft = W - qrSize - 5;
    const qrTop  = H - qrSize - 12;
    doc.addImage(qrDataUrl, 'PNG', qrLeft, qrTop, qrSize, qrSize);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray.r, gray.g, gray.b);
    doc.text('Scan untuk verifikasi', qrLeft + qrSize / 2, qrTop + qrSize + 3, { align: 'center' });
  } catch { /* QR generation failed, skip */ }

  // ── Right footer strip ────────────────────────────────────────────────────────
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(divX, H - 8, W - divX, 8, 'F');
  const purposeLabel = data.package_type === 'haji'
    ? 'IBADAH HAJI'
    : data.package_type === 'wisata'
    ? 'WISATA'
    : 'IBADAH UMRAH';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(purposeLabel, (divX + W) / 2, H - 2.5, { align: 'center' });
}

/**
 * Generate a single-passenger boarding pass PDF.
 * Returns a jsPDF doc with one page ready to save/download.
 */
export async function generateSingleBoardingPass(
  passenger: BoardingPassPassenger,
  data: BoardingPassData,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });
  await generateBoardingPassPage(doc, passenger, data, true);
  return doc;
}

/**
 * Generate a multi-passenger boarding pass PDF (one page per pax).
 */
export async function generateBulkBoardingPass(
  passengers: BoardingPassPassenger[],
  data: BoardingPassData,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });
  for (let i = 0; i < passengers.length; i++) {
    await generateBoardingPassPage(doc, passengers[i], data, i === 0);
  }
  return doc;
}
