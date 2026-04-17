import { useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

const PATH_LABELS: Record<string, string> = {
  admin: "Admin",
  analytics: "Analytics",
  packages: "Paket",
  departures: "Keberangkatan",
  savings: "Tabungan",
  "master-data": "Master Data",
  branches: "Cabang",
  bookings: "Booking",
  payments: "Pembayaran",
  finance: "Laba/Rugi",
  vendors: "Vendor",
  customers: "Jamaah",

  // users: "Users",
  // permissions: "Hak Akses",
  agents: "Agent",
  coupons: "Kupon",
  loyalty: "Loyalty",
  referrals: "Referral",
  support: "Tiket Support",
  leads: "CRM Leads",
  "room-assignments": "Kamar",
  reports: "Laporan",
  "advanced-reports": "Laporan Lanjutan",
  "scheduled-reports": "Laporan Terjadwal",
  hr: "Karyawan",
  haji: "Haji",
  "itinerary-templates": "Template Itinerary",
  "offline-content": "Konten Offline",
  "document-verification": "Verifikasi Dokumen",
  "documents-generator": "Generate Surat",
  // security: "Security Audit",
  // "2fa": "2FA",
  whatsapp: "WhatsApp",
  appearance: "Tampilan",
  settings: "Pengaturan",
};

export function AdminBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // Don't show breadcrumb on dashboard (just /admin)
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: PATH_LABELS[seg] || seg,
    path: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
    isUuid: /^[0-9a-f]{8}-/.test(seg),
  }));

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.path}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.isUuid ? "Detail" : crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.path}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
