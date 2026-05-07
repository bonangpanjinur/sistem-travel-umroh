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
  "departure-detail": "Detail Keberangkatan",
  savings: "Tabungan",
  "master-data": "Master Data",
  branches: "Cabang",
  bookings: "Booking",
  payments: "Pembayaran",
  finance: "Laba/Rugi",
  vendors: "Vendor",
  customers: "Jamaah",
  users: "Manajemen User",
  "user-permissions": "Hak Akses",
  agents: "Agent",
  coupons: "Kupon",
  loyalty: "Loyalty",
  referrals: "Referral",
  support: "Tiket Support",
  leads: "CRM Leads",
  "landing-pages": "Landing Page",
  "room-assignments": "Kamar",
  reports: "Laporan",
  "advanced-reports": "Laporan Lanjutan",
  "scheduled-reports": "Laporan Terjadwal",
  hr: "SDM (HR)",
  payroll: "Payroll",
  haji: "Haji",
  "itinerary-templates": "Template Itinerary",
  "offline-content": "Konten Offline",
  "document-verification": "Verifikasi Dokumen",
  "documents-generator": "Generate Surat",
  "security-audit": "Security Audit",
  "2fa": "2FA Settings",
  whatsapp: "WhatsApp",
  appearance: "Tampilan",
  settings: "Edit Profil",
  "package-types": "Tipe Paket",
  airlines: "Maskapai",
  airports: "Bandara",
  hotels: "Hotel",
  muthawifs: "Muthawif",
  "bus-providers": "Bus Provider",
  "marketing-materials": "Materi Promosi",
};

export function AdminBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // Don't show breadcrumb on dashboard (just /admin)
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    // Check if this is a UUID (ID)
    const isUuid = /^[0-9a-f]{8}-/.test(seg);
    let label = PATH_LABELS[seg] || seg;
    
    if (isUuid) {
      // If previous segment was 'customers', it's a customer detail
      const prevSeg = segments[i - 1];
      if (prevSeg === 'customers') {
        label = "Detail Jamaah";
      } else if (prevSeg === 'departures' || prevSeg === 'packages') {
        label = "Detail Keberangkatan";
      } else {
        label = "Detail";
      }
    }
    return {
      label,
      path: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
      isUuid,
    };
  });

  return (
    <Breadcrumb className="mb-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.path}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
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
