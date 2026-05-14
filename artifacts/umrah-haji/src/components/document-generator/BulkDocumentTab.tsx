import { Baby, Download, Package, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateJamaahLeaveLetter,
  generatePassportLetter,
  generateInvoice,
  generateETicket,
  generateUmrahCertificate,
  type JamaahLeaveLetterData,
  type PassportLetterData,
  type InvoiceDataExtended,
  type ETicketData,
  type UmrahCertificateData,
} from "@/lib/document-generator";

interface Props {
  jamaahFilterPkg: string;
  jamaahFilterDep: string;
  setJamaahFilterPkg: (v: string) => void;
  setJamaahFilterDep: (v: string) => void;
  jamaahSearch: string;
  setJamaahSearch: (v: string) => void;
  jamaahYear: string;
  jamaahMonth: string;
  setJamaahYear: (v: string) => void;
  setJamaahMonth: (v: string) => void;
  packages: any[] | undefined;
  allDepartures: any[] | undefined;
  jamaahCustomers: any[];
  jamaahByDeparture: any[] | undefined;
  getSelectedDeparture: (depId: string) => any;
  getLetterNumber: (docType: string, prefix: string) => Promise<string>;
  handleDownloadPdf: (doc: any, filename: string) => void;
  company: any;
  bankAccount: any;
  DepartureInfo: React.ComponentType<{ depId: string }>;
}

export function BulkDocumentTab({
  jamaahFilterPkg, jamaahFilterDep, setJamaahFilterPkg, setJamaahFilterDep,
  jamaahSearch, setJamaahSearch, jamaahYear, jamaahMonth, setJamaahYear, setJamaahMonth,
  packages, allDepartures, jamaahCustomers, jamaahByDeparture,
  getSelectedDeparture, getLetterNumber, handleDownloadPdf, company, bankAccount,
  DepartureInfo,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />Generate Dokumen Massal per Jamaah
        </CardTitle>
        <CardDescription>
          Pilih keberangkatan, lalu generate berbagai jenis dokumen untuk setiap jamaah secara cepat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">PAKET</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={jamaahFilterPkg}
              onChange={(e) => { setJamaahFilterPkg(e.target.value); setJamaahFilterDep(""); }}
            >
              <option value="">Semua Paket</option>
              {packages?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">KEBERANGKATAN</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={jamaahFilterDep}
              onChange={(e) => setJamaahFilterDep(e.target.value)}
            >
              <option value="">Pilih keberangkatan...</option>
              {(allDepartures || [])
                .filter((d: any) => !jamaahFilterPkg || d.package_id === jamaahFilterPkg)
                .map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {format(new Date(d.departure_date), "dd MMM yyyy", { locale: id })} — {(d.package as any)?.name || "Paket"}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">CARI JAMAAH</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="Nama / NIK..."
              value={jamaahSearch}
              onChange={(e) => setJamaahSearch(e.target.value)}
            />
          </div>
        </div>

        {jamaahFilterDep && <DepartureInfo depId={jamaahFilterDep} />}

        {!jamaahFilterDep ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan untuk melihat daftar jamaah</p>
          </div>
        ) : jamaahCustomers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Tidak ada jamaah untuk keberangkatan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{jamaahCustomers.length} jamaah ditemukan</p>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground">JAMAAH</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">CUTI</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">PASPOR</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">INVOICE</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">E-TICKET</th>
                    <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">SERTIFIKAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jamaahCustomers.map((customer: any, idx: number) => {
                    const dep = getSelectedDeparture(jamaahFilterDep);
                    const bookings = (jamaahByDeparture || []).filter(
                      (bp: any) => bp.customer_id === customer.id && bp.booking?.departure_id === jamaahFilterDep
                    );
                    const booking = bookings[0]?.booking;
                    return (
                      <tr key={customer.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{customer.full_name}</div>
                          <div className="text-xs text-muted-foreground">{customer.nik || "NIK belum diisi"} · {customer.phone || "-"}</div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={async () => {
                              if (!dep) return toast.error("Data keberangkatan tidak ditemukan");
                              const data: JamaahLeaveLetterData = {
                                jamaahName: customer.full_name, nik: customer.nik || "-",
                                birthPlace: customer.birth_place || "-",
                                birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
                                address: customer.address || "-", employerName: "Yth. Pimpinan",
                                employerPosition: "", employerInstitution: "", employerAddress: "-",
                                startDate: new Date(dep.departure_date), endDate: new Date(dep.return_date),
                                purpose: "Ibadah Umrah",
                              };
                              try {
                                const num = await getLetterNumber("cuti_jamaah", "CUTI-JMH");
                                const doc = await generateJamaahLeaveLetter(data, num, company);
                                handleDownloadPdf(doc, `cuti-jamaah-${customer.full_name.replace(/\s+/g, "-")}`);
                              } catch { toast.error("Gagal generate"); }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md transition-colors"
                          >
                            <Download className="h-3 w-3" />Cuti
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={async () => {
                              const data: PassportLetterData = {
                                customerName: customer.full_name, nik: customer.nik || "-",
                                birthPlace: customer.birth_place || "-",
                                birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
                                address: customer.address || "-", phone: customer.phone || "-",
                                purpose: "Ibadah Umrah",
                                departureDate: dep ? new Date(dep.departure_date) : undefined,
                              };
                              try {
                                const num = await getLetterNumber("paspor", "PASPOR");
                                const doc = await generatePassportLetter(data, num, company);
                                handleDownloadPdf(doc, `paspor-${customer.full_name.replace(/\s+/g, "-")}`);
                              } catch { toast.error("Gagal generate"); }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md transition-colors"
                          >
                            <Download className="h-3 w-3" />Paspor
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {booking ? (
                            <button
                              onClick={async () => {
                                const pkg = (dep as any)?.package;
                                const b = booking as any;
                                const data: InvoiceDataExtended = {
                                  invoiceNumber: `INV-${b.booking_code}`,
                                  invoiceDate: new Date(), dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                                  customer: { name: customer.full_name, address: customer.address || "-", phone: customer.phone || "-", email: customer.email },
                                  items: [{ description: `Paket ${pkg?.name || "Umrah"} - ${b.room_type}`, quantity: 1, unitPrice: b.total_price, total: b.total_price }],
                                  subtotal: b.total_price, discount: b.discount_amount || 0, total: b.total_price,
                                  paidAmount: b.paid_amount || 0, remainingAmount: b.remaining_amount || 0,
                                  paymentStatus: (b.paid_amount || 0) >= b.total_price ? "paid" : (b.paid_amount || 0) > 0 ? "partial" : "pending",
                                  packageName: pkg?.name,
                                  departureDate: (dep as any)?.departure_date ? new Date((dep as any).departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : undefined,
                                  notes: "Terima kasih atas kepercayaan Anda.",
                                  bankInfo: bankAccount ? { bankName: bankAccount.bank_name, accountNumber: bankAccount.account_number, accountName: bankAccount.account_name } : undefined,
                                };
                                try {
                                  const doc = await generateInvoice(data, company);
                                  handleDownloadPdf(doc, `invoice-${booking.booking_code}`);
                                } catch { toast.error("Gagal generate"); }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md transition-colors"
                            >
                              <Download className="h-3 w-3" />Invoice
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {booking && dep ? (
                            <button
                              onClick={async () => {
                                const pkg = (dep as any)?.package;
                                const airline = (dep as any)?.airline;
                                const depAirport = (dep as any)?.departure_airport;
                                const arrAirport = (dep as any)?.arrival_airport;
                                const hotelMakkah = (dep as any)?.hotel_makkah;
                                const hotelMadinah = (dep as any)?.hotel_madinah;
                                const data: ETicketData = {
                                  bookingCode: booking.booking_code, passengerName: customer.full_name,
                                  passportNumber: customer.passport_number || "-", packageName: pkg?.name || "Umrah",
                                  departureDate: new Date(dep.departure_date), returnDate: new Date(dep.return_date),
                                  departureAirport: depAirport ? `${depAirport.name} (${depAirport.code})` : "-",
                                  arrivalAirport: arrAirport ? `${arrAirport.name} (${arrAirport.code})` : "-",
                                  flightNumber: dep.flight_number || undefined, airline: airline?.name,
                                  departureTime: dep.departure_time || undefined,
                                  hotelMakkah: hotelMakkah?.name, hotelMadinah: hotelMadinah?.name, roomType: booking.room_type,
                                };
                                try {
                                  const doc = await generateETicket(data, company);
                                  handleDownloadPdf(doc, `eticket-${booking.booking_code}`);
                                } catch { toast.error("Gagal generate"); }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md transition-colors"
                            >
                              <Download className="h-3 w-3" />E-Ticket
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {booking && dep && new Date(dep.return_date) <= new Date() ? (
                            <button
                              onClick={async () => {
                                const pkg = (dep as any)?.package;
                                const data: UmrahCertificateData = {
                                  participantName: customer.full_name, passportNumber: customer.passport_number || "-",
                                  birthPlace: customer.birth_place || "-",
                                  birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
                                  packageName: pkg?.name || "Umrah",
                                  departureDate: new Date(dep.departure_date), returnDate: new Date(dep.return_date),
                                  certificateNumber: `CERT-${booking.booking_code}`,
                                };
                                try {
                                  const doc = await generateUmrahCertificate(data, company);
                                  handleDownloadPdf(doc, `sertifikat-${customer.full_name.replace(/\s+/g, "-")}`);
                                } catch { toast.error("Gagal generate"); }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-md transition-colors"
                            >
                              <Download className="h-3 w-3" />Sertifikat
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              {!dep || new Date(dep.return_date) > new Date() ? "Belum selesai" : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1">
              Klik tombol di setiap baris untuk download PDF langsung. Sertifikat hanya tersedia setelah tanggal kembali.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
