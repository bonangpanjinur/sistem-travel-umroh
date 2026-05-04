import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Company info interface
interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  city?: string;
}

// Letter data interfaces
// Surat Cuti Karyawan
interface EmployeeLeaveLetterData {
  employeeName: string;
  employeePosition: string;
  employeeNik: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  destination?: string;
}

// Surat Cuti Jamaah (untuk keperluan ibadah Umrah/Haji)
interface JamaahLeaveLetterData {
  jamaahName: string;
  nik: string;
  birthPlace: string;
  birthDate: Date;
  address: string;
  employerName: string;
  employerPosition?: string;
  employerInstitution: string;
  employerAddress: string;
  startDate: Date;
  endDate: Date;
  purpose: string; // Umrah/Haji
  departureDate?: Date;
}

// Legacy alias for backward compatibility
interface LeaveLetterData extends EmployeeLeaveLetterData {}

interface PassportLetterData {
  customerName: string;
  nik: string;
  birthPlace: string;
  birthDate: Date;
  address: string;
  phone: string;
  purpose: string;
  departureDate?: Date;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customer: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  notes?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

interface GeneralLetterData {
  letterNumber: string;
  letterDate: Date;
  recipient: {
    name: string;
    position?: string;
    institution?: string;
    address?: string;
  };
  subject: string;
  content: string;
  signatory: {
    name: string;
    position: string;
  };
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'PT. Umrah Haji Travel',
  address: 'Jl. Raya Utama No. 123, Jakarta Selatan 12345',
  phone: '(021) 1234-5678',
  email: 'info@umrahhaji.com',
  website: 'www.umrahhaji.com'
};

// Helper to add letterhead
function addLetterhead(doc: jsPDF, company: CompanyInfo = defaultCompanyInfo) {
  const pageWidth = doc.internal.pageSize.width;
  
  // Company name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, 20, { align: 'center' });
  
  // Company details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(company.address, pageWidth / 2, 27, { align: 'center' });
  doc.text(`Telp: ${company.phone} | Email: ${company.email}`, pageWidth / 2, 33, { align: 'center' });
  if (company.website) {
    doc.text(company.website, pageWidth / 2, 39, { align: 'center' });
  }
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(14, 45, pageWidth - 14, 45);
  doc.setLineWidth(0.2);
  doc.line(14, 46, pageWidth - 14, 46);
  
  return 55; // Return starting Y position for content
}

// Helper to add footer
function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Dicetak pada: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`,
    14,
    pageHeight - 10
  );
  doc.text(
    `Halaman ${pageNum} dari ${totalPages}`,
    pageWidth - 14,
    pageHeight - 10,
    { align: 'right' }
  );
  doc.setTextColor(0);
}

// Generate Employee Leave Letter (Surat Cuti Karyawan)
export function generateLeaveLetter(
  data: LeaveLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text('Lampiran: -', pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text('Perihal: Permohonan Cuti Karyawan', pageWidth - 14, y, { align: 'right' });
  
  y += 15;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PERMOHONAN CUTI KARYAWAN', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const content = `Yang bertanda tangan di bawah ini:

Nama                : ${data.employeeName}
NIK/NIP            : ${data.employeeNik}
Jabatan            : ${data.employeePosition}

Dengan ini mengajukan permohonan cuti kerja terhitung mulai:

Tanggal Mulai      : ${format(data.startDate, 'd MMMM yyyy', { locale: id })}
Tanggal Selesai    : ${format(data.endDate, 'd MMMM yyyy', { locale: id })}
Alasan Cuti        : ${data.reason}${data.destination ? `\nTujuan/Alamat      : ${data.destination}` : ''}

Demikian surat permohonan cuti ini saya ajukan. Atas perhatian dan persetujuan Bapak/Ibu, saya ucapkan terima kasih.`;

  const lines = doc.splitTextToSize(content, pageWidth - 28);
  doc.text(lines, 14, y);
  
  y += lines.length * 6 + 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
  y += 6;
  doc.text('Hormat saya,', pageWidth - 60, y);
  y += 25;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeName, pageWidth - 60, y);
  
  // Approval section
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.text('Disetujui oleh:', 14, y);
  y += 25;
  doc.text('_______________________', 14, y);
  y += 5;
  doc.text('Atasan Langsung', 14, y);
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// Generate Jamaah Leave Letter (Surat Keterangan Cuti Ibadah Umrah/Haji)
export function generateJamaahLeaveLetter(
  data: JamaahLeaveLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: Fotokopi KTP, Paspor', 14, y);
  y += 6;
  doc.text(`Perihal: Permohonan Izin Cuti ${data.purpose}`, 14, y);
  
  y += 12;
  
  // Recipient (Employer)
  doc.text('Kepada Yth.', 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employerName, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  if (data.employerPosition) {
    doc.text(data.employerPosition, 14, y);
    y += 6;
  }
  doc.text(data.employerInstitution, 14, y);
  y += 6;
  doc.text(`di ${data.employerAddress}`, 14, y);
  
  y += 15;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT KETERANGAN CUTI IBADAH', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const content = `Dengan hormat,

Yang bertanda tangan di bawah ini, Direktur ${company.name}, dengan ini menerangkan bahwa:

Nama Lengkap       : ${data.jamaahName}
NIK                : ${data.nik}
Tempat/Tgl Lahir   : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}
Alamat             : ${data.address}

Adalah calon jamaah ${data.purpose} yang terdaftar di ${company.name} dan akan menunaikan ibadah ${data.purpose} ke Tanah Suci dengan jadwal sebagai berikut:

Tanggal Berangkat  : ${format(data.startDate, 'd MMMM yyyy', { locale: id })}
Tanggal Kembali    : ${format(data.endDate, 'd MMMM yyyy', { locale: id })}

Sehubungan dengan hal tersebut, kami mohon kesediaan Bapak/Ibu untuk dapat memberikan izin cuti kepada yang bersangkutan selama menunaikan ibadah ${data.purpose}.

Demikian surat keterangan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;

  const lines = doc.splitTextToSize(content, pageWidth - 28);
  doc.text(lines, 14, y);
  
  y += lines.length * 5 + 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y);
  y += 6;
  doc.text('Hormat kami,', pageWidth - 70, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth - 70, y);
  y += 25;
  doc.text('___________________', pageWidth - 70, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Direktur', pageWidth - 70, y);
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// Generate Passport Request Letter (Surat Permohonan Paspor)
export function generatePassportLetter(
  data: PassportLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: Fotokopi KTP, KK, Akta Lahir', 14, y);
  y += 6;
  doc.text('Perihal: Permohonan Pembuatan Paspor', 14, y);
  
  y += 12;
  
  // Recipient
  doc.text('Kepada Yth.', 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Kantor Imigrasi', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('di Tempat', 14, y);
  
  y += 15;
  
  // Content
  const content = `Dengan hormat,

Yang bertanda tangan di bawah ini, Direktur ${company.name}, dengan ini mengajukan permohonan pembuatan paspor untuk keperluan perjalanan ibadah Umrah/Haji atas nama:

Nama Lengkap       : ${data.customerName}
NIK                : ${data.nik}
Tempat/Tgl Lahir   : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}
Alamat             : ${data.address}
No. Telepon        : ${data.phone}
Tujuan Perjalanan  : ${data.purpose}${data.departureDate ? `\nRencana Berangkat  : ${format(data.departureDate, 'd MMMM yyyy', { locale: id })}` : ''}

Yang bersangkutan adalah calon jamaah yang telah terdaftar di ${company.name} dan memerlukan paspor untuk keperluan perjalanan ibadah ke Tanah Suci.

Bersama ini kami lampirkan dokumen pendukung:
1. Fotokopi KTP
2. Fotokopi Kartu Keluarga
3. Fotokopi Akta Kelahiran
4. Pas Foto 4x6 (latar belakang putih)

Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;

  const lines = doc.splitTextToSize(content, pageWidth - 28);
  doc.text(lines, 14, y);
  
  y += lines.length * 5 + 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y);
  y += 6;
  doc.text('Hormat kami,', pageWidth - 70, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth - 70, y);
  y += 25;
  doc.text('___________________', pageWidth - 70, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Direktur', pageWidth - 70, y);
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// Generate Invoice
export function generateInvoice(
  data: InvoiceData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Invoice Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Invoice details (left) and Customer (right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Left side - Invoice info
  doc.text(`No. Invoice: ${data.invoiceNumber}`, 14, y);
  doc.text(`Tanggal: ${format(data.invoiceDate, 'd MMMM yyyy', { locale: id })}`, 14, y + 6);
  doc.text(`Jatuh Tempo: ${format(data.dueDate, 'd MMMM yyyy', { locale: id })}`, 14, y + 12);
  
  // Right side - Customer info
  doc.setFont('helvetica', 'bold');
  doc.text('Kepada:', pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customer.name, pageWidth - 80, y + 6);
  const addressLines = doc.splitTextToSize(data.customer.address, 65);
  doc.text(addressLines, pageWidth - 80, y + 12);
  doc.text(`Telp: ${data.customer.phone}`, pageWidth - 80, y + 12 + addressLines.length * 5);
  
  y += 35;
  
  // Items table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['No', 'Deskripsi', 'Qty', 'Harga Satuan', 'Total']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    }
  });
  
  // @ts-ignore - lastAutoTable is added by jspdf-autotable
  y = doc.lastAutoTable.finalY + 10;
  
  // Totals
  const totalsX = pageWidth - 80;
  doc.text('Subtotal:', totalsX, y);
  doc.text(formatCurrency(data.subtotal), pageWidth - 14, y, { align: 'right' });
  y += 6;
  
  if (data.discount) {
    doc.text('Diskon:', totalsX, y);
    doc.text(`-${formatCurrency(data.discount)}`, pageWidth - 14, y, { align: 'right' });
    y += 6;
  }
  
  if (data.tax) {
    doc.text('PPN (11%):', totalsX, y);
    doc.text(formatCurrency(data.tax), pageWidth - 14, y, { align: 'right' });
    y += 6;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, y + 3);
  doc.text(formatCurrency(data.total), pageWidth - 14, y + 3, { align: 'right' });
  
  y += 20;
  
  // Bank info
  const bankInfo = data.bankInfo;
  if (bankInfo) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Pembayaran dapat ditransfer ke:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank: ${bankInfo.bankName}`, 14, y);
    y += 5;
    doc.text(`No. Rekening: ${bankInfo.accountNumber}`, 14, y);
    y += 5;
    doc.text(`Atas Nama: ${bankInfo.accountName}`, 14, y);
  }
  
  // Notes
  if (data.notes) {
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 28);
    doc.text(noteLines, 14, y);
  }
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// Generate General Letter (Surat Umum)
export function generateGeneralLetter(
  data: GeneralLetterData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${data.letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(data.letterDate, 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: -', 14, y);
  y += 6;
  doc.text(`Perihal: ${data.subject}`, 14, y);
  
  y += 12;
  
  // Recipient
  doc.text('Kepada Yth.', 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(data.recipient.name, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  if (data.recipient.position) {
    doc.text(data.recipient.position, 14, y);
    y += 6;
  }
  if (data.recipient.institution) {
    doc.text(data.recipient.institution, 14, y);
    y += 6;
  }
  if (data.recipient.address) {
    doc.text(`di ${data.recipient.address}`, 14, y);
    y += 6;
  }
  
  y += 10;
  
  // Content
  doc.text('Dengan hormat,', 14, y);
  y += 8;
  
  const contentLines = doc.splitTextToSize(data.content, pageWidth - 28);
  doc.text(contentLines, 14, y);
  
  y += contentLines.length * 5 + 10;
  
  doc.text('Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.', 14, y);
  
  y += 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(data.letterDate, 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y);
  y += 6;
  doc.text('Hormat kami,', pageWidth - 70, y);
  y += 25;
  doc.setFont('helvetica', 'bold');
  doc.text(data.signatory.name, pageWidth - 70, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.signatory.position, pageWidth - 70, y);
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// E-Ticket data interface
interface ETicketData {
  bookingCode: string;
  passengerName: string;
  passportNumber: string;
  packageName: string;
  departureDate: Date;
  returnDate: Date;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber?: string;
  airline?: string;
  departureTime?: string;
  hotelMakkah?: string;
  hotelMadinah?: string;
  roomType: string;
  seatNumber?: string;
}

// Umrah Certificate data interface
interface UmrahCertificateData {
  participantName: string;
  passportNumber: string;
  birthPlace: string;
  birthDate: Date;
  packageName: string;
  departureDate: Date;
  returnDate: Date;
  certificateNumber: string;
}

// Generate E-Ticket
export function generateETicket(
  data: ETicketData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with company branding
  doc.setFillColor(22, 163, 74); // Green
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('E-TICKET', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Booking Code: ${data.bookingCode}`, pageWidth / 2, 36, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  let y = 55;
  
  // Passenger Information Section
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 5, pageWidth - 28, 35, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PENUMPANG', 20, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nama Penumpang: ${data.passengerName}`, 20, y);
  y += 7;
  doc.text(`No. Paspor: ${data.passportNumber}`, 20, y);
  y += 7;
  doc.text(`Paket: ${data.packageName}`, 20, y);
  
  y += 20;
  
  // Flight Information Section
  doc.setFillColor(22, 163, 74);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PENERBANGAN', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 12;
  
  // Departure
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KEBERANGKATAN', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tanggal: ${format(data.departureDate, 'd MMMM yyyy', { locale: id })}`, 20, y);
  if (data.departureTime) {
    doc.text(`Waktu: ${data.departureTime}`, 100, y);
  }
  y += 7;
  doc.text(`Dari: ${data.departureAirport}`, 20, y);
  doc.text(`Ke: ${data.arrivalAirport}`, 100, y);
  y += 7;
  if (data.airline) {
    doc.text(`Maskapai: ${data.airline}`, 20, y);
  }
  if (data.flightNumber) {
    doc.text(`No. Penerbangan: ${data.flightNumber}`, 100, y);
  }
  
  y += 15;
  
  // Return
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KEPULANGAN', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tanggal: ${format(data.returnDate, 'd MMMM yyyy', { locale: id })}`, 20, y);
  
  y += 20;
  
  // Accommodation Information
  doc.setFillColor(22, 163, 74);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI AKOMODASI', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.hotelMakkah) {
    doc.text(`Hotel Makkah: ${data.hotelMakkah}`, 20, y);
    y += 7;
  }
  if (data.hotelMadinah) {
    doc.text(`Hotel Madinah: ${data.hotelMadinah}`, 20, y);
    y += 7;
  }
  doc.text(`Tipe Kamar: ${data.roomType}`, 20, y);
  
  y += 25;
  
  // Important Notes
  doc.setFillColor(255, 243, 205);
  doc.rect(14, y - 5, pageWidth - 28, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CATATAN PENTING:', 20, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('• Harap tiba di bandara minimal 4 jam sebelum keberangkatan', 20, y);
  y += 5;
  doc.text('• Pastikan paspor masih berlaku minimal 6 bulan dari tanggal keberangkatan', 20, y);
  y += 5;
  doc.text('• Bawa dokumen asli: Paspor, Visa, Buku Kuning (Vaksin Meningitis)', 20, y);
  y += 5;
  doc.text('• E-Ticket ini wajib dicetak dan dibawa saat keberangkatan', 20, y);
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Dicetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`, 14, pageHeight - 15);
  doc.text(`${company.phone} | ${company.email}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
  doc.setTextColor(0);
  
  return doc;
}

// Generate Umrah Certificate (Sertifikat Umrah)
export function generateUmrahCertificate(
  data: UmrahCertificateData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Decorative border
  doc.setDrawColor(218, 165, 32); // Gold
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Header decorations
  doc.setFillColor(218, 165, 32);
  doc.rect(pageWidth / 2 - 60, 20, 120, 2, 'F');
  
  let y = 35;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('SERTIFIKAT', pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Dark green
  doc.text('IBADAH UMRAH', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Certificate Number
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. ${data.certificateNumber}`, pageWidth / 2, y, { align: 'center' });
  
  y += 20;
  
  // Main content
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Dengan ini menerangkan bahwa:', pageWidth / 2, y, { align: 'center' });
  
  y += 15;
  
  // Participant name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.participantName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFillColor(218, 165, 32);
  doc.rect(pageWidth / 2 - 80, y, 160, 1, 'F');
  
  y += 15;
  
  // Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. Paspor: ${data.passportNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(`Tempat/Tanggal Lahir: ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}`, pageWidth / 2, y, { align: 'center' });
  
  y += 15;
  
  // Certificate text
  doc.setFontSize(12);
  const certText = `Telah menunaikan Ibadah Umrah ke Tanah Suci Makkah Al-Mukarramah dan Madinah Al-Munawwarah`;
  doc.text(certText, pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  doc.text(`Periode: ${format(data.departureDate, 'd MMMM', { locale: id })} - ${format(data.returnDate, 'd MMMM yyyy', { locale: id })}`, pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(`Paket: ${data.packageName}`, pageWidth / 2, y, { align: 'center' });
  
  y += 20;
  
  // Closing text
  doc.setFontSize(10);
  doc.text('Semoga Ibadah Umrah yang telah dilaksanakan menjadi Umrah yang Mabrur', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text('dan diterima di sisi Allah SWT. Aamiin.', pageWidth / 2, y, { align: 'center' });
  
  // Signature section
  y = pageHeight - 55;
  doc.setFontSize(10);
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y, { align: 'center' });
  y += 6;
  doc.text(company.name, pageWidth - 70, y, { align: 'center' });
  y += 20;
  doc.text('_______________________', pageWidth - 70, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Direktur', pageWidth - 70, y, { align: 'center' });
  
  // Company info at bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${company.address} | ${company.phone} | ${company.email}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
  
  return doc;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Export types for external use
export type {
  CompanyInfo,
  LeaveLetterData,
  EmployeeLeaveLetterData,
  JamaahLeaveLetterData,
  PassportLetterData,
  InvoiceData,
  GeneralLetterData,
  ETicketData,
  UmrahCertificateData
};
