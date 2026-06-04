import { useState } from "react";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  Send,
  Copy,
  CheckCheck,
  CalendarIcon,
  Receipt,
  Phone,
  Mail,
  Building2,
  ChevronRight,
  Loader2,
  MessageCircle,
  ExternalLink,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, getRoomTypeLabel, getPaymentStatusLabel } from "@/lib/format";
import { generateInvoice, type InvoiceDataExtended } from "@/lib/document-generator";
import { toast } from "sonner";
import { useDocumentLogger } from "@/hooks/useDocumentLogger";
import type { CompanyInfo } from "@/lib/document-generator";

interface QuickInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  passengers?: any[];
  lineItems?: any[];
  companyInfo: CompanyInfo | null;
  bankAccounts?: any[];
  cancellationPolicy?: any;
  invoiceTemplate?: any;
}

function getPaymentBadgeClass(status: string) {
  switch (status) {
    case "paid":
    case "verified":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "partial":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-red-100 text-red-800 border-red-200";
  }
}

export function QuickInvoiceSheet({
  open,
  onOpenChange,
  booking,
  passengers,
  lineItems,
  companyInfo,
  bankAccounts,
  cancellationPolicy,
}: QuickInvoiceSheetProps) {
  const { logDocument } = useDocumentLogger();

  const departure = booking?.departure as any;
  const pkg = departure?.package;
  const customer = booking?.customer as any;
  const bank = bankAccounts?.[0];

  // Due date state — default to payment_deadline or +7 days
  const defaultDue = booking?.payment_deadline
    ? new Date(booking.payment_deadline)
    : addDays(new Date(), 7);
  const [dueDate, setDueDate] = useState<Date>(defaultDue);
  const [customNote, setCustomNote] = useState(booking?.notes || "");
  const [isDownloading, setIsDownloading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!booking) return null;

  // Derived values (same logic as handlePrintInvoice)
  const paidAmount = booking.paid_amount || 0;
  const totalPrice = booking.total_price || 0;
  const remainingAmount = booking.remaining_amount ?? Math.max(0, totalPrice - paidAmount);
  const paymentStatus =
    paidAmount >= totalPrice && totalPrice > 0
      ? "paid"
      : paidAmount > 0
      ? "partial"
      : "pending";

  const rt = (booking.room_type || "quad") as string;
  const fromDep = departure?.[`price_${rt}`] as number | null | undefined;
  const fromPkg = pkg?.[`price_${rt}`] as number | null | undefined;
  const paxCount = booking.total_pax || 1;
  const pricePerPax =
    (fromDep && fromDep > 0 ? fromDep : null) ??
    (fromPkg && fromPkg > 0 ? fromPkg : null) ??
    (booking.base_price > 0
      ? booking.base_price
      : Math.round(
          (booking.total_price -
            (booking.discount_amount || 0) -
            (booking.addons_price || 0)) /
            paxCount
        ));

  // Build invoice items (reuse same logic)
  const items: InvoiceDataExtended["items"] =
    lineItems && lineItems.length > 0
      ? lineItems.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Math.abs(item.unit_price),
          total: Math.abs(item.total_price),
          isDiscount: item.item_type === "discount",
        }))
      : passengers && passengers.length > 0
      ? [
          {
            description: `Paket ${pkg?.name || "Umrah"} — Keberangkatan: ${
              departure?.departure_date ? formatDate(departure.departure_date) : "-"
            }`,
            quantity: paxCount,
            unitPrice: pricePerPax,
            total: pricePerPax * paxCount,
            isHeader: true,
          },
          ...passengers.map((p: any) => {
            const pRt = p.room_preference || booking.room_type || "quad";
            const pFromDep = departure?.[`price_${pRt}`] as number | null | undefined;
            const pFromPkg = pkg?.[`price_${pRt}`] as number | null | undefined;
            const infantOverride =
              p.passenger_type === "infant"
                ? (departure as any)?.price_infant || (pkg as any)?.price_infant || 0
                : 0;
            const unitP =
              infantOverride > 0
                ? infantOverride
                : (pFromDep && pFromDep > 0 ? pFromDep : null) ??
                  (pFromPkg && pFromPkg > 0 ? pFromPkg : null) ??
                  pricePerPax;
            const typeLabel =
              p.passenger_type === "adult"
                ? "Dewasa"
                : p.passenger_type === "child"
                ? "Anak"
                : "Bayi";
            return {
              description: `  ${p.customer?.full_name || p.full_name || "-"} (${typeLabel}) — ${getRoomTypeLabel(pRt)}`,
              quantity: 1,
              unitPrice: unitP,
              total: unitP,
            };
          }),
          ...(booking.addons_price && booking.addons_price > 0
            ? [
                {
                  description: "Biaya Tambahan / Add-ons",
                  quantity: 1,
                  unitPrice: booking.addons_price,
                  total: booking.addons_price,
                },
              ]
            : []),
        ]
      : [
          {
            description: `Paket ${pkg?.name || "Umrah"} - Kamar ${getRoomTypeLabel(
              booking.room_type
            )} (${paxCount} Pax)\nKeberangkatan: ${
              departure?.departure_date ? formatDate(departure.departure_date) : "-"
            }`,
            quantity: paxCount,
            unitPrice: pricePerPax,
            total: pricePerPax * paxCount,
          },
        ];

  const subtotal =
    lineItems && lineItems.length > 0
      ? lineItems
          .filter((i: any) => i.item_type !== "discount")
          .reduce((acc: number, i: any) => acc + Number(i.total_price), 0)
      : pricePerPax * paxCount + (booking.addons_price || 0);
  const discount =
    lineItems && lineItems.length > 0
      ? Math.abs(
          lineItems
            .filter((i: any) => i.item_type === "discount")
            .reduce((acc: number, i: any) => acc + Number(i.total_price), 0)
        ) || undefined
      : booking.discount_amount || undefined;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const activeCp = cancellationPolicy
        ? {
            id: cancellationPolicy.id,
            name: cancellationPolicy.name,
            sections: cancellationPolicy.sections ?? [],
          }
        : undefined;

      const invoiceData: InvoiceDataExtended = {
        invoiceNumber: `INV-${booking.booking_code}`,
        invoiceDate: new Date(booking.created_at || new Date()),
        dueDate,
        customer: {
          name: customer?.full_name || "-",
          address:
            [customer?.address, customer?.city, customer?.province]
              .filter(Boolean)
              .join(", ") || "-",
          phone: customer?.phone || "-",
          email: customer?.email || undefined,
        },
        items,
        subtotal,
        discount,
        total: totalPrice,
        paidAmount,
        remainingAmount,
        paymentStatus: paymentStatus as any,
        packageName: pkg?.name || undefined,
        departureDate: departure?.departure_date
          ? formatDate(departure.departure_date)
          : undefined,
        notes: customNote || booking.notes || undefined,
        bankInfo: bank
          ? {
              bankName: bank.bank_name,
              accountNumber: bank.account_number,
              accountName: bank.account_name,
            }
          : undefined,
        cancellationPolicy: activeCp,
        verifyUrl: `${window.location.origin}/transaksi/${
          (booking as any).public_token || booking.id
        }`,
      };

      const doc = await generateInvoice(invoiceData, companyInfo ?? undefined);
      doc.save(`Invoice-${booking.booking_code}.pdf`);
      toast.success("Invoice berhasil diunduh");
      await logDocument({
        bookingId: booking.id,
        documentType: "invoice",
        documentLabel: `Invoice INV-${booking.booking_code}`,
        jamaahName: customer?.full_name,
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  // WhatsApp message builder
  const buildWaMessage = () => {
    const name = customer?.full_name || "Jamaah";
    const pkgName = pkg?.name || "Umrah";
    const depDate = departure?.departure_date
      ? formatDate(departure.departure_date)
      : "-";
    const sisa = formatCurrency(remainingAmount);
    const total = formatCurrency(totalPrice);
    const due = format(dueDate, "dd MMMM yyyy", { locale: localeId });
    const bk =
      bank
        ? `\n💳 Rekening: ${bank.bank_name} ${bank.account_number} a/n ${bank.account_name}`
        : "";
    const notesPart = customNote ? `\n\n📝 Catatan: ${customNote}` : "";
    const publicLink = `${window.location.origin}/transaksi/${
      (booking as any).public_token || booking.id
    }`;

    return (
      `Assalamu'alaikum Wr. Wb., ${name}.\n\n` +
      `Berikut informasi booking Anda di ${companyInfo?.name || "kami"}:\n\n` +
      `📋 *Kode Booking:* ${booking.booking_code}\n` +
      `🕌 *Paket:* ${pkgName}\n` +
      `✈️ *Keberangkatan:* ${depDate}\n` +
      `💰 *Total Biaya:* ${total}\n` +
      `✅ *Sudah Dibayar:* ${formatCurrency(paidAmount)}\n` +
      `⏳ *Sisa Pembayaran:* ${sisa}\n` +
      `📅 *Jatuh Tempo:* ${due}` +
      bk +
      notesPart +
      `\n\n🔗 Invoice online: ${publicLink}\n\n` +
      `Terima kasih atas kepercayaan Anda. Jazakallahu khairan. 🤲`
    );
  };

  const handleSendWhatsApp = () => {
    if (!customer?.phone) {
      toast.error("No. WhatsApp jamaah tidak tersedia");
      return;
    }
    const phone = customer.phone
      .replace(/^0/, "62")
      .replace(/\D/g, "");
    const msg = encodeURIComponent(buildWaMessage());
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleSendEmail = () => {
    if (!customer?.email) {
      toast.error("Alamat email jamaah tidak tersedia");
      return;
    }
    const subject = encodeURIComponent(
      `Invoice Booking ${booking.booking_code} - ${pkg?.name || "Umrah"}`
    );
    const body = encodeURIComponent(buildWaMessage());
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/transaksi/${
      (booking as any).public_token || booking.id
    }`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      toast.success("Link invoice disalin!");
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const visibleItems = items.filter((i: any) => !i.isHeader);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="bg-primary text-primary-foreground px-6 py-5 shrink-0">
          <SheetTitle className="text-white flex items-center gap-2 text-lg font-black">
            <Receipt className="h-5 w-5" />
            Quick Invoice
          </SheetTitle>
          <p className="text-xs text-primary-foreground/70 font-medium">
            {booking.booking_code} · Preview, download, atau kirim ke jamaah
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5">

            {/* Customer card */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Pemesan</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-black text-sm">
                    {customer?.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{customer?.full_name || "-"}</p>
                  <div className="flex flex-wrap gap-x-3 mt-0.5">
                    {customer?.phone && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </span>
                    )}
                    {customer?.email && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {customer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Package & dates */}
            <div className="rounded-xl border divide-y text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground font-medium">Paket</span>
                <span className="font-bold text-right max-w-[55%]">{pkg?.name || "-"}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground font-medium">Keberangkatan</span>
                <span className="font-bold">
                  {departure?.departure_date ? formatDate(departure.departure_date) : "-"}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5 items-center">
                <span className="text-muted-foreground font-medium">Status Bayar</span>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border",
                    getPaymentBadgeClass(paymentStatus)
                  )}
                >
                  {getPaymentStatusLabel(paymentStatus)}
                </span>
              </div>
              {passengers && passengers.length > 0 && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Jamaah
                  </span>
                  <span className="font-bold">{passengers.length} orang</span>
                </div>
              )}
            </div>

            {/* Line items */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Rincian Biaya
              </p>
              <div className="rounded-xl border overflow-hidden">
                {visibleItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex justify-between gap-3 px-4 py-2.5 text-sm",
                      idx > 0 && "border-t",
                      item.isDiscount && "bg-red-50 dark:bg-red-950/20"
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 font-medium leading-snug",
                        item.isDiscount && "text-red-700 dark:text-red-400"
                      )}
                    >
                      {item.isDiscount ? "🏷 " : ""}
                      {item.description}
                      {item.quantity > 1 && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ×{item.quantity}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-bold shrink-0",
                        item.isDiscount && "text-red-700 dark:text-red-400"
                      )}
                    >
                      {item.isDiscount ? "-" : ""}
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}

                {/* Totals */}
                <div className="border-t bg-muted/30 divide-y">
                  {discount && discount > 0 && (
                    <div className="flex justify-between px-4 py-2 text-sm">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="font-bold text-red-600">- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2.5 text-sm font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <span className="font-medium">Sudah Dibayar</span>
                    <span className="font-bold">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className={cn(
                    "flex justify-between px-4 py-2.5 text-sm font-black rounded-b-xl",
                    remainingAmount > 0
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                  )}>
                    <span>Sisa Pembayaran</span>
                    <span>{formatCurrency(remainingAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank info */}
            {bank && (
              <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 flex items-start gap-3">
                <Building2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-blue-800 dark:text-blue-300">{bank.bank_name}</p>
                  <p className="font-mono text-sm font-bold mt-0.5">{bank.account_number}</p>
                  <p className="text-xs text-muted-foreground">a/n {bank.account_name}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Adjustable due date */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider">
                Jatuh Tempo Invoice
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold h-10 border-2"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                    {format(dueDate, "dd MMMM yyyy", { locale: localeId })}
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => d && setDueDate(d)}
                    initialFocus
                  />
                  <div className="flex gap-2 p-3 pt-0">
                    {[7, 14, 30].map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => setDueDate(addDays(new Date(), d))}
                      >
                        +{d} hari
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Custom notes */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider">
                Catatan / Pesan Tambahan
                <span className="ml-1 text-muted-foreground font-normal normal-case">(opsional)</span>
              </Label>
              <Textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Contoh: Mohon segera melunasi sebelum jatuh tempo..."
                className="resize-none text-sm border-2 rounded-xl min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pb-2">
              {/* Download PDF */}
              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="w-full h-12 font-black text-sm rounded-xl shadow-md"
              >
                {isDownloading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Membuat PDF...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" /> Download Invoice PDF
                  </span>
                )}
              </Button>

              {/* Send via WA */}
              <Button
                onClick={handleSendWhatsApp}
                variant="outline"
                className="w-full h-11 font-bold text-sm rounded-xl border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Kirim via WhatsApp
                {customer?.phone ? (
                  <span className="ml-1 text-xs opacity-70">({customer.phone})</span>
                ) : null}
              </Button>

              {/* Send via Email */}
              <Button
                onClick={handleSendEmail}
                variant="outline"
                disabled={!customer?.email}
                className="w-full h-11 font-bold text-sm rounded-xl border-2"
              >
                <Send className="h-4 w-4 mr-2" />
                Kirim via Email
                {customer?.email ? (
                  <span className="ml-1 text-xs opacity-70 truncate">({customer.email})</span>
                ) : (
                  <span className="ml-1 text-xs text-muted-foreground">(email tidak ada)</span>
                )}
              </Button>

              {/* Copy public link */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="h-9 text-xs font-bold border rounded-lg"
                >
                  {linkCopied ? (
                    <CheckCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {linkCopied ? "Tersalin!" : "Salin Link"}
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="h-9 text-xs font-bold border rounded-lg"
                >
                  <a
                    href={`/transaksi/${(booking as any).public_token || booking.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Buka Online
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
