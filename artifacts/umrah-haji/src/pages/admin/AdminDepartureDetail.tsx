import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDate, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Plane,
  Users,
  Package,
  MapPin,
  Hotel,
  FileDown,
  Printer,
  Calendar,
  ScanLine,
  Bug,
  CheckCircle2,
  LockKeyhole,
  ChevronDown,
  BedDouble,
  ExternalLink,
  CreditCard,
  ChevronDownIcon,
  Search,
  Zap,
  ClipboardCheck,
  ShieldCheck,
  Mail,
  Bell,
  TrendingUp,
  UserCheck,
  UserX,
  Send,
  Layers,
  PlusCircle,
  RefreshCw,
  BarChart3,
  ClipboardList,
  Users,
} from "lucide-react";
import { DepartureForm } from "@/components/admin/forms/DepartureForm";
import { LinkItineraryForm } from "@/components/admin/forms/LinkItineraryForm";
import { DepartureItineraryEditor } from "@/components/admin/departure/DepartureItineraryEditor";
import { EquipmentRealizationTab } from "@/components/operational/equipment/EquipmentRealizationTab";
import { CheckinQRDialog } from "@/components/admin/departure/CheckinQRDialog";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { DepartureRoomingTab } from "@/components/departure/DepartureRoomingTab";

import { DepartureBudgetTab } from "@/components/departure/DepartureBudgetTab";
import { useDepartureBudget, useDepartureCosts, computeBudgetSummary } from "@/hooks/useDepartureBudget";
import { DepartureCertificateGenerator } from "@/components/departure/DepartureCertificateGenerator";
import { PriceHistoryCard } from "@/components/admin/PriceHistoryCard";
import { DepartureMarginCalculator } from "@/components/admin/financial/DepartureMarginCalculator";
import { DeparturePLSummaryCard } from "@/components/admin/financial/DeparturePLSummaryCard";
import { DepartureCostItemsCard } from "@/components/admin/financial/DepartureCostItemsCard";
import { DepartureExpensesCard } from "@/components/admin/financial/DepartureExpensesCard";
import { DepartureOtherRevenuesCard } from "@/components/admin/financial/DepartureOtherRevenuesCard";
import { useMarginAlert } from "@/hooks/useMarginAlert";
import { DeparturePreChecklist } from "@/components/admin/departure/DeparturePreChecklist";
import { DepartureVisaSummary } from "@/components/admin/departure/DepartureVisaSummary";
import { DepartureCommissionCard } from "@/components/admin/financial/DepartureCommissionCard";
import { BulkChecklistApplyDialog } from "@/components/admin/departure/BulkChecklistApplyDialog";
import { DepartureMuthawifPanel } from "@/components/admin/departure/DepartureMuthawifPanel";
import { DepartureCapacityVisual } from "@/components/admin/departure/DepartureCapacityVisual";
import { DepartureReadinessDashboard } from "@/components/departure/DepartureReadinessDashboard";
import { DepartureWaitingListTab } from "@/components/departure/DepartureWaitingListTab";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function AdminDepartureDetail() {
  const { id } = useParams<{ id: string }>();
  
  const debugId = id;

  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<any>(null);

  // K6 — Email manifest state
  const [isEmailManifestOpen, setIsEmailManifestOpen] = useState(false);
  const [manifestEmail, setManifestEmail] = useState("");
  const [manifestEmailName, setManifestEmailName] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // K8 — H-X notification state
  const [sendingHX, setSendingHX] = useState<number | null>(null);
  const [bulkChecklistOpen, setBulkChecklistOpen] = useState(false);
  // isCopyingItinerary removed — handled inside DepartureItineraryEditor

  // K9 — Ringkasan budget di tab trigger
  const { data: _budgets = [] } = useDepartureBudget(id || "");
  const { data: _costs = [] } = useDepartureCosts(id || "");
  const _budgetSummary = computeBudgetSummary(_budgets, _costs);
  const totalBudgeted = _budgetSummary.reduce((s: number, r: any) => s + r.budgeted, 0);
  const totalRealized = _budgetSummary.reduce((s: number, r: any) => s + r.realized, 0);

  // If no id, show error
  if (!id) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error: ID tidak ditemukan di URL</p>
        <p className="text-sm text-muted-foreground mt-2">Pastikan URL memiliki format: /admin/departures/[ID]</p>
        <p className="text-xs text-muted-foreground mt-4 font-mono bg-muted p-2 rounded">ID dari URL: {debugId || "KOSONG"}</p>
      </div>
    );
  }

  // Fetch departure detail
  const { data: departure, isLoading: departureLoading } = useQuery({
    queryKey: ["admin-departure-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(
          `
          *,
          package:packages(id, name, code),
          departure_airport:airports!departures_departure_airport_id_fkey(code, name, city),
          arrival_airport:airports!departures_arrival_airport_id_fkey(code, name, city),
          airline:airlines(code, name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
          muthawif:muthawifs(name),
          team_leader:customers!departures_team_leader_id_fkey(full_name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch passengers for this departure (refactored: two-step query to avoid PostgREST nested filter issues)
  const { data: passengers, isLoading: passengersLoading } = useQuery({
    queryKey: ["departure-passengers", id],
    queryFn: async () => {
      // Step 1: Fetch all active bookings for this departure (exclude cancelled)
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, booking_code, room_type, booking_status, payment_status, customer_id")
        .eq("departure_id", id!)
        .neq("booking_status", "cancelled");

      if (bookingsError) {
        throw bookingsError;
      }
      if (!bookings || bookings.length === 0) {
        return [];
      }

      const bookingIds = bookings.map((b) => b.id);
      const bookingMap = new Map(bookings.map((b) => [b.id, b]));

      // Step 2: Fetch booking_passengers for these bookings
      const { data: bps, error: bpsError } = await supabase
        .from("booking_passengers")
        .select(
          `
          id,
          booking_id,
          is_main_passenger,
          room_preference,
          passenger_type,
          customer:customers(
            id, full_name, gender, birth_date,
            passport_number, passport_expiry, phone
          )
        `
        )
        .in("booking_id", bookingIds)
        .order("is_main_passenger", { ascending: false });

      if (bpsError) {
        throw bpsError;
      }

      // Step 3: Identify bookings missing a main_passenger row → build virtual passenger from booking.customer_id
      const bookingsWithMain = new Set(
        (bps || [])
          .filter((p: any) => p.is_main_passenger)
          .map((p: any) => p.booking_id)
      );
      const missingMainBookings = bookings.filter(
        (b) => !bookingsWithMain.has(b.id) && b.customer_id
      );

      let virtualPassengers: any[] = [];
      if (missingMainBookings.length > 0) {
        const customerIds = missingMainBookings.map((b) => b.customer_id);
        const { data: customers } = await supabase
          .from("customers")
          .select("id, full_name, gender, birth_date, passport_number, passport_expiry, phone")
          .in("id", customerIds);

        const customerMap = new Map((customers || []).map((c) => [c.id, c]));
        virtualPassengers = missingMainBookings.map((b) => ({
          id: `virtual-${b.id}`,
          booking_id: b.id,
          is_main_passenger: true,
          room_preference: b.room_type,
          passenger_type: "adult",
          customer: customerMap.get(b.customer_id!) || null,
          _virtual: true,
        }));
      }

      // Step 4: Combine + attach booking info, sort by booking_code then main first
      const combined = [...(bps || []), ...virtualPassengers].map((p: any) => ({
        ...p,
        booking: bookingMap.get(p.booking_id) || null,
      }));

      // Step 5: Ambil data nomor kamar dari room_assignments (sumber kebenaran)
      const customerIds = combined.map((p: any) => p.customer?.id).filter(Boolean);
      let roomMap = new Map<string, { makkah?: string; madinah?: string; generic?: string }>();
      if (customerIds.length > 0) {
        const { data: occupants } = await supabase
          .from("room_occupants")
          .select(`
            customer_id,
            room_assignment:room_assignments!inner(
              room_number, room_type, hotel_id, departure_id,
              hotel:hotels(city)
            )
          `)
          .in("customer_id", customerIds)
          .eq("room_assignment.departure_id", id!);
        (occupants || []).forEach((o: any) => {
          const ra = o.room_assignment;
          if (!ra) return;
          const cur = roomMap.get(o.customer_id) || {};
          const city = (ra.hotel?.city || "").toLowerCase();
          if (city.includes("mak")) cur.makkah = ra.room_number;
          else if (city.includes("mad")) cur.madinah = ra.room_number;
          else cur.generic = ra.room_number;
          roomMap.set(o.customer_id, cur);
        });
      }
      combined.forEach((p: any) => {
        const r = p.customer?.id ? roomMap.get(p.customer.id) : undefined;
        if (r) {
          const parts = [
            r.makkah ? `MK:${r.makkah}` : null,
            r.madinah ? `MD:${r.madinah}` : null,
            r.generic ?? null,
          ].filter(Boolean);
          p.room_number = parts.join(" / ") || "-";
        } else {
          p.room_number = "-";
        }
      });

      combined.sort((a: any, b: any) => {
        const codeA = a.booking?.booking_code || "";
        const codeB = b.booking?.booking_code || "";
        if (codeA !== codeB) return codeA.localeCompare(codeB);
        return (b.is_main_passenger ? 1 : 0) - (a.is_main_passenger ? 1 : 0);
      });

      return combined;
    },
    enabled: !!id,
  });

  // Margin alert — watches HPP cache; fires toast when margin drops below target
  // after any HPP mutation regardless of which tab is active.
  useMarginAlert({
    departureId: id || "",
    paxCount: passengers?.length || 0,
    priceQuad:   Number((departure as any)?.price_quad)   || 0,
    priceTriple: Number((departure as any)?.price_triple) || 0,
    priceDouble: Number((departure as any)?.price_double) || 0,
    priceSingle: Number((departure as any)?.price_single) || 0,
    targetPct: 20,
    enabled: !!departure,
  });

  // Fetch attendance records for this departure (real-time)
  const { data: attendance } = useQuery({
    queryKey: ["departure-attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, customer_id, checkpoint, checked_in_at")
        .eq("departure_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Realtime subscription for attendance updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`attendance-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `departure_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["departure-attendance", id],
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Map customer_id -> attendance record (latest checkpoint)
  const attendanceMap = useMemo(() => {
    const m = new Map<string, { checkpoint: string; checked_in_at: string }>();
    (attendance || []).forEach((a) => {
      if (a.customer_id) {
        m.set(a.customer_id, {
          checkpoint: a.checkpoint,
          checked_in_at: a.checked_in_at || "",
        });
      }
    });
    return m;
  }, [attendance]);

  // Filtered passengers based on UI filters + search (K3)
  const filteredPassengers = useMemo(() => {
    if (!passengers) return [];
    return passengers.filter((p: any) => {
      if (statusFilter !== "all") {
        const s = p.booking?.booking_status || p.booking?.payment_status;
        if (s !== statusFilter) return false;
      }
      if (typeFilter !== "all") {
        if ((p.passenger_type || "adult") !== typeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.customer?.full_name || "").toLowerCase();
        const passport = (p.customer?.passport_number || "").toLowerCase();
        const phone = (p.customer?.phone || "").toLowerCase();
        const code = (p.booking?.booking_code || "").toLowerCase();
        if (!name.includes(q) && !passport.includes(q) && !phone.includes(q) && !code.includes(q))
          return false;
      }
      return true;
    });
  }, [passengers, statusFilter, typeFilter, searchQuery]);

  // Customer IDs for visa summary (K1)
  const customerIds = useMemo(
    () => (passengers || []).map((p: any) => p.customer?.id).filter(Boolean) as string[],
    [passengers]
  );

  const passengerStats = useMemo(() => {
    const stats = {
      total: passengers?.length || 0,
      confirmed: 0,
      pending: 0,
      paid: 0,
      adult: 0,
      child: 0,
      infant: 0,
      checkedIn: 0,
    };
    (passengers || []).forEach((p: any) => {
      const s = p.booking?.booking_status;
      const ps = p.booking?.payment_status;
      if (s === "confirmed" || s === "completed") stats.confirmed += 1;
      else if (s === "pending" || s === "processing") stats.pending += 1;
      if (ps === "paid") stats.paid += 1;
      const t = (p.passenger_type || "adult").toLowerCase();
      if (t === "child") stats.child += 1;
      else if (t === "infant") stats.infant += 1;
      else stats.adult += 1;
      if (p.customer?.id && attendanceMap.has(p.customer.id))
        stats.checkedIn += 1;
    });
    return stats;
  }, [passengers, attendanceMap]);

  // Debug data
  const debugData = useMemo(() => {
    const totalPassengers = passengers?.length || 0;
    const realRows = (passengers || []).filter((p: any) => !p._virtual).length;
    const virtualRows = (passengers || []).filter((p: any) => p._virtual);
    const bookingsSeen = new Set<string>();
    (passengers || []).forEach((p: any) => {
      if (p.booking_id) bookingsSeen.add(p.booking_id);
    });
    return {
      totalPassengers,
      realRows,
      virtualCount: virtualRows.length,
      bookingsCount: bookingsSeen.size,
      virtualBookings: virtualRows.map((v: any) => ({
        booking_code: v.booking?.booking_code,
        booking_id: v.booking_id,
        customer: v.customer?.full_name,
      })),
    };
  }, [passengers]);

  // Fetch itinerary for this departure
  const { data: itinerary } = useQuery({
    queryKey: ["departure-itinerary", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_itineraries")
        .select(
          `
          *,
          itinerary_template:itinerary_templates(id, name, description, duration_days, days)
        `
        )
        .eq("departure_id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!id,
  });

  // P2.4 — Rekonsiliasi kuota dari halaman detail
  const recalcDetailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('recalculate_departure_booked_count', {
        p_departure_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kuota berhasil disinkronkan');
      queryClient.invalidateQueries({ queryKey: ['admin-departure-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-departures'] });
    },
    onError: (e: any) => toast.error('Gagal sinkronkan kuota: ' + (e?.message ?? 'unknown')),
  });

  // K4 — Quick status change mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("departures")
        .update({ status: newStatus })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["admin-departure-detail", id] });
      toast.success(`Status diubah ke: ${newStatus}`);
    },
    onError: (err: any) => toast.error("Gagal ubah status: " + err.message),
  });

  // K6 — Send manifest via email
  const sendManifestEmail = async () => {
    if (!manifestEmail.trim()) {
      toast.error("Masukkan alamat email tujuan");
      return;
    }
    if (!departure || !passengers || passengers.length === 0) {
      toast.error("Tidak ada data jamaah untuk dikirim");
      return;
    }
    setIsSendingEmail(true);
    try {
      const pkgName = departure.package?.name || "Manifest";
      const depDate = departure.departure_date
        ? format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })
        : "-";
      const rows = (filteredPassengers.length > 0 ? filteredPassengers : passengers)
        .map((p: any, i: number) => `
          <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"}">
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${i + 1}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${p.customer?.full_name || "-"}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${p.customer?.gender === "male" ? "L" : "P"}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${p.customer?.passport_number || "-"}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${p.customer?.passport_expiry ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy") : "-"}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${(p.booking?.room_type || "-").toUpperCase()}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${p.room_number || "-"}</td>
            <td style="padding:6px 8px;border:1px solid #e5e7eb">${p.customer?.phone || "-"}</td>
          </tr>`)
        .join("");
      const body = `
        <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto">
          <h2 style="color:#1e40af">✈️ Manifest Jamaah — ${pkgName}</h2>
          <p><strong>Tanggal Berangkat:</strong> ${depDate}</p>
          <p><strong>No. Flight:</strong> ${departure.flight_number || "-"} &nbsp;|&nbsp; <strong>Total Jamaah:</strong> ${passengers.length} orang</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
            <thead>
              <tr style="background:#1e40af;color:#fff">
                <th style="padding:8px;border:1px solid #1e40af">No</th>
                <th style="padding:8px;border:1px solid #1e40af">Nama Lengkap</th>
                <th style="padding:8px;border:1px solid #1e40af">L/P</th>
                <th style="padding:8px;border:1px solid #1e40af">No. Paspor</th>
                <th style="padding:8px;border:1px solid #1e40af">Exp. Paspor</th>
                <th style="padding:8px;border:1px solid #1e40af">Tipe Kamar</th>
                <th style="padding:8px;border:1px solid #1e40af">No. Kamar</th>
                <th style="padding:8px;border:1px solid #1e40af">Telepon</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:16px;color:#6b7280;font-size:12px">Dikirim oleh sistem Vinstour Travel • ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })}</p>
        </div>`;
      const resp = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: manifestEmail.trim(),
          toName: manifestEmailName.trim() || undefined,
          template: "custom",
          subject: `Manifest Jamaah — ${pkgName} (${depDate})`,
          body,
        }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.error || "Gagal mengirim email");
      toast.success("Manifest berhasil dikirim ke " + manifestEmail);
      setIsEmailManifestOpen(false);
      setManifestEmail("");
      setManifestEmailName("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim email manifest");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // K8 — Send H-X WA blast to all passengers with phone
  const sendHXNotification = async (daysAhead: number) => {
    if (!departure || !passengers || passengers.length === 0) {
      toast.error("Tidak ada jamaah untuk dinotifikasi");
      return;
    }
    const targets = passengers.filter((p: any) => p.customer?.phone);
    if (targets.length === 0) {
      toast.error("Tidak ada nomor WA yang tersedia");
      return;
    }
    setSendingHX(daysAhead);
    let successCount = 0;
    let failCount = 0;
    const pkgName = departure.package?.name || "Paket";
    const depDate = departure.departure_date
      ? format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })
      : "-";
    const depAirport = departure.departure_airport?.code || "-";

    for (const p of targets) {
      try {
        const resp = await fetch("/api/whatsapp/notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: p.customer.phone,
            name: p.customer.full_name,
            type: "departure_reminder",
            data: {
              customerName: p.customer.full_name,
              packageName: pkgName,
              departureDate: depDate,
              departureAirport: depAirport,
              daysUntilDeparture: daysAhead,
              flightNumber: departure.flight_number || "-",
            },
          }),
        });
        if (resp.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    setSendingHX(null);
    if (successCount > 0) toast.success(`H-${daysAhead} blast terkirim ke ${successCount} jamaah`);
    if (failCount > 0) toast.error(`${failCount} pesan gagal terkirim`);
  };

  const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
    open:     { next: "closed",   label: "Tutup Pendaftaran",  color: "bg-yellow-500 hover:bg-yellow-600" },
    closed:   { next: "full",     label: "Tandai Penuh",       color: "bg-orange-500 hover:bg-orange-600" },
    full:     { next: "departed", label: "Tandai Berangkat",   color: "bg-blue-600 hover:bg-blue-700" },
    departed: { next: "open",     label: "Buka Kembali",       color: "bg-green-600 hover:bg-green-700" },
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500">Buka</Badge>;
      case "closed":
        return <Badge variant="secondary">Tutup</Badge>;
      case "full":
        return <Badge variant="destructive">Penuh</Badge>;
      case "departed":
        return <Badge variant="outline">Berangkat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportManifestPDF = async () => {
    const sourceList = filteredPassengers.length > 0 ? filteredPassengers : passengers || [];
    if (sourceList.length === 0 || !departure) {
      toast.error("Tidak ada data jamaah untuk diekspor");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    const pkgName = departure.package?.name || "Manifest";

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Manifest Jamaah - ${pkgName}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Tanggal Berangkat: ${format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })}`,
      14,
      28
    );
    const adultCount = sourceList.filter((p: any) => (p.passenger_type || "adult") === "adult").length;
    const childCount = sourceList.filter((p: any) => p.passenger_type === "child").length;
    const infantCount = sourceList.filter((p: any) => p.passenger_type === "infant").length;
    const paxBreakdown = [
      `${adultCount} Dewasa`,
      ...(childCount > 0 ? [`${childCount} Anak`] : []),
      ...(infantCount > 0 ? [`${infantCount} Bayi`] : []),
    ].join(", ");

    doc.text(
      `Flight: ${departure.flight_number || "-"} | Total: ${sourceList.length} jamaah (${paxBreakdown})`,
      14,
      34
    );

    const qrUrls = await Promise.all(
      sourceList.map(async (p: any) => {
        if (!p.customer?.id) return null;
        try {
          return await QRCode.toDataURL(`CUST:${p.customer.id}`, {
            width: 80,
            margin: 0,
          });
        } catch {
          return null;
        }
      })
    );

    autoTable(doc, {
      startY: 42,
      head: [
        [
          "No",
          "QR",
          "Nama Lengkap",
          "L/P",
          "No. Paspor",
          "Exp. Paspor",
          "Tipe Kamar",
          "Kamar",
          "Tipe Pax",
          "Telepon",
        ],
      ],
      body: sourceList.map((p: any, idx: number) => [
        (idx + 1).toString(),
        "",
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
        p.customer?.passport_number || "-",
        p.customer?.passport_expiry
          ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy")
          : "-",
        (p.booking?.room_type || "-").toUpperCase(),
        p.room_number || "-",
        (p.passenger_type || "adult").toUpperCase(),
        p.customer?.phone || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2, minCellHeight: 14 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { cellWidth: 14 } },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const url = qrUrls[data.row.index];
          if (url) {
            doc.addImage(url, "PNG", data.cell.x + 1, data.cell.y + 1, 12, 12);
          }
        }
      },
    });

    doc.save(`Manifest-${pkgName}-${departure.departure_date}.pdf`);
    toast.success("Manifest PDF berhasil di-download");
  };

  const exportRoomingListPDF = () => {
    const sourceList = filteredPassengers.length > 0 ? filteredPassengers : passengers || [];
    if (sourceList.length === 0 || !departure) {
      toast.error("Tidak ada data jamaah untuk diekspor");
      return;
    }
    const doc = new jsPDF();
    const pkgName = departure.package?.name || "Rooming List";

    const roomGroups: { [key: string]: any[] } = {};
    sourceList.forEach((p: any) => {
      const roomType = p.booking?.room_type || "unknown";
      if (!roomGroups[roomType]) roomGroups[roomType] = [];
      roomGroups[roomType].push(p);
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rooming List - ${pkgName}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Tanggal Berangkat: ${format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })}`,
      14,
      28
    );

    let startY = 36;
    Object.entries(roomGroups).forEach(([roomType, pax]) => {
      const roomsNeeded = Math.ceil(
        pax.length /
          (roomType === "single"
            ? 1
            : roomType === "double"
              ? 2
              : roomType === "triple"
                ? 3
                : 4)
      );

      doc.setFont("helvetica", "bold");
      doc.text(
        `${roomType.toUpperCase()} (${roomsNeeded} kamar untuk ${pax.length} jamaah)`,
        14,
        startY
      );
      startY += 6;

      const tableRows = pax.map((p: any, idx: number) => [
        (idx + 1).toString(),
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
        p.room_number || "-",
        p.booking?.booking_code || "-",
        (p.passenger_type || "adult").toUpperCase(),
      ]);

      autoTable(doc, {
        startY,
        head: [["No", "Nama Jamaah", "L/P", "No. Kamar", "Booking", "Tipe"]],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 150, 200], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
    });

    doc.save(`RoomingList-${pkgName}-${departure.departure_date}.pdf`);
    toast.success("Rooming List PDF berhasil di-download");
  };

  const exportManifestExcel = () => {
    const sourceList = filteredPassengers.length > 0 ? filteredPassengers : passengers || [];
    if (sourceList.length === 0 || !departure) {
      toast.error("Tidak ada data jamaah untuk diekspor");
      return;
    }
    const pkgName = departure.package?.name || "Manifest";

    const rows = sourceList.map((p: any, idx: number) => ({
      "No": idx + 1,
      "Nama Lengkap": p.customer?.full_name || "-",
      "L/P": p.customer?.gender === "male" ? "L" : "P",
      "NIK": p.customer?.nik || "-",
      "No. Paspor": p.customer?.passport_number || "-",
      "Exp. Paspor": p.customer?.passport_expiry
        ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy")
        : "-",
      "Tipe Kamar": (p.booking?.room_type || "-").toUpperCase(),
      "No. Kamar": p.room_number || "-",
      "Tipe Pax": (p.passenger_type || "adult").toUpperCase(),
      "Telepon": p.customer?.phone || "-",
      "Email": p.customer?.email || "-",
      "Kode Booking": p.booking?.booking_code || "-",
      "Status Check-in": p.customer?.id && attendanceMap.has(p.customer.id) ? "Sudah Check-in" : "Belum",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 30 }, { wch: 5 }, { wch: 18 }, { wch: 16 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 },
      { wch: 28 }, { wch: 16 }, { wch: 14 },
    ];

    const wbInfo = [
      { "Keterangan": "Paket", "Nilai": pkgName },
      { "Keterangan": "Tanggal Berangkat", "Nilai": departure.departure_date ? format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId }) : "-" },
      { "Keterangan": "No. Penerbangan", "Nilai": departure.flight_number || "-" },
      { "Keterangan": "Total Jamaah", "Nilai": sourceList.length },
      { "Keterangan": "Dicetak", "Nilai": format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId }) },
    ];
    const wsInfo = XLSX.utils.json_to_sheet(wbInfo);
    wsInfo["!cols"] = [{ wch: 20 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInfo, "Info");
    XLSX.utils.book_append_sheet(wb, ws, "Manifest Jamaah");
    XLSX.writeFile(wb, `Manifest-${pkgName}-${departure.departure_date}.xlsx`);
    toast.success("Manifest Excel berhasil di-download");
  };

  const exportKeuanganExcel = async () => {
    if (!departure) return;
    const supabaseRaw: any = supabase;
    const { data: bookings, error } = await supabaseRaw
      .from("bookings")
      .select(`
        booking_code, total_price, paid_amount, payment_status,
        booking_status, payment_deadline, created_at,
        customer:customers(full_name, phone)
      `)
      .eq("departure_id", id!)
      .neq("booking_status", "cancelled")
      .order("booking_code");

    if (error || !bookings?.length) {
      toast.error("Tidak ada data keuangan untuk diekspor");
      return;
    }

    const pkgName = departure.package?.name || "Keberangkatan";

    const rows = bookings.map((b: any, idx: number) => ({
      "No":                idx + 1,
      "Kode Booking":      b.booking_code || "-",
      "Nama Jamaah":       b.customer?.full_name || "-",
      "Telepon":           b.customer?.phone || "-",
      "Total Harga":       b.total_price || 0,
      "Sudah Dibayar":     b.paid_amount || 0,
      "Sisa Pembayaran":   Math.max(0, (b.total_price || 0) - (b.paid_amount || 0)),
      "Status Pembayaran": b.payment_status || "-",
      "Status Booking":    b.booking_status || "-",
      "Batas Pelunasan":   b.payment_deadline
        ? format(new Date(b.payment_deadline), "dd/MM/yyyy")
        : "-",
      "Tgl Booking":       b.created_at
        ? format(new Date(b.created_at), "dd/MM/yyyy")
        : "-",
    }));

    // Baris total
    const totalHarga = bookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const totalBayar = bookings.reduce((s: number, b: any) => s + (b.paid_amount || 0), 0);
    rows.push({
      "No":                "" as any,
      "Kode Booking":      "TOTAL",
      "Nama Jamaah":       `${bookings.length} booking`,
      "Telepon":           "",
      "Total Harga":       totalHarga,
      "Sudah Dibayar":     totalBayar,
      "Sisa Pembayaran":   totalHarga - totalBayar,
      "Status Pembayaran": "",
      "Status Booking":    "",
      "Batas Pelunasan":   "",
      "Tgl Booking":       "",
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 }, { wch: 16 }, { wch: 28 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    ];

    // Info sheet
    const wsInfo = XLSX.utils.json_to_sheet([
      { "Keterangan": "Paket",              "Nilai": pkgName },
      { "Keterangan": "Tanggal Berangkat",  "Nilai": departure.departure_date ? format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId }) : "-" },
      { "Keterangan": "No. Penerbangan",    "Nilai": departure.flight_number || "-" },
      { "Keterangan": "Total Booking",      "Nilai": bookings.length },
      { "Keterangan": "Total Tagihan",      "Nilai": formatCurrency(totalHarga) },
      { "Keterangan": "Total Terbayar",     "Nilai": formatCurrency(totalBayar) },
      { "Keterangan": "Total Sisa",         "Nilai": formatCurrency(totalHarga - totalBayar) },
      { "Keterangan": "Dicetak",            "Nilai": format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId }) },
    ]);
    wsInfo["!cols"] = [{ wch: 20 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInfo, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Keuangan");
    XLSX.writeFile(wb, `Keuangan-${pkgName}-${departure.departure_date}.xlsx`);
    toast.success("Rekap Keuangan Excel berhasil di-download");
  };

  if (departureLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!departure) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Keberangkatan tidak ditemukan</p>
        <Button asChild className="mt-4">
          <Link to="/admin/departures">Kembali</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/departures">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {departure.departure_date ? formatDate(departure.departure_date) : <span className="text-orange-500 text-lg">Tanggal belum diatur</span>}
              </h1>
              {getStatusBadge(departure.status ?? '')}
            </div>
            <p className="text-muted-foreground">
              {departure.package?.name || "Tanpa Paket"} •{" "}
              {departure.airline?.code || "-"} {departure.flight_number || "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Akses cepat operasional */}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/room-assignments?departure=${id}`}>
              <BedDouble className="h-3.5 w-3.5 mr-1.5" />
              Kamar
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/manifest?departure=${id}`}>
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              Manifest
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/equipment?departure=${id}`}>
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Perlengkapan
            </Link>
          </Button>
          {/* Tambah Booking shortcut */}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/bookings/create?departure_id=${id}`}>
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Tambah Booking
            </Link>
          </Button>
          {/* K4 — Quick status change */}
          {departure?.status && STATUS_FLOW[departure.status as keyof typeof STATUS_FLOW] && (
            <Button
              size="sm"
              className={STATUS_FLOW[departure.status as keyof typeof STATUS_FLOW].color + " text-white"}
              onClick={() => statusMutation.mutate(STATUS_FLOW[departure.status as keyof typeof STATUS_FLOW].next)}
              disabled={statusMutation.isPending}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {STATUS_FLOW[departure.status as keyof typeof STATUS_FLOW].label}
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* D5 — Lock banner saat status departed */}
      {departure.status === 'departed' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <LockKeyhole className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">
              Data Terproteksi — Jamaah Sudah Berangkat
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Perubahan data tidak disarankan setelah jamaah berangkat. Gunakan tombol <strong>"Buka Kembali"</strong> di atas jika perlu mengedit.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        <TabsList className="flex w-full overflow-x-auto gap-0.5 h-auto flex-wrap">
          <TabsTrigger value="info" className="text-xs">Informasi</TabsTrigger>
          <TabsTrigger value="jamaah" className="text-xs">Jemaah</TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="kamar" className="text-xs">Kamar</TabsTrigger>
          <TabsTrigger value="perlengkapan" className="text-xs">Perlengkapan</TabsTrigger>
          <TabsTrigger value="itinerary" className="text-xs">Itinerary</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs flex flex-col items-center gap-0.5">
            <span>Budget</span>
            {(totalBudgeted > 0 || totalRealized > 0) && (
              <span className="text-[10px] font-normal text-muted-foreground leading-tight">
                {formatCurrency(totalRealized)} / {formatCurrency(totalBudgeted)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="harga" className="text-xs">Riwayat Harga</TabsTrigger>
          <TabsTrigger value="operasional" className="text-xs">Operasional</TabsTrigger>
          <TabsTrigger value="keuangan" className="text-xs flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Keuangan
          </TabsTrigger>
          <TabsTrigger value="daftar-tunggu" className="text-xs flex items-center gap-1">
            <Users className="h-3 w-3" />
            Daftar Tunggu
          </TabsTrigger>

        </TabsList>

        {/* Tab: Informasi */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Informasi Keberangkatan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informasi Keberangkatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tanggal Berangkat
                    </p>
                    <p className="font-semibold">
                      {formatDate(departure.departure_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tanggal Kembali
                    </p>
                    <p className="font-semibold">
                      {departure.return_date ? formatDate(departure.return_date) : <span className="text-muted-foreground">-</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="font-semibold">
                      {departure.package?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold">{getStatusBadge(departure.status ?? '')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Penerbangan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Penerbangan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Maskapai</p>
                  <p className="font-semibold">
                    {departure.airline?.code} - {departure.airline?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Flight</p>
                  <p className="font-semibold">{departure.flight_number || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Keberangkatan</p>
                    <p className="font-semibold">
                      {departure.departure_airport?.code} -{" "}
                      {departure.departure_airport?.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kedatangan</p>
                    <p className="font-semibold">
                      {departure.arrival_airport?.code} -{" "}
                      {departure.arrival_airport?.city}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hotel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Hotel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Makkah</p>
                  <p className="font-semibold">
                    {departure.hotel_makkah?.name || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ★ {departure.hotel_makkah?.star_rating || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Madinah</p>
                  <p className="font-semibold">
                    {departure.hotel_madinah?.name || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ★ {departure.hotel_madinah?.star_rating || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Kuota & Jemaah - sinkron dengan tabel jemaah (termasuk virtual) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Kuota & Jemaah
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => recalcDetailMutation.mutate()}
                    disabled={recalcDetailMutation.isPending}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${recalcDetailMutation.isPending ? 'animate-spin' : ''}`} />
                    Sinkronkan Kuota
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Jamaah Aktif (sinkron tabel)
                  </p>
                  <p className="text-2xl font-bold">
                    {passengerStats.total} / {departure.quota || 0}
                  </p>
                  {departure.booked_count !== passengerStats.total && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[11px] text-amber-600">
                        booked_count DB: {departure.booked_count || 0} (mismatch — klik Sinkronkan untuk memperbaiki)
                      </p>
                    </div>
                  )}
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full"
                    style={{
                      width: `${Math.min(100, (passengerStats.total / (departure.quota || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Adult</p>
                    <p className="font-semibold">{passengerStats.adult}</p>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Child</p>
                    <p className="font-semibold">{passengerStats.child}</p>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Infant</p>
                    <p className="font-semibold">{passengerStats.infant}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {Math.round((passengerStats.total / (departure.quota || 1)) * 100)}% Terisi
                  </span>
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {passengerStats.checkedIn} check-in
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tim — C4/C6: Multi-Muthawif + Conflict Check */}
            <DepartureMuthawifPanel
              departureId={id}
              departureDate={departure.departure_date}
              returnDate={departure.return_date}
            />

            {/* Harga */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Harga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Single:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_single || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Double:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_double || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Triple:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_triple || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Quad:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_quad || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* C9 — Departure Capacity Visual (room type breakdown) */}
          <DepartureCapacityVisual
            departureId={id}
            quota={departure.quota || 0}
            priceQuad={departure.price_quad || 0}
            priceTriple={departure.price_triple || 0}
            priceDouble={departure.price_double || 0}
            priceSingle={departure.price_single || 0}
          />

          {/* K8 — H-X Scheduled WA Notification */}
          {departure.departure_date && departure.status !== 'departed' && (() => {
            const daysLeft = Math.ceil(
              (new Date(departure.departure_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const passengerCount = passengers?.filter((p: any) => p.customer?.phone).length || 0;
            const hxOptions = [7, 3, 1];
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" />
                    Notifikasi H-X Keberangkatan
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (H-{daysLeft > 0 ? daysLeft : 0} saat ini • {passengerCount} jamaah punya WA)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Kirim WA blast pengingat keberangkatan ke seluruh jamaah yang memiliki nomor WhatsApp.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {hxOptions.map((day) => (
                      <Button
                        key={day}
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        onClick={() => sendHXNotification(day)}
                        disabled={sendingHX !== null || passengerCount === 0}
                      >
                        {sendingHX === day ? (
                          <span className="animate-pulse">Mengirim...</span>
                        ) : (
                          <>
                            <Bell className="h-3.5 w-3.5 mr-1.5" />
                            Kirim H-{day} Blast
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                  {passengerCount === 0 && (
                    <p className="text-xs text-destructive mt-2">Tidak ada nomor WA tersedia pada data jamaah.</p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* K5 — Post-trip summary (only when departed) */}
          {departure.status === 'departed' && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <TrendingUp className="h-5 w-5" />
                  Ringkasan Post-Trip
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                    <UserCheck className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                    <p className="text-2xl font-bold text-emerald-700">{passengerStats.checkedIn}</p>
                    <p className="text-xs text-muted-foreground mt-1">Jamaah Berangkat</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 text-center">
                    <UserX className="h-6 w-6 mx-auto text-red-500 mb-1" />
                    <p className="text-2xl font-bold text-red-600">{passengerStats.total - passengerStats.checkedIn}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tidak Berangkat</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                    <Users className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold text-blue-700">{passengerStats.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Jamaah</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold text-primary">
                      {passengerStats.total > 0
                        ? Math.round((passengerStats.checkedIn / passengerStats.total) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Tingkat Kehadiran</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kehadiran</span>
                    <span className="font-medium">{passengerStats.checkedIn}/{passengerStats.total} jamaah</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${passengerStats.total > 0 ? Math.min(100, (passengerStats.checkedIn / passengerStats.total) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="rounded bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Adult</p>
                    <p className="font-semibold">{passengerStats.adult}</p>
                  </div>
                  <div className="rounded bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Child</p>
                    <p className="font-semibold">{passengerStats.child}</p>
                  </div>
                  <div className="rounded bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Infant</p>
                    <p className="font-semibold">{passengerStats.infant}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Catatan Trip</p>
                  <p>Keberangkatan <strong>{departure.package?.name}</strong> pada {departure.departure_date ? format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId }) : "-"} telah selesai. 
                  Jamaah yang check-in: <strong>{passengerStats.checkedIn}</strong> dari <strong>{passengerStats.total}</strong> terdaftar ({passengerStats.total > 0 ? Math.round((passengerStats.checkedIn / passengerStats.total) * 100) : 0}% kehadiran).</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Readiness Dashboard */}
          <DepartureReadinessDashboard departureId={id || ""} />

          {/* K1 — Visa Status Summary + D5 Deadline Tracking */}
          {customerIds.length > 0 && (
            <DepartureVisaSummary
              departureId={id || ""}
              customerIds={customerIds}
              visaDeadline={(departure as any)?.visa_deadline}
            />
          )}

          {/* K7 — Sertifikat massal (hanya saat status = departed) */}
          {departure.status === 'departed' && (passengers?.length || 0) > 0 && (
            <DepartureCertificateGenerator
              departure={departure as any}
              passengers={passengers as any}
            />
          )}
        </TabsContent>

        {/* Tab: Jemaah */}
        <TabsContent value="jamaah" className="space-y-6">
          {/* Debug Panel */}
          <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full text-left flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Panel Debug</span>
                    <Badge variant="outline" className="text-[10px]">
                      {debugData.bookingsCount} booking · {debugData.realRows} pax · {debugData.virtualCount} virtual
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${debugOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">Bookings (aktif)</p>
                      <p className="text-lg font-semibold">{debugData.bookingsCount}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">Total Passenger</p>
                      <p className="text-lg font-semibold">{debugData.totalPassengers}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">Real Row (booking_passengers)</p>
                      <p className="text-lg font-semibold">{debugData.realRows}</p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                      <p className="text-amber-700">Virtual (kekurangan main)</p>
                      <p className="text-lg font-semibold text-amber-800">{debugData.virtualCount}</p>
                    </div>
                  </div>
                  {debugData.virtualBookings.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Booking yang kekurangan main passenger row:</p>
                      <div className="rounded-md border bg-background overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-2">Booking Code</th>
                              <th className="text-left p-2">Customer (dari bookings.customer_id)</th>
                              <th className="text-left p-2 font-mono">booking_id</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debugData.virtualBookings.map((vb, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2 font-mono">{vb.booking_code || "-"}</td>
                                <td className="p-2">{vb.customer || "(tidak ada)"}</td>
                                <td className="p-2 font-mono text-[10px] text-muted-foreground">{vb.booking_id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    Attendance tercatat: <span className="font-semibold text-foreground">{attendance?.length || 0}</span> entri |
                    Sudah check-in: <span className="font-semibold text-foreground">{passengerStats.checkedIn}</span>
                  </p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Daftar Jemaah ({filteredPassengers.length}
                  {filteredPassengers.length !== passengerStats.total && (
                    <span className="text-xs text-muted-foreground"> dari {passengerStats.total}</span>
                  )}
                  )
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* K3 — Search jamaah by name */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-9 pl-8 w-48 text-sm"
                      placeholder="Cari nama, paspor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-[130px]">
                      <SelectValue placeholder="Tipe Pax" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="adult">Adult ({passengerStats.adult})</SelectItem>
                      <SelectItem value="child">Child ({passengerStats.child})</SelectItem>
                      <SelectItem value="infant">Infant ({passengerStats.infant})</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => setIsCheckinOpen(true)}
                    disabled={!passengers || passengers.length === 0}
                  >
                    <ScanLine className="h-4 w-4 mr-2" />
                    QR Check-in
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={filteredPassengers.length === 0}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Export
                        <ChevronDownIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Manifest Jamaah</DropdownMenuLabel>
                      <DropdownMenuItem onClick={exportManifestPDF}>
                        <FileDown className="h-4 w-4 mr-2 text-blue-600" />
                        Manifest PDF (+ QR)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportManifestExcel}>
                        <FileDown className="h-4 w-4 mr-2 text-green-600" />
                        Manifest Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsEmailManifestOpen(true)}>
                        <Mail className="h-4 w-4 mr-2 text-purple-600" />
                        Kirim via Email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Kamar &amp; Keuangan</DropdownMenuLabel>
                      <DropdownMenuItem onClick={exportRoomingListPDF}>
                        <Printer className="h-4 w-4 mr-2 text-indigo-600" />
                        Rooming List PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportKeuanganExcel}>
                        <CreditCard className="h-4 w-4 mr-2 text-amber-600" />
                        Rekap Keuangan Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("kamar")}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <BedDouble className="h-4 w-4 mr-2" />
                    Kelola Kamar
                  </Button>
                  <Link to={`/admin/room-assignments?departure=${id}`}>
                    <Button size="sm" variant="ghost" className="text-primary">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Buka Rooming
                    </Button>
                  </Link>
                </div>
              </div>
              {passengerStats.total > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {/* Pax type breakdown */}
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                    {passengerStats.adult} Dewasa
                  </Badge>
                  {passengerStats.child > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                      {passengerStats.child} Anak
                    </Badge>
                  )}
                  {passengerStats.infant > 0 && (
                    <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 font-semibold">
                      {passengerStats.infant} Bayi
                    </Badge>
                  )}
                  <span className="text-muted-foreground self-center">·</span>
                  {/* Booking status */}
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {passengerStats.confirmed} confirmed
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {passengerStats.paid} paid
                  </Badge>
                  {passengerStats.pending > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {passengerStats.pending} pending
                    </Badge>
                  )}
                  <span className="text-muted-foreground self-center">·</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {passengerStats.checkedIn}/{passengerStats.total} check-in
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {passengersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPassengers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>Paspor</TableHead>
                        <TableHead>Exp. Paspor</TableHead>
                        <TableHead>Tipe Pax</TableHead>
                        <TableHead>Kamar</TableHead>
                        <TableHead>No. Kamar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Telepon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((p: any) => {
                        const bookingStatus = p.booking?.booking_status as string | undefined;
                        const paymentStatus = p.booking?.payment_status as string | undefined;
                        const statusVariant =
                          bookingStatus === "confirmed" || bookingStatus === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : bookingStatus === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-muted text-muted-foreground";
                        const checkin = p.customer?.id
                          ? attendanceMap.get(p.customer.id)
                          : undefined;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">
                              <Link
                                to={`/admin/bookings/${p.booking_id}`}
                                className="text-primary hover:underline"
                              >
                                {p.booking?.booking_code || "-"}
                              </Link>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {p.customer?.id ? (
                                  <Link
                                    to={`/admin/customers/${p.customer.id}`}
                                    className="text-primary hover:underline cursor-pointer"
                                  >
                                    {p.customer.full_name}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {p.customer?.full_name || "-"}
                                  </span>
                                )}
                                {p.is_main_passenger && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    Utama
                                  </Badge>
                                )}
                                {p._virtual && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                    virtual
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {p.customer?.gender === "male" ? "L" : "P"}
                            </TableCell>
                            <TableCell>{p.customer?.passport_number || "-"}</TableCell>
                            <TableCell>
                              {p.customer?.passport_expiry
                                ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell className="capitalize">
                              {p.passenger_type || "adult"}
                            </TableCell>
                            <TableCell>
                              {(p.booking?.room_type || "-").toUpperCase()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.room_number || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className={`text-[10px] capitalize ${statusVariant}`}>
                                  {bookingStatus || "-"}
                                </Badge>
                                {paymentStatus && (
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    bayar: {paymentStatus}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {checkin ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {format(new Date(checkin.checked_in_at), "HH:mm")}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">belum</span>
                              )}
                            </TableCell>
                            <TableCell>{p.customer?.phone || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {passengers && passengers.length > 0
                    ? "Tidak ada jamaah cocok dengan filter saat ini"
                    : "Belum ada jemaah terdaftar"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Tab: Kamar & Rooming */}
        <TabsContent value="kamar" className="space-y-4">
          <DepartureRoomingTab
            departureId={id}
            hotelMakkah={departure.hotel_makkah as any}
            hotelMadinah={departure.hotel_madinah as any}
          />
        </TabsContent>

        {/* Tab: Perlengkapan */}
        <TabsContent value="perlengkapan">
          <EquipmentRealizationTab selectedDeparture={id} />
        </TabsContent>

        {/* Tab: Itinerary — C3 Auto-Populate + Inline Edit */}
        <TabsContent value="itinerary" className="space-y-4">
          {/* Header: Template info + Kelola button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4" />
              <span>Itinerary Keberangkatan</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsItineraryOpen(true)}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              {itinerary ? "Ganti Template" : "Hubungkan Template"}
            </Button>
          </div>

          {itinerary ? (
            /* C3 — Full editable itinerary with copy-from-template */
            <DepartureItineraryEditor
              departureId={id || ""}
              departureDate={departure?.departure_date}
              itinerary={itinerary as any}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium mb-1">Belum ada template itinerary terhubung</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Hubungkan template itinerary, lalu salin ke departure ini untuk bisa mengedit per hari.
                </p>
                <Button onClick={() => setIsItineraryOpen(true)}>
                  <MapPin className="h-4 w-4 mr-2" />Hubungkan Template Itinerary
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Pre-Departure Checklist — K2 + Bulk Apply */}
        <TabsContent value="checklist" className="space-y-4">
          {/* Bulk apply banner */}
          <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Terapkan Template Checklist ke Semua Booking</p>
                <p className="text-[11px] text-muted-foreground">
                  Centang item yang sama ke seluruh jamaah dalam keberangkatan ini sekaligus
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-primary/40 hover:bg-primary/10 text-primary hover:text-primary"
              onClick={() => setBulkChecklistOpen(true)}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Bulk Apply
            </Button>
          </div>

          <DeparturePreChecklist
            departureId={id || ""}
            departure={departure}
            passengerStats={passengerStats}
            passengers={passengers || []}
          />

          {/* Bulk checklist dialog */}
          <BulkChecklistApplyDialog
            open={bulkChecklistOpen}
            onOpenChange={setBulkChecklistOpen}
            departureId={id || ""}
            departureName={(departure as any)?.name || (departure as any)?.package?.name || undefined}
            departureDate={
              (departure as any)?.departure_date
                ? formatDate((departure as any).departure_date)
                : undefined
            }
          />
        </TabsContent>

        {/* Tab: Budget vs Realisasi — FITUR 06 */}
        <TabsContent value="budget" className="space-y-4">
          <DepartureBudgetTab departureId={id || ""} />
        </TabsContent>

        {/* Tab: Riwayat Harga */}
        <TabsContent value="harga" className="space-y-4">
          <DepartureMarginCalculator
            departureId={id || ""}
            paxCount={passengers?.length || 0}
            priceQuad={departure?.price_quad || 0}
            priceTriple={departure?.price_triple || 0}
            priceDouble={departure?.price_double || 0}
            priceSingle={departure?.price_single || 0}
            packageName={departure?.package?.name}
            departureDate={departure?.departure_date}
          />
          <PriceHistoryCard
            departureId={id || ""}
            packageId={departure?.package?.id}
            currentPrices={{
              price_quad: departure?.price_quad || 0,
              price_triple: departure?.price_triple || 0,
              price_double: departure?.price_double || 0,
              price_single: departure?.price_single || 0,
            }}
          />
        </TabsContent>

        {/* Tab: Operasional */}
        <TabsContent value="operasional" className="space-y-6">
          {/* Shortcut Utama */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Akses Cepat Operasional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-blue-300 hover:bg-blue-50" asChild>
                  <Link to={`/admin/manifest?departure=${id}`}>
                    <FileDown className="h-5 w-5 text-blue-500" />
                    <span className="text-xs font-semibold">Manifest PDF</span>
                    <span className="text-[10px] text-muted-foreground">{passengerStats.total} jamaah</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-purple-300 hover:bg-purple-50" asChild>
                  <Link to={`/admin/room-assignments?departure=${id}`}>
                    <BedDouble className="h-5 w-5 text-purple-500" />
                    <span className="text-xs font-semibold">Penugasan Kamar</span>
                    <span className="text-[10px] text-muted-foreground">Rooming list</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-amber-300 hover:bg-amber-50" asChild>
                  <Link to={`/admin/equipment?departure=${id}`}>
                    <Package className="h-5 w-5 text-amber-500" />
                    <span className="text-xs font-semibold">Perlengkapan</span>
                    <span className="text-[10px] text-muted-foreground">Distribusi jamaah</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-green-300 hover:bg-green-50" onClick={() => setIsCheckinOpen(true)}>
                  <ScanLine className="h-5 w-5 text-green-500" />
                  <span className="text-xs font-semibold">Check-in QR</span>
                  <span className="text-[10px] text-muted-foreground">{passengerStats.checkedIn} / {passengerStats.total}</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-indigo-300 hover:bg-indigo-50" onClick={() => setIsEmailManifestOpen(true)}>
                  <Mail className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs font-semibold">Email Manifest</span>
                  <span className="text-[10px] text-muted-foreground">Kirim via email</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-emerald-300 hover:bg-emerald-50" onClick={() => setActiveTab('jamaah')}>
                  <Users className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-semibold">Daftar Jamaah</span>
                  <span className="text-[10px] text-muted-foreground">Tab Jemaah</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-orange-300 hover:bg-orange-50" onClick={() => setActiveTab('keuangan')}>
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <span className="text-xs font-semibold">Keuangan P&L</span>
                  <span className="text-[10px] text-muted-foreground">HPP & Laba Rugi</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-1.5 hover:border-cyan-300 hover:bg-cyan-50" onClick={() => setActiveTab('checklist')}>
                  <ClipboardList className="h-5 w-5 text-cyan-500" />
                  <span className="text-xs font-semibold">Pre-Departure</span>
                  <span className="text-[10px] text-muted-foreground">Checklist</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rekonsiliasi Kuota */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4" />
                Rekonsiliasi Kuota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border">
                <div>
                  <p className="text-sm font-medium">booked_count saat ini: <span className="font-bold">{departure.booked_count ?? 0}</span></p>
                  <p className="text-sm font-medium">Jamaah aktif di tabel: <span className="font-bold">{passengerStats.total}</span></p>
                  {departure.booked_count !== passengerStats.total ? (
                    <p className="text-xs text-amber-600 mt-1 font-semibold">⚠ Mismatch terdeteksi — perlu sinkronisasi</p>
                  ) : (
                    <p className="text-xs text-emerald-600 mt-1 font-semibold">✓ Data sudah sinkron</p>
                  )}
                </div>
                <Button
                  variant={departure.booked_count !== passengerStats.total ? "default" : "outline"}
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => recalcDetailMutation.mutate()}
                  disabled={recalcDetailMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 ${recalcDetailMutation.isPending ? 'animate-spin' : ''}`} />
                  {recalcDetailMutation.isPending ? 'Menghitung...' : 'Sinkronkan Kuota'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sinkronisasi akan menghitung ulang jumlah booking aktif (bukan cancelled) dari tabel bookings dan memperbarui kolom booked_count di jadwal ini.
              </p>
            </CardContent>
          </Card>

          {/* Notifikasi WA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Notifikasi WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => sendHXNotification(7)}
                  disabled={sendingHX !== null}
                >
                  <Send className="h-3.5 w-3.5 text-green-500" />
                  {sendingHX === 7 ? 'Mengirim...' : 'Blast H-7'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => sendHXNotification(3)}
                  disabled={sendingHX !== null}
                >
                  <Send className="h-3.5 w-3.5 text-green-500" />
                  {sendingHX === 3 ? 'Mengirim...' : 'Blast H-3'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => sendHXNotification(1)}
                  disabled={sendingHX !== null}
                >
                  <Send className="h-3.5 w-3.5 text-green-500" />
                  {sendingHX === 1 ? 'Mengirim...' : 'Blast H-1'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Kirim pengingat keberangkatan ke semua jamaah yang memiliki nomor WhatsApp ({(passengers || []).filter((p: any) => p.customer?.phone).length} dari {passengerStats.total} jamaah).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Keuangan / P&L */}
        <TabsContent value="keuangan" className="space-y-6">
          <DeparturePLSummaryCard
            departureId={id || ""}
            departureLabel={departure?.package?.name}
            paxCount={passengers?.length || 0}
            quota={departure?.quota || 0}
          />
          <DepartureCostItemsCard
            departureId={id || ""}
            packageId={departure?.package?.id}
            packageName={departure?.package?.name}
            paxCount={passengers?.length || 0}
            departureLabel={departure?.departure_date ? formatDate(departure.departure_date) : undefined}
            priceQuad={departure?.price_quad || 0}
            priceTriple={departure?.price_triple || 0}
            priceDouble={departure?.price_double || 0}
          />
          <DepartureExpensesCard departureId={id || ""} />
          <DepartureOtherRevenuesCard departureId={id || ""} />
          {/* D7 — Komisi Agen */}
          <DepartureCommissionCard departureId={id || ""} />
        </TabsContent>

        <TabsContent value="daftar-tunggu" className="space-y-4">
          <DepartureWaitingListTab
            departureId={id || ""}
            departureName={departure?.package?.name || "Keberangkatan"}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Departure Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Keberangkatan</DialogTitle>
          </DialogHeader>
          <DepartureForm
            departureData={departure}
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["admin-departure-detail", id],
              });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Itinerary Management Dialog */}
      <Dialog open={isItineraryOpen} onOpenChange={setIsItineraryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Itinerary</DialogTitle>
          </DialogHeader>
          <LinkItineraryForm
            departureId={id || ""}
            departureDate={departure.departure_date}
            onSuccess={() => {
              setIsItineraryOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["departure-itinerary", id],
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* QR Check-in Dialog */}
      <CheckinQRDialog
        open={isCheckinOpen}
        onOpenChange={setIsCheckinOpen}
        departureId={id || ""}
        passengers={(passengers || []) as any}
      />

      {/* Edit Passenger Dialog */}
      {editingPassenger && (
        <EditCustomerDialog
          customer={editingPassenger}
          onSuccess={() => {
            setEditingPassenger(null);
            queryClient.invalidateQueries({
              queryKey: ["departure-passengers", id],
            });
          }}
        />
      )}

      {/* K6 — Email Manifest Dialog */}
      <Dialog open={isEmailManifestOpen} onOpenChange={setIsEmailManifestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Kirim Manifest via Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Manifest {passengers?.length || 0} jamaah akan dikirim sebagai tabel HTML ke alamat email di bawah.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Tujuan <span className="text-destructive">*</span></label>
                <Input
                  type="email"
                  placeholder="muthawif@example.com"
                  value={manifestEmail}
                  onChange={e => setManifestEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendManifestEmail()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Penerima (opsional)</label>
                <Input
                  type="text"
                  placeholder="Ustadz Muthawif / PIC"
                  value={manifestEmailName}
                  onChange={e => setManifestEmailName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={sendManifestEmail}
                disabled={isSendingEmail || !manifestEmail.trim()}
              >
                {isSendingEmail ? (
                  <span className="animate-pulse">Mengirim...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Manifest
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsEmailManifestOpen(false)} disabled={isSendingEmail}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
