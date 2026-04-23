import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ===== Types =====
export type RoomTypeDB = 'quad' | 'triple' | 'double' | 'single';

export interface RoomingPassenger {
  id: string;
  passenger_type?: string | null;
  room_number?: string | null;
  roommate_id?: string | null;
  booking_id: string;
  booking_room_type: RoomTypeDB;
  customer: {
    full_name: string;
    gender?: string | null;
    birth_date?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
  };
}

export interface RoomingHotel {
  name: string;
  city?: string | null;
}

export interface RoomingExportData {
  departureDate: string; // ISO yyyy-mm-dd
  returnDate?: string | null;
  airlineName: string;
  airlineCode?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  departureAirport?: { code?: string | null; name?: string | null } | null;
  arrivalAirport?: { code?: string | null; name?: string | null } | null;
  packageName: string;
  durationDays?: number | null;
  welcomeBoard: string;
  timeLimit: string;
  tourLeaderName?: string | null;
  tourLeaderPhone?: string | null;
  hotels: RoomingHotel[]; // 1 atau 2 hotel (Makkah/Madinah)
  passengers: RoomingPassenger[];
}

// ===== Helpers =====
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatDOB(date?: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

export function formatLongDate(date?: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function calculateAge(birthDate?: string | null, refDate?: string | null): string {
  if (!birthDate) return '';
  const b = new Date(birthDate);
  const r = refDate ? new Date(refDate) : new Date();
  if (isNaN(b.getTime()) || isNaN(r.getTime())) return '';
  let age = r.getFullYear() - b.getFullYear();
  const m = r.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < b.getDate())) age--;
  return age.toString();
}

function roomTypeBaseLabel(type: RoomTypeDB): string {
  switch (type) {
    case 'double': return 'TWIN BED';
    case 'triple': return 'TRIPLE';
    case 'quad':   return 'QUAD';
    case 'single': return 'SINGLE';
  }
}

function roomCapacity(type: RoomTypeDB): number {
  return type === 'single' ? 1 : type === 'double' ? 2 : type === 'triple' ? 3 : 4;
}

// Group passengers ke dalam "kamar". Strategi:
// 1. Per booking_room_type
// 2. Bila room_number diisi → kelompok per room_number
// 3. Bila tidak → kelompok per roommate cluster (transitive); fallback per booking_id
// 4. Pecah jadi chunk sebesar capacity tipe kamar
export interface RoomGroup {
  type: RoomTypeDB;
  label: string;       // e.g. "TWIN BED 1"
  roomNumber: string;  // e.g. "201" atau ""
  passengers: RoomingPassenger[];
}

export function groupOccupantsByRoom(passengers: RoomingPassenger[]): RoomGroup[] {
  const result: RoomGroup[] = [];
  const types: RoomTypeDB[] = ['quad', 'triple', 'double', 'single'];

  for (const type of types) {
    const ofType = passengers.filter(p => p.booking_room_type === type);
    if (ofType.length === 0) continue;

    // Build buckets by key
    const byKey = new Map<string, RoomingPassenger[]>();
    const idToKey = new Map<string, string>();

    // First pass: passengers with room_number
    for (const p of ofType) {
      if (p.room_number) {
        const key = `R:${p.room_number}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(p);
        idToKey.set(p.id, key);
      }
    }

    // Second pass: roommate clusters via union-find-ish (simplified: take roommate's bucket)
    for (const p of ofType) {
      if (idToKey.has(p.id)) continue;
      let key: string | undefined;
      if (p.roommate_id) {
        const mateKey = idToKey.get(p.roommate_id);
        if (mateKey) key = mateKey;
      }
      if (!key) {
        // Try find any earlier passenger that points to me
        for (const other of ofType) {
          if (other.id !== p.id && other.roommate_id === p.id && idToKey.has(other.id)) {
            key = idToKey.get(other.id);
            break;
          }
        }
      }
      if (!key) {
        key = p.roommate_id ? `M:${[p.id, p.roommate_id].sort().join('-')}` : `B:${p.booking_id}:${p.id}`;
      }
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(p);
      idToKey.set(p.id, key);
    }

    // Now split each bucket into chunks of capacity
    const cap = roomCapacity(type);
    const baseLabel = roomTypeBaseLabel(type);
    let seq = 0;

    // Stable order: first buckets that have room_number (sorted), then others
    const keys = Array.from(byKey.keys()).sort((a, b) => {
      const aR = a.startsWith('R:'), bR = b.startsWith('R:');
      if (aR && !bR) return -1;
      if (!aR && bR) return 1;
      return a.localeCompare(b);
    });

    for (const key of keys) {
      const list = byKey.get(key)!;
      // sort: main passenger first
      list.sort((a, b) => a.customer.full_name.localeCompare(b.customer.full_name));
      for (let i = 0; i < list.length; i += cap) {
        seq++;
        const chunk = list.slice(i, i + cap);
        const roomNumber = key.startsWith('R:') ? key.slice(2) : '';
        result.push({
          type,
          label: `${baseLabel} ${seq}`,
          roomNumber,
          passengers: chunk,
        });
      }
    }
  }

  return result;
}

// ===== Build flat rows for output =====
interface FlatRow {
  no: number;
  name: string;
  sex: string;
  type: string;
  dob: string;
  passport: string;
  roomTypeLabel: string;  // hanya pada baris pertama grup
  roomNumber: string;     // hanya pada baris pertama grup
  age: string;
  // metadata untuk merging
  groupSpan: number;      // hanya pada baris pertama grup, lainnya 0
  groupStartIndex: number;
  bookingRoomType: RoomTypeDB;
}

function buildRows(groups: RoomGroup[], departureDate: string): FlatRow[] {
  const rows: FlatRow[] = [];
  let no = 0;
  for (const g of groups) {
    const startIdx = rows.length;
    g.passengers.forEach((p, i) => {
      no++;
      rows.push({
        no,
        name: (p.customer.full_name || '').toUpperCase(),
        sex: p.customer.gender === 'female' ? 'F' : p.customer.gender === 'male' ? 'M' : '',
        type: (p.passenger_type || 'adult').toUpperCase(),
        dob: formatDOB(p.customer.birth_date),
        passport: p.customer.passport_number || '',
        roomTypeLabel: i === 0 ? g.label : '',
        roomNumber: i === 0 ? g.roomNumber : '',
        age: calculateAge(p.customer.birth_date, departureDate),
        groupSpan: i === 0 ? g.passengers.length : 0,
        groupStartIndex: startIdx,
        bookingRoomType: g.type,
      });
    });
  }
  return rows;
}

function countRoomsByType(groups: RoomGroup[]): { double: number; twin: number; twinExtra: number; quad: number; triple: number; single: number; total: number } {
  let twin = 0, twinExtra = 0, quad = 0, triple = 0, single = 0;
  for (const g of groups) {
    if (g.type === 'double') twin++;
    else if (g.type === 'triple') { twin++; twinExtra++; triple++; }
    else if (g.type === 'quad') quad++;
    else if (g.type === 'single') single++;
  }
  return { double: 0, twin, twinExtra, quad, triple, single, total: twin + quad + single };
}

// ===== Excel Export =====
const HEADER_BG_BLACK = '000000';
const HEADER_FG_WHITE = 'FFFFFF';
const TITLE_FG_RED = 'C00000';
const TOTAL_BG_YELLOW = 'FFFF00';
const BORDER_THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

function buildSheetForHotel(data: RoomingExportData, hotelLabel: string): XLSX.WorkSheet {
  const groups = groupOccupantsByRoom(data.passengers);
  const rows = buildRows(groups, data.departureDate);
  const counts = countRoomsByType(groups);

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  const NUM_COLS = 9; // No, NAMA, SEX, TYPE, DOB, PASSPORT, ROOM TYPE, NO ROOM, AGE
  const colLetters = ['A','B','C','D','E','F','G','H','I'];

  let r = 0;

  // Title 1: ROOMING LIST
  const title1 = `ROOMING LIST ${formatLongDate(data.departureDate)} BY ${data.airlineName.toUpperCase()}${hotelLabel ? ' - ' + hotelLabel.toUpperCase() : ''}`;
  ws[`A${r + 1}`] = {
    v: title1, t: 's',
    s: {
      font: { bold: true, color: { rgb: HEADER_FG_WHITE }, sz: 12 },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG_BLACK } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
  r++;

  // Title 2: PROGRAM
  const dur = data.durationDays ? `${data.durationDays} HARI ` : '';
  const title2 = `PROGRAM ${dur}${data.packageName.toUpperCase()}`;
  ws[`A${r + 1}`] = {
    v: title2, t: 's',
    s: {
      font: { bold: true, color: { rgb: TITLE_FG_RED }, sz: 12 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
  r++;

  // Info rows: FLIGHT INFO, WELCOME BOARD, TOUR LEADER (+ TIME LIMIT), NOMER TL
  const depCode = data.departureAirport?.code || '';
  const arrCode = data.arrivalAirport?.code || '';
  const route = depCode || arrCode ? `${depCode}-${arrCode}` : '';
  const flightLine = `${data.flightNumber || ''} ${route} ${data.departureTime || ''} ${data.airlineCode ? '(' + data.airlineCode + ')' : ''}`.trim();
  const infoRows: Array<[string, string, string?, string?]> = [
    ['FLIGHT INFO', flightLine],
    ['WELCOME BOARD', data.welcomeBoard],
    ['TOUR LEADER', data.tourLeaderName || '-', 'TIME LIMIT', data.timeLimit || '-'],
    ['NOMER TL', data.tourLeaderPhone || '-'],
  ];
  for (const row of infoRows) {
    const [k1, v1, k2, v2] = row;
    ws[`A${r + 1}`] = { v: k1, t: 's', s: { font: { bold: true }, alignment: { vertical: 'center' }, border: ALL_BORDERS } };
    ws[`B${r + 1}`] = { v: ':', t: 's', s: { alignment: { horizontal: 'center' }, border: ALL_BORDERS } };
    if (k2) {
      ws[`C${r + 1}`] = { v: v1, t: 's', s: { border: ALL_BORDERS } };
      merges.push({ s: { r, c: 2 }, e: { r, c: 4 } });
      ws[`F${r + 1}`] = { v: k2, t: 's', s: { font: { bold: true }, border: ALL_BORDERS } };
      ws[`G${r + 1}`] = { v: ':', t: 's', s: { alignment: { horizontal: 'center' }, border: ALL_BORDERS } };
      ws[`H${r + 1}`] = { v: v2 || '', t: 's', s: { border: ALL_BORDERS } };
      merges.push({ s: { r, c: 7 }, e: { r, c: 8 } });
    } else {
      ws[`C${r + 1}`] = { v: v1, t: 's', s: { border: ALL_BORDERS } };
      merges.push({ s: { r, c: 2 }, e: { r, c: NUM_COLS - 1 } });
    }
    r++;
  }

  // Spacer
  r++;

  // Table header
  const headers = ['No', 'NAMA', 'SEX', 'TYPE', 'DOB', 'PASSPORT', 'ROOM TYPE', 'NO ROOM', 'AGE'];
  headers.forEach((h, i) => {
    ws[`${colLetters[i]}${r + 1}`] = {
      v: h, t: 's',
      s: {
        font: { bold: true, color: { rgb: HEADER_FG_WHITE }, sz: 11 },
        fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG_BLACK } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: ALL_BORDERS,
      },
    };
  });
  r++;

  // Data rows
  rows.forEach((row, idx) => {
    const cellStyle = (extra?: any) => ({
      alignment: { vertical: 'center', horizontal: 'left' },
      border: ALL_BORDERS,
      font: { sz: 10 },
      ...extra,
    });
    ws[`A${r + 1}`] = { v: row.no, t: 'n', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };
    ws[`B${r + 1}`] = { v: row.name, t: 's', s: cellStyle() };
    ws[`C${r + 1}`] = { v: row.sex, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };
    ws[`D${r + 1}`] = { v: row.type, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };
    ws[`E${r + 1}`] = { v: row.dob, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };
    ws[`F${r + 1}`] = { v: row.passport, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };
    ws[`G${r + 1}`] = { v: row.roomTypeLabel, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' }, font: { bold: true, sz: 10 } }) };
    ws[`H${r + 1}`] = { v: row.roomNumber, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };
    ws[`I${r + 1}`] = { v: row.age, t: 's', s: cellStyle({ alignment: { horizontal: 'center', vertical: 'center' } }) };

    if (row.groupSpan > 1) {
      // merge G & H across the group
      merges.push({ s: { r, c: 6 }, e: { r: r + row.groupSpan - 1, c: 6 } });
      merges.push({ s: { r, c: 7 }, e: { r: r + row.groupSpan - 1, c: 7 } });
    }
    r++;
    idx;
  });

  // Spacer
  r++;

  // TOTAL HOTEL banner
  ws[`A${r + 1}`] = {
    v: 'TOTAL HOTEL', t: 's',
    s: {
      font: { bold: true, sz: 11 },
      fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
  r++;

  const totalLines: Array<[string, number]> = [
    ['KAMAR DOUBLE BED', counts.double],
    ['KAMAR TWIN SHARING', counts.twin],
    ['KAMAR TWIN SHARING + EXTRA BED', counts.twinExtra],
    ['KAMAR QUAD', counts.quad],
    ['KAMAR SINGLE', counts.single],
  ];
  for (const [label, val] of totalLines) {
    ws[`A${r + 1}`] = { v: label, t: 's', s: { font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    ws[`G${r + 1}`] = { v: '=', t: 's', s: { alignment: { horizontal: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
    ws[`H${r + 1}`] = { v: val, t: 'n', s: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
    ws[`I${r + 1}`] = { v: 'ROOM', t: 's', s: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
    r++;
  }
  // TOTAL row
  ws[`A${r + 1}`] = { v: 'TOTAL', t: 's', s: { font: { bold: true }, alignment: { horizontal: 'right' }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
  merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });
  ws[`H${r + 1}`] = { v: counts.total, t: 'n', s: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
  ws[`I${r + 1}`] = { v: 'ROOM', t: 's', s: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: TOTAL_BG_YELLOW } }, border: ALL_BORDERS } };
  r++;

  // Sheet boundary
  ws['!ref'] = `A1:I${r}`;
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 4 }, { wch: 32 }, { wch: 5 }, { wch: 7 }, { wch: 11 }, { wch: 12 }, { wch: 14 }, { wch: 9 }, { wch: 5 },
  ];

  return ws;
}

export function exportRoomingListExcel(data: RoomingExportData): void {
  const wb = XLSX.utils.book_new();
  if (data.hotels.length === 0) {
    const ws = buildSheetForHotel(data, '');
    XLSX.utils.book_append_sheet(wb, ws, 'Rooming List');
  } else {
    data.hotels.forEach((h, i) => {
      const label = h.city ? `${h.name} - ${h.city}` : h.name;
      const ws = buildSheetForHotel(data, label);
      const sheetName = (h.city || h.name || `Hotel ${i + 1}`).slice(0, 28).replace(/[\\/?*\[\]:]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName || `Hotel ${i + 1}`);
    });
  }
  const fname = `ROOMING_LIST_${data.packageName.replace(/\s+/g, '_')}_${data.departureDate}.xlsx`;
  XLSX.writeFile(wb, fname);
}

// ===== PDF Export =====
export function exportRoomingListPDF(data: RoomingExportData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hotels = data.hotels.length > 0 ? data.hotels : [{ name: '', city: '' }];

  hotels.forEach((hotel, idx) => {
    if (idx > 0) doc.addPage();
    renderHotelPage(doc, data, hotel);
  });

  const fname = `ROOMING_LIST_${data.packageName.replace(/\s+/g, '_')}_${data.departureDate}.pdf`;
  doc.save(fname);
}

function renderHotelPage(doc: jsPDF, data: RoomingExportData, hotel: RoomingHotel): void {
  const groups = groupOccupantsByRoom(data.passengers);
  const rows = buildRows(groups, data.departureDate);
  const counts = countRoomsByType(groups);
  const pageWidth = doc.internal.pageSize.getWidth();

  const hotelLabel = hotel.name ? (hotel.city ? `${hotel.name} - ${hotel.city}` : hotel.name) : '';

  // Title 1: black header
  doc.setFillColor(0, 0, 0);
  doc.rect(10, 10, pageWidth - 20, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const t1 = `ROOMING LIST ${formatLongDate(data.departureDate)} BY ${data.airlineName.toUpperCase()}${hotelLabel ? ' - ' + hotelLabel.toUpperCase() : ''}`;
  doc.text(t1, pageWidth / 2, 15.5, { align: 'center' });

  // Title 2: red
  doc.setTextColor(192, 0, 0);
  doc.setFontSize(11);
  const dur = data.durationDays ? `${data.durationDays} HARI ` : '';
  doc.text(`PROGRAM ${dur}${data.packageName.toUpperCase()}`, pageWidth / 2, 24, { align: 'center' });

  // Info block
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const depCode = data.departureAirport?.code || '';
  const arrCode = data.arrivalAirport?.code || '';
  const route = depCode || arrCode ? `${depCode}-${arrCode}` : '';
  const flightLine = `${data.flightNumber || ''} ${route} ${data.departureTime || ''} ${data.airlineCode ? '(' + data.airlineCode + ')' : ''}`.trim();

  let y = 30;
  const lineH = 5;
  const writeKV = (k: string, v: string, x = 12) => {
    doc.setFont('helvetica', 'bold');
    doc.text(k, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${v}`, x + 35, y);
  };
  writeKV('FLIGHT INFO', flightLine); y += lineH;
  writeKV('WELCOME BOARD', data.welcomeBoard); y += lineH;
  writeKV('TOUR LEADER', data.tourLeaderName || '-');
  doc.setFont('helvetica', 'bold');
  doc.text('TIME LIMIT', pageWidth / 2 + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${data.timeLimit || '-'}`, pageWidth / 2 + 55, y);
  y += lineH;
  writeKV('NOMER TL', data.tourLeaderPhone || '-'); y += lineH + 1;

  // Build autoTable
  const head = [['No', 'NAMA', 'SEX', 'TYPE', 'DOB', 'PASSPORT', 'ROOM TYPE', 'NO ROOM', 'AGE']];
  const body = rows.map(r => [
    r.no, r.name, r.sex, r.type, r.dob, r.passport, r.roomTypeLabel, r.roomNumber, r.age
  ]);

  autoTable(doc, {
    head, body,
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1, valign: 'middle' },
    headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 10, halign: 'center' },
    },
    didParseCell: (hookData) => {
      // Hide border between merged ROOM TYPE / NO ROOM cells
      if (hookData.section === 'body' && (hookData.column.index === 6 || hookData.column.index === 7)) {
        const rowIdx = hookData.row.index;
        const dataRow = rows[rowIdx];
        if (!dataRow) return;
        // If this row is a continuation (groupSpan === 0), erase top border + value
        if (dataRow.groupSpan === 0) {
          hookData.cell.text = [''];
          hookData.cell.styles.lineWidth = { top: 0, right: 0.1, bottom: 0.1, left: 0.1 } as any;
        }
        // If this row is a group head but not last in group, erase bottom border
        const nextRow = rows[rowIdx + 1];
        const isLastInGroup = !nextRow || nextRow.groupSpan !== 0;
        if (!isLastInGroup) {
          const lw = hookData.cell.styles.lineWidth as any;
          const topLw = (typeof lw === 'object' && lw && 'top' in lw) ? lw.top : 0.1;
          hookData.cell.styles.lineWidth = { top: topLw, right: 0.1, bottom: 0, left: 0.1 } as any;
        }
      }
    },
  });

  let endY = (doc as any).lastAutoTable.finalY + 4;

  // TOTAL HOTEL banner (yellow)
  doc.setFillColor(255, 255, 0);
  doc.rect(10, endY, pageWidth - 20, 6, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(10, endY, pageWidth - 20, 6);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL HOTEL', pageWidth / 2, endY + 4, { align: 'center' });
  endY += 6;

  const totalLines: Array<[string, number]> = [
    ['KAMAR DOUBLE BED', counts.double],
    ['KAMAR TWIN SHARING', counts.twin],
    ['KAMAR TWIN SHARING + EXTRA BED', counts.twinExtra],
    ['KAMAR QUAD', counts.quad],
    ['KAMAR SINGLE', counts.single],
    ['TOTAL', counts.total],
  ];
  doc.setFontSize(9);
  for (const [label, val] of totalLines) {
    doc.setFillColor(255, 255, 0);
    doc.rect(10, endY, pageWidth - 20, 5.5, 'F');
    doc.rect(10, endY, pageWidth - 20, 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, endY + 4);
    doc.text(`= ${val} ROOM`, pageWidth - 14, endY + 4, { align: 'right' });
    endY += 5.5;
  }
}