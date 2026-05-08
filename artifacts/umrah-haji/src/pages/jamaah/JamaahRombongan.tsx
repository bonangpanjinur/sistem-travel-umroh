import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Users, Search, Phone, MapPin,
  CalendarDays, User, MessageCircle, Star, Building2
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RombonganMember {
  id: string;
  full_name: string;
  gender?: string;
  city?: string;
  photo_url?: string;
  phone?: string;
  booking_code?: string;
  room_number?: string;
  is_me?: boolean;
}

const genderLabel: Record<string, string> = {
  male: "Laki-laki",
  female: "Perempuan",
  "laki-laki": "Laki-laki",
  perempuan: "Perempuan",
};

export default function JamaahRombongan() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking-rombongan", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            *,
            package:packages(name, type),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating, city),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating, city),
            muthawif:muthawifs(*)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["rombongan-members", (booking as any)?.departure_id],
    queryFn: async () => {
      const departureId = (booking as any)?.departure_id;
      if (!departureId) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          room_number,
          customer:customers(id, full_name, gender, city, photo_url, phone)
        `)
        .eq("departure_id", departureId)
        .in("booking_status", ["confirmed", "completed"]);
      if (error) return [];
      return (data ?? []).map((b: any) => ({
        id: b.customer?.id ?? b.id,
        full_name: b.customer?.full_name ?? "Jamaah",
        gender: b.customer?.gender,
        city: b.customer?.city,
        photo_url: b.customer?.photo_url,
        phone: b.customer?.phone,
        booking_code: b.booking_code,
        room_number: b.room_number,
        is_me: b.customer?.id === customer?.id,
      })) as RombonganMember[];
    },
    enabled: !!(booking as any)?.departure_id,
  });

  const filtered = members.filter(m =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const departure = (booking as any)?.departure;
  const myMember = members.find(m => m.is_me);
  const otherMembers = filtered.filter(m => !m.is_me);
  const muthawif = departure?.muthawif;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Teman Seperombongan</span>
            </div>
            {departure?.package?.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{departure.package.name}</p>
            )}
          </div>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            {members.length} Jamaah
          </Badge>
        </div>

        {/* Departure Info */}
        {departure && (
          <div className="px-4 pb-3 pt-1 flex gap-4 text-xs text-muted-foreground">
            {departure.departure_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(departure.departure_date), "d MMM yyyy", { locale: localeId })}
              </span>
            )}
            {departure.hotel_makkah?.name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {departure.hotel_makkah.name}
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau kota..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>
      </div>

      {/* No booking state */}
      {!booking && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">Belum Ada Rombongan</p>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar rombongan tersedia setelah booking dikonfirmasi.
          </p>
        </div>
      )}

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Muthawif Card */}
        {muthawif && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                <Star className="h-4 w-4" /> Pembimbing / Muthawif
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={muthawif.photo_url} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {muthawif.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{muthawif.name}</p>
                  {muthawif.specialization && (
                    <p className="text-xs text-muted-foreground">{muthawif.specialization}</p>
                  )}
                </div>
                {muthawif.phone && (
                  <a href={`https://wa.me/${muthawif.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 hover:bg-green-50">
                      <Phone className="h-3 w-3" /> WA
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Card */}
        {myMember && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kamu</p>
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/30">
                    <AvatarImage src={myMember.photo_url} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {myMember.full_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{myMember.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {myMember.city && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{myMember.city}</span>}
                      {myMember.gender && <span className="text-xs text-muted-foreground">{genderLabel[myMember.gender] ?? myMember.gender}</span>}
                    </div>
                    {myMember.room_number && <p className="text-xs text-primary font-medium mt-0.5">Kamar: {myMember.room_number}</p>}
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">Anda</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Other Members */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : otherMembers.length === 0 && !isLoading ? (
          search ? (
            <p className="text-center text-sm text-muted-foreground py-8">Tidak ada jamaah dengan nama "{search}"</p>
          ) : null
        ) : (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rekan Rombongan ({otherMembers.length})</p>
            <div className="space-y-2">
              {otherMembers.map(member => (
                <Card key={member.id} className="bg-white hover:shadow-sm transition-shadow">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={member.photo_url} />
                        <AvatarFallback className="bg-gray-100 text-gray-600 font-medium text-sm">
                          {member.full_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {member.city && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />{member.city}
                            </span>
                          )}
                          {member.gender && (
                            <span className="text-xs text-muted-foreground">
                              {genderLabel[member.gender] ?? member.gender}
                            </span>
                          )}
                        </div>
                        {member.room_number && (
                          <p className="text-xs text-blue-600 font-medium mt-0.5">Kamar: {member.room_number}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {member.phone && (
                          <a href={`https://wa.me/${member.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50">
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        <Link to="/jamaah/chat">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
