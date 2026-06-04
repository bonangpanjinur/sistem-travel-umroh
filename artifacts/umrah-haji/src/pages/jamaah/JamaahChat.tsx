import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Send, MessageCircle, Loader2,
  Users, RefreshCw, Wifi, WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format, isToday, isYesterday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_avatar?: string;
  created_at: string;
  room_id: string;
}

interface ChatRoom {
  id: string;
  departure_id: string;
  name: string;
  created_at: string;
}

function formatMessageDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Kemarin ${format(date, "HH:mm")}`;
  return format(date, "d MMM, HH:mm", { locale: localeId });
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      const d = new Date(msg.created_at);
      const label = isToday(d) ? "Hari ini" : isYesterday(d) ? "Kemarin" : format(d, "d MMMM yyyy", { locale: localeId });
      groups.push({ date: label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function JamaahChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

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
    queryKey: ["jamaah-booking-chat", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, departure:departures(*, package:packages(name), muthawif:muthawifs(*))`)
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

  const roomId = booking?.departure_id ? `departure_${booking.departure_id}` : null;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) return [];
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!roomId || !user || !customer) throw new Error("No room");
      const senderName = customer.full_name || user.email || "Jamaah";
      const { error } = await (supabase as any).from("chat_messages").insert({
        room_id: roomId,
        content,
        sender_id: user.id,
        sender_name: senderName,
        sender_role: "jamaah",
        sender_avatar: customer.photo_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    },
    onError: () => {
      toast.error("Gagal mengirim pesan. Coba lagi.");
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = messageText.trim();
    if (!trimmed || sendMutation.isPending) return;
    setMessageText("");
    sendMutation.mutate(trimmed);
  }, [messageText, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped = groupMessagesByDate(messages);
  const muthawif = (booking as any)?.departure?.muthawif;
  const packageName = (booking as any)?.departure?.package?.name;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900 truncate">Chat Rombongan</span>
              {isOnline ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] py-0">
                  <Wifi className="h-2.5 w-2.5 mr-1" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 text-[10px] py-0">
                  <WifiOff className="h-2.5 w-2.5 mr-1" /> Offline
                </Badge>
              )}
            </div>
            {packageName && <p className="text-xs text-muted-foreground truncate">{packageName}</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] })}>
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </Button>
        </div>

        {/* Muthawif info strip */}
        {muthawif && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-t">
            <Avatar className="h-7 w-7">
              <AvatarImage src={muthawif.photo_url} />
              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{muthawif.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-medium text-gray-800">{muthawif.name}</p>
              <p className="text-[10px] text-muted-foreground">Muthawif / Pembimbing</p>
            </div>
            <Badge className="ml-auto text-[10px] py-0 bg-green-100 text-green-700 border-0">Aktif</Badge>
          </div>
        )}
      </div>

      {/* No booking state */}
      {!booking && !loadingMessages && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">Belum Ada Rombongan</p>
          <p className="text-sm text-muted-foreground mt-1">
            Fitur chat tersedia setelah booking dikonfirmasi oleh tim Vinstour.
          </p>
          <Link to="/jamaah">
            <Button variant="outline" className="mt-4">Kembali ke Beranda</Button>
          </Link>
        </div>
      )}

      {/* Messages */}
      {booking && (
        <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
          {loadingMessages ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "flex-row-reverse" : "")}>
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <Skeleton className="h-14 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-gray-700">Mulai Percakapan</p>
              <p className="text-sm text-muted-foreground mt-1">Kirim pesan pertama kepada muthawif dan rekan rombongan</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{group.date}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const initials = msg.sender_name?.slice(0, 2).toUpperCase() || "??";
                    const isStaff = msg.sender_role === "muthawif" || msg.sender_role === "admin" || msg.sender_role === "super_admin";
                    return (
                      <div key={msg.id} className={cn("flex gap-2 items-end", isMe ? "flex-row-reverse" : "")}>
                        {!isMe && (
                          <Avatar className="h-7 w-7 flex-shrink-0 mb-1">
                            <AvatarImage src={msg.sender_avatar} />
                            <AvatarFallback className={cn("text-[10px]", isStaff ? "bg-primary/20 text-primary" : "bg-gray-200 text-gray-600")}>{initials}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("max-w-[72%]", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                          {!isMe && (
                            <span className={cn("text-[10px] font-medium ml-1", isStaff ? "text-primary" : "text-gray-500")}>
                              {msg.sender_name} {isStaff && "• Muthawif"}
                            </span>
                          )}
                          <div className={cn(
                            "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
                            isMe
                              ? "bg-primary text-white rounded-br-sm"
                              : isStaff
                              ? "bg-primary/10 text-primary-foreground border border-primary/20 text-gray-800 rounded-bl-sm"
                              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground mx-1">{formatMessageDate(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar */}
      {booking && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t px-4 py-3 z-10">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan..."
              className="flex-1 rounded-full bg-gray-100 border-0 focus-visible:ring-1"
              disabled={sendMutation.isPending || !isOnline}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!messageText.trim() || sendMutation.isPending || !isOnline}
              className="rounded-full h-10 w-10 flex-shrink-0"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <JamaahBottomNav />
    </div>
  );
}
