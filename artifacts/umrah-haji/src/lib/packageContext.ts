import { supabase as supabaseRaw } from "@/integrations/supabase/client";

const supabase: any = supabaseRaw;

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export async function buildPackageContext(): Promise<string> {
  try {
    const { data: packages } = await supabase
      .from("packages")
      .select(`
        id, name, package_type, duration_days, description,
        hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star_rating),
        hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star_rating),
        airline:airlines(name),
        departures(departure_date, price_quad, price_triple, price_double, price_single, status, quota, booked_count)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (!packages?.length) return "";

    const today = new Date().toISOString();
    const lines: string[] = ["=== PAKET YANG TERSEDIA SAAT INI ==="];

    for (const pkg of packages) {
      const upcoming = (pkg.departures || [])
        .filter((d: any) => d.departure_date >= today && d.status !== "cancelled")
        .sort((a: any, b: any) => a.departure_date.localeCompare(b.departure_date));

      const nearestDep = upcoming[0];
      const seatLeft = nearestDep
        ? (nearestDep.quota - (nearestDep.booked_count || 0))
        : null;

      const parts: string[] = [];
      parts.push(`📦 ${pkg.name}`);
      parts.push(`   Tipe: ${pkg.package_type || "Umroh"} | Durasi: ${pkg.duration_days || "?"} hari`);

      if (pkg.hotel_makkah?.name) {
        const stars = pkg.hotel_makkah.star_rating ? "★".repeat(pkg.hotel_makkah.star_rating) : "";
        parts.push(`   Hotel Makkah: ${pkg.hotel_makkah.name} ${stars}`);
      }
      if (pkg.hotel_madinah?.name) {
        const stars = pkg.hotel_madinah.star_rating ? "★".repeat(pkg.hotel_madinah.star_rating) : "";
        parts.push(`   Hotel Madinah: ${pkg.hotel_madinah.name} ${stars}`);
      }
      if (pkg.airline?.name) parts.push(`   Maskapai: ${pkg.airline.name}`);

      if (nearestDep) {
        parts.push(`   Keberangkatan terdekat: ${formatDate(nearestDep.departure_date)}`);
        if (nearestDep.price_quad) parts.push(`   Harga quad/kamar: ${formatCurrency(nearestDep.price_quad)}/orang`);
        if (nearestDep.price_triple) parts.push(`   Harga triple: ${formatCurrency(nearestDep.price_triple)}/orang`);
        if (nearestDep.price_double) parts.push(`   Harga double: ${formatCurrency(nearestDep.price_double)}/orang`);
        if (seatLeft !== null && seatLeft >= 0) {
          parts.push(`   Sisa kursi: ${seatLeft} seat${seatLeft <= 5 ? " ⚠️ Hampir habis!" : ""}`);
        }
      } else {
        parts.push(`   Keberangkatan: Hubungi kami untuk info jadwal`);
      }

      if (pkg.description) {
        const shortDesc = pkg.description.replace(/<[^>]+>/g, "").slice(0, 120);
        if (shortDesc.trim()) parts.push(`   Deskripsi: ${shortDesc}...`);
      }

      lines.push(parts.join("\n"));
    }

    lines.push("=== AKHIR DATA PAKET ===");
    lines.push("Gunakan data di atas untuk menjawab pertanyaan calon jamaah tentang paket, harga, dan ketersediaan.");
    return lines.join("\n\n");
  } catch {
    return "";
  }
}
