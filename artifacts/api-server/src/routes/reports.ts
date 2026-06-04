import { Router, type Request, type Response } from 'express';
import { pool } from '../lib/db.js';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const router = Router();

async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } catch (err: any) {
    console.error('[reports] DB error:', err?.message);
    return [];
  } finally {
    client.release();
  }
}

function formatRp(n: number): string {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function formatDate(s: string | null): string {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

// ─── XLSX helper ─────────────────────────────────────────────────────────────
function sendXlsx(res: Response, filename: string, sheets: { name: string; rows: Record<string, any>[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
}

// ─── PDF helper ──────────────────────────────────────────────────────────────
function buildPdf(
  res: Response,
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  colWidths: number[],
) {
  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Header block
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
  doc.fontSize(9).font('Helvetica').fillColor('#555').text(subtitle);
  doc.moveDown(0.4);
  doc.fontSize(8).fillColor('#888').text(`Diekspor: ${new Date().toLocaleString('id-ID')}`);
  doc.moveDown(0.6);

  const pageWidth = doc.page.width - 72;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const norm = colWidths.map(w => Math.round((w / totalW) * pageWidth));

  // Draw table header
  let x = 36;
  const headerY = doc.y;
  doc.rect(36, headerY, pageWidth, 16).fill('#4f46e5');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
  headers.forEach((h, i) => {
    doc.text(h, x + 3, headerY + 4, { width: norm[i]! - 4, ellipsis: true });
    x += norm[i]!;
  });

  // Draw table rows
  doc.font('Helvetica').fillColor('#111');
  let y = headerY + 18;
  rows.forEach((row, ri) => {
    if (y + 14 > doc.page.height - 36) {
      doc.addPage({ margin: 36, size: 'A4', layout: 'landscape' });
      y = 36;
    }
    if (ri % 2 === 0) {
      doc.rect(36, y - 2, pageWidth, 14).fill('#f5f3ff');
    }
    x = 36;
    doc.fillColor('#111').fontSize(7.5);
    row.forEach((cell, i) => {
      doc.text(String(cell ?? '-'), x + 3, y, { width: norm[i]! - 4, ellipsis: true });
      x += norm[i]!;
    });
    y += 14;
  });

  doc.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export
// Query params:
//   type    = keuangan | manifest | bookings | agen | payments
//   format  = xlsx | pdf
//   year    = 2024              (keuangan)
//   departure_id = UUID         (manifest, bookings)
//   status  = all|pending|…    (bookings)
//   period  = all|3m|6m|1y     (agen)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export', async (req: Request, res: Response) => {
  const type   = String(req.query.type   || 'keuangan');
  const format = String(req.query.format || 'xlsx');

  try {
    if (type === 'keuangan') {
      await exportKeuangan(req, res, format);
    } else if (type === 'manifest') {
      await exportManifest(req, res, format);
    } else if (type === 'bookings') {
      await exportBookings(req, res, format);
    } else if (type === 'agen') {
      await exportAgen(req, res, format);
    } else if (type === 'payments') {
      await exportPayments(req, res, format);
    } else {
      res.status(400).json({ success: false, error: `Tipe laporan tidak dikenal: ${type}` });
    }
  } catch (err: any) {
    console.error('[reports/export]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err?.message || 'Internal error' });
    }
  }
});

// ─── 1. Laporan Keuangan ─────────────────────────────────────────────────────
async function exportKeuangan(req: Request, res: Response, format: string) {
  const year = String(req.query.year || new Date().getFullYear());

  const payments = await dbQuery(`
    SELECT
      DATE_TRUNC('month', created_at) AS month,
      COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS terkumpul,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)  AS pending
    FROM payments
    WHERE EXTRACT(year FROM created_at) = $1::int
    GROUP BY 1 ORDER BY 1
  `, [year]);

  const bookings = await dbQuery(`
    SELECT
      DATE_TRUNC('month', created_at) AS month,
      COUNT(*) AS jumlah_booking,
      COALESCE(SUM(total_price), 0) AS total_pendapatan,
      COALESCE(SUM(paid_amount), 0) AS sudah_bayar
    FROM bookings
    WHERE EXTRACT(year FROM created_at) = $1::int
      AND status NOT IN ('cancelled', 'rejected')
    GROUP BY 1 ORDER BY 1
  `, [year]);

  const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const monthlyRows = Array.from({ length: 12 }, (_, mi) => {
    const m = mi + 1;
    const p = payments.find(r => new Date(r.month).getMonth() + 1 === m);
    const b = bookings.find(r => new Date(r.month).getMonth() + 1 === m);
    return {
      'Bulan': MONTHS_ID[mi],
      'Jumlah Booking': Number(b?.jumlah_booking || 0),
      'Total Pendapatan': Number(b?.total_pendapatan || 0),
      'Sudah Terkumpul': Number(p?.terkumpul || b?.sudah_bayar || 0),
      'Outstanding': Number(b?.total_pendapatan || 0) - Number(p?.terkumpul || b?.sudah_bayar || 0),
      'Pembayaran Pending': Number(p?.pending || 0),
    };
  });

  const totals = monthlyRows.reduce((acc, r) => ({
    ...acc,
    'Jumlah Booking': acc['Jumlah Booking'] + r['Jumlah Booking'],
    'Total Pendapatan': acc['Total Pendapatan'] + r['Total Pendapatan'],
    'Sudah Terkumpul': acc['Sudah Terkumpul'] + r['Sudah Terkumpul'],
    'Outstanding': acc['Outstanding'] + r['Outstanding'],
    'Pembayaran Pending': acc['Pembayaran Pending'] + r['Pembayaran Pending'],
  }), { 'Bulan': 'TOTAL', 'Jumlah Booking': 0, 'Total Pendapatan': 0, 'Sudah Terkumpul': 0, 'Outstanding': 0, 'Pembayaran Pending': 0 });

  const filename = `laporan-keuangan-${year}`;

  if (format === 'pdf') {
    buildPdf(
      res, `${filename}.pdf`,
      `Laporan Keuangan ${year}`,
      `Total Pendapatan: ${formatRp(totals['Total Pendapatan'])}  |  Terkumpul: ${formatRp(totals['Sudah Terkumpul'])}`,
      ['Bulan','Booking','Pendapatan (Rp)','Terkumpul (Rp)','Outstanding (Rp)','Pending (Rp)'],
      monthlyRows.map(r => [r['Bulan'], String(r['Jumlah Booking']), formatRp(r['Total Pendapatan']), formatRp(r['Sudah Terkumpul']), formatRp(r['Outstanding']), formatRp(r['Pembayaran Pending'])]),
      [60, 50, 110, 110, 110, 110],
    );
  } else {
    sendXlsx(res, `${filename}.xlsx`, [{ name: 'Keuangan', rows: [...monthlyRows, totals as any] }]);
  }
}

// ─── 2. Manifest Jamaah ───────────────────────────────────────────────────────
async function exportManifest(req: Request, res: Response, format: string) {
  const departureId = String(req.query.departure_id || '');

  const where = departureId && departureId !== 'all'
    ? `AND b.departure_id = $1`
    : '';
  const params = departureId && departureId !== 'all' ? [departureId] : [];

  const rows = await dbQuery(`
    SELECT
      b.booking_code,
      b.status AS booking_status,
      b.total_price,
      b.paid_amount,
      b.pax_count,
      b.created_at,
      c.full_name,
      c.phone,
      c.email,
      c.national_id_number AS nik,
      c.gender,
      c.date_of_birth,
      c.passport_number,
      c.passport_expiry_date,
      d.departure_date,
      d.return_date,
      pkg.name AS package_name
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    LEFT JOIN departures d ON d.id = b.departure_id
    LEFT JOIN packages pkg ON pkg.id = d.package_id
    WHERE b.status NOT IN ('cancelled','rejected')
    ${where}
    ORDER BY d.departure_date ASC, c.full_name ASC
  `, params);

  const depLabel = rows.length > 0
    ? `${rows[0].package_name || ''} — ${formatDate(rows[0].departure_date)}`
    : (departureId !== 'all' ? departureId : 'Semua Keberangkatan');

  const dataRows = rows.map((r, i) => ({
    'No': i + 1,
    'Kode Booking': r.booking_code || '-',
    'Nama Lengkap': r.full_name || '-',
    'No HP': r.phone || '-',
    'Email': r.email || '-',
    'NIK': r.nik || '-',
    'Gender': r.gender === 'male' ? 'L' : r.gender === 'female' ? 'P' : '-',
    'Tgl Lahir': formatDate(r.date_of_birth),
    'No Paspor': r.passport_number || '-',
    'Exp Paspor': formatDate(r.passport_expiry_date),
    'Paket': r.package_name || '-',
    'Tgl Berangkat': formatDate(r.departure_date),
    'Tgl Kembali': formatDate(r.return_date),
    'Pax': r.pax_count || 1,
    'Total (Rp)': r.total_price || 0,
    'Bayar (Rp)': r.paid_amount || 0,
    'Sisa (Rp)': (r.total_price || 0) - (r.paid_amount || 0),
    'Status': r.booking_status,
  }));

  const filename = `manifest-jamaah-${new Date().toISOString().split('T')[0]}`;

  if (format === 'pdf') {
    buildPdf(
      res, `${filename}.pdf`,
      `Manifest Jamaah — ${depLabel}`,
      `Total: ${dataRows.length} jamaah  |  Diekspor: ${new Date().toLocaleString('id-ID')}`,
      ['No','Kode','Nama','No HP','NIK','Gender','No Paspor','Paket','Berangkat','Kembali','Pax','Total','Bayar','Status'],
      dataRows.map(r => [
        String(r['No']), r['Kode Booking'], r['Nama Lengkap'], r['No HP'], r['NIK'],
        r['Gender'], r['No Paspor'], r['Paket'], r['Tgl Berangkat'], r['Tgl Kembali'],
        String(r['Pax']), formatRp(r['Total (Rp)']), formatRp(r['Bayar (Rp)']), r['Status'],
      ]),
      [22, 70, 95, 65, 75, 32, 70, 80, 58, 58, 22, 72, 72, 55],
    );
  } else {
    sendXlsx(res, `${filename}.xlsx`, [{ name: 'Manifest', rows: dataRows }]);
  }
}

// ─── 3. Laporan Bookings ──────────────────────────────────────────────────────
async function exportBookings(req: Request, res: Response, format: string) {
  const status      = String(req.query.status || 'all');
  const departureId = String(req.query.departure_id || 'all');

  const conditions: string[] = [];
  const params: any[] = [];
  if (status !== 'all') { params.push(status); conditions.push(`b.status = $${params.length}`); }
  if (departureId !== 'all') { params.push(departureId); conditions.push(`b.departure_id = $${params.length}`); }
  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const rows = await dbQuery(`
    SELECT
      b.booking_code, b.status, b.total_price, b.paid_amount, b.pax_count, b.created_at,
      c.full_name, c.phone,
      pkg.name AS package_name,
      d.departure_date
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    LEFT JOIN departures d ON d.id = b.departure_id
    LEFT JOIN packages pkg ON pkg.id = d.package_id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT 5000
  `, params);

  const dataRows = rows.map((r, i) => ({
    'No': i + 1,
    'Kode Booking': r.booking_code || '-',
    'Nama Jamaah': r.full_name || '-',
    'No HP': r.phone || '-',
    'Paket': r.package_name || '-',
    'Tgl Keberangkatan': formatDate(r.departure_date),
    'Status': r.status,
    'Pax': r.pax_count || 1,
    'Total (Rp)': r.total_price || 0,
    'Bayar (Rp)': r.paid_amount || 0,
    'Sisa (Rp)': (r.total_price || 0) - (r.paid_amount || 0),
    'Tgl Booking': formatDate(r.created_at),
  }));

  const total = dataRows.reduce((s, r) => s + r['Total (Rp)'], 0);
  const filename = `laporan-bookings-${new Date().toISOString().split('T')[0]}`;

  if (format === 'pdf') {
    buildPdf(
      res, `${filename}.pdf`,
      'Laporan Daftar Booking',
      `Total ${dataRows.length} booking  |  Total Pendapatan: ${formatRp(total)}`,
      ['No','Kode','Nama','No HP','Paket','Berangkat','Status','Pax','Total','Bayar','Sisa'],
      dataRows.map(r => [
        String(r['No']), r['Kode Booking'], r['Nama Jamaah'], r['No HP'],
        r['Paket'], r['Tgl Keberangkatan'], r['Status'], String(r['Pax']),
        formatRp(r['Total (Rp)']), formatRp(r['Bayar (Rp)']), formatRp(r['Sisa (Rp)']),
      ]),
      [22, 70, 90, 60, 80, 58, 52, 22, 72, 72, 72],
    );
  } else {
    sendXlsx(res, `${filename}.xlsx`, [{ name: 'Bookings', rows: dataRows }]);
  }
}

// ─── 4. Laporan Agen ──────────────────────────────────────────────────────────
async function exportAgen(req: Request, res: Response, format: string) {
  const period = String(req.query.period || 'all');
  let periodStart: string | null = null;
  if (period === '3m') periodStart = new Date(Date.now() - 90 * 86400000).toISOString();
  if (period === '6m') periodStart = new Date(Date.now() - 180 * 86400000).toISOString();
  if (period === '1y') periodStart = new Date(Date.now() - 365 * 86400000).toISOString();

  const params: any[] = [];
  const periodFilter = periodStart ? (params.push(periodStart), `AND b.created_at >= $${params.length}`) : '';

  const rows = await dbQuery(`
    SELECT
      ag.company_name,
      ag.phone,
      ag.commission_rate,
      COUNT(b.id) AS booking_count,
      COALESCE(SUM(b.total_price) FILTER (WHERE b.status NOT IN ('cancelled','rejected')), 0) AS total_revenue,
      COALESCE(SUM(b.total_price * ag.commission_rate / 100) FILTER (WHERE b.status NOT IN ('cancelled','rejected')), 0) AS total_commission
    FROM agents ag
    LEFT JOIN bookings b ON b.agent_id = ag.id ${periodFilter}
    GROUP BY ag.id, ag.company_name, ag.phone, ag.commission_rate
    ORDER BY total_revenue DESC
  `, params);

  const dataRows = rows.map((r, i) => ({
    'No': i + 1,
    'Nama Agen': r.company_name || '-',
    'No HP': r.phone || '-',
    'Komisi (%)': Number(r.commission_rate || 0),
    'Jumlah Booking': Number(r.booking_count || 0),
    'Total Revenue (Rp)': Number(r.total_revenue || 0),
    'Total Komisi (Rp)': Number(r.total_commission || 0),
  }));

  const filename = `laporan-agen-${new Date().toISOString().split('T')[0]}`;
  const totalRev = dataRows.reduce((s, r) => s + r['Total Revenue (Rp)'], 0);

  if (format === 'pdf') {
    buildPdf(
      res, `${filename}.pdf`,
      'Laporan Performa Agen',
      `Total ${dataRows.length} agen  |  Total Revenue: ${formatRp(totalRev)}`,
      ['No','Nama Agen','No HP','Komisi %','Booking','Revenue','Komisi (Rp)'],
      dataRows.map(r => [
        String(r['No']), r['Nama Agen'], r['No HP'],
        r['Komisi (%)'] + '%', String(r['Jumlah Booking']),
        formatRp(r['Total Revenue (Rp)']), formatRp(r['Total Komisi (Rp)']),
      ]),
      [22, 130, 80, 50, 50, 90, 90],
    );
  } else {
    sendXlsx(res, `${filename}.xlsx`, [{ name: 'Agen', rows: dataRows }]);
  }
}

// ─── 5. Laporan Pembayaran ────────────────────────────────────────────────────
async function exportPayments(req: Request, res: Response, format: string) {
  const status = String(req.query.status || 'all');
  const params: any[] = [];
  const where = status !== 'all' ? (params.push(status), `WHERE p.status = $1`) : '';

  const rows = await dbQuery(`
    SELECT
      p.id,
      p.amount,
      p.status,
      p.payment_method,
      p.payment_date,
      p.created_at,
      p.reference_number,
      b.booking_code,
      c.full_name,
      c.phone
    FROM payments p
    LEFT JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN customers c ON c.id = b.customer_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT 5000
  `, params);

  const dataRows = rows.map((r, i) => ({
    'No': i + 1,
    'Ref': r.reference_number || '-',
    'Kode Booking': r.booking_code || '-',
    'Nama Jamaah': r.full_name || '-',
    'No HP': r.phone || '-',
    'Jumlah (Rp)': Number(r.amount || 0),
    'Metode': r.payment_method || '-',
    'Status': r.status,
    'Tgl Bayar': formatDate(r.payment_date || r.created_at),
    'Input': formatDate(r.created_at),
  }));

  const total = dataRows.reduce((s, r) => s + r['Jumlah (Rp)'], 0);
  const filename = `laporan-pembayaran-${new Date().toISOString().split('T')[0]}`;

  if (format === 'pdf') {
    buildPdf(
      res, `${filename}.pdf`,
      'Laporan Pembayaran',
      `Total ${dataRows.length} transaksi  |  Total: ${formatRp(total)}`,
      ['No','Ref','Kode Booking','Nama','No HP','Jumlah','Metode','Status','Tgl Bayar'],
      dataRows.map(r => [
        String(r['No']), r['Ref'], r['Kode Booking'], r['Nama Jamaah'], r['No HP'],
        formatRp(r['Jumlah (Rp)']), r['Metode'], r['Status'], r['Tgl Bayar'],
      ]),
      [22, 70, 70, 100, 65, 80, 60, 55, 70],
    );
  } else {
    sendXlsx(res, `${filename}.xlsx`, [{ name: 'Pembayaran', rows: dataRows }]);
  }
}

export default router;
