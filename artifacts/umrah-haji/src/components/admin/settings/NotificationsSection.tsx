import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, Smartphone, Mail } from "lucide-react";
import { SectionHead } from "./SectionHead";

const WHATSAPP_ITEMS = [
  { key: "whatsapp_booking",   label: "Konfirmasi Booking",     desc: "Saat booking baru berhasil" },
  { key: "whatsapp_payment",   label: "Konfirmasi Pembayaran",  desc: "Saat pembayaran diterima" },
  { key: "whatsapp_departure", label: "Reminder Keberangkatan", desc: "3 hari sebelum berangkat" },
] as const;

const EMAIL_ITEMS = [
  { key: "email_booking", label: "Invoice Otomatis",  desc: "Kirim invoice saat booking dibuat" },
  { key: "email_payment", label: "Kwitansi Otomatis", desc: "Kirim kwitansi setelah pembayaran" },
] as const;

type NotifKey =
  | "whatsapp_booking" | "whatsapp_payment" | "whatsapp_departure"
  | "email_booking" | "email_payment";

export function NotificationsSection() {
  const [notif, setNotif] = useState<Record<NotifKey, boolean>>({
    whatsapp_booking: true, whatsapp_payment: true, whatsapp_departure: true,
    email_booking: false, email_payment: false,
  });

  return (
    <>
      <SectionHead icon={Bell} title="Notifikasi" desc="Atur pengiriman pesan otomatis ke jamaah dan admin" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" />WhatsApp</CardTitle>
          <CardDescription>Notifikasi otomatis via WhatsApp Business API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {WHATSAPP_ITEMS.map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notif[item.key]}
                onCheckedChange={v => setNotif(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Hubungkan WhatsApp Business API melalui menu <strong>Integrasi → WhatsApp</strong> untuk mengaktifkan.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Email</CardTitle>
          <CardDescription>Notifikasi otomatis via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {EMAIL_ITEMS.map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notif[item.key]}
                onCheckedChange={v => setNotif(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}