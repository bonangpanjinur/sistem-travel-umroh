import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Headphones, Plus, MessageCircle, Clock, Paperclip, X, Loader2, Image, FileText } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";

const CATEGORIES = [
  { value: 'booking', label: 'Booking & Pembayaran' },
  { value: 'document', label: 'Dokumen & Visa' },
  { value: 'travel', label: 'Perjalanan & Itinerary' },
  { value: 'complaint', label: 'Keluhan & Masukan' },
  { value: 'other', label: 'Lainnya' },
];

const MAX_FILES = 3;
const MAX_SIZE_MB = 5;

export default function CustomerSupport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "booking",
    description: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-support-tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} terlalu besar (maks ${MAX_SIZE_MB}MB)`);
        continue;
      }
      valid.push(f);
    }
    setAttachments(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        toast.error(`Maksimal ${MAX_FILES} file`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data: ticketCode } = await supabase.rpc('generate_ticket_code');
      const code = ticketCode || `TIK-${Date.now()}`;

      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        for (const file of attachments) {
          try {
            const ext = file.name.split('.').pop();
            const path = `support/${user!.id}/${code}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from('support-attachments')
              .upload(path, file, { upsert: false });
            if (!upErr) {
              const { data: urlData } = supabase.storage
                .from('support-attachments')
                .getPublicUrl(path);
              attachmentUrls.push(urlData.publicUrl);
            }
          } catch { }
        }
        setUploading(false);
      }

      const descWithAttachments = attachmentUrls.length > 0
        ? `${formData.description}\n\n[Lampiran: ${attachmentUrls.join(', ')}]`
        : formData.description;

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_code: code,
          user_id: user!.id,
          subject: formData.subject,
          category: formData.category,
          description: descWithAttachments,
          status: 'open',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
      toast.success("Tiket berhasil dibuat, kami akan segera menghubungi Anda");
      setShowDialog(false);
      setFormData({ subject: "", category: "booking", description: "" });
      setAttachments([]);
    },
    onError: (error: any) => {
      setUploading(false);
      toast.error("Gagal membuat tiket: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: 'default',
      in_progress: 'secondary',
      resolved: 'outline',
      closed: 'outline',
    };
    const labels: Record<string, string> = {
      open: 'Terbuka',
      in_progress: 'Diproses',
      resolved: 'Selesai',
      closed: 'Ditutup',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const isSubmitting = createTicket.isPending || uploading;

  return (
    <PublicLayout>
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6" />
            Bantuan & Support
          </h1>
          <p className="text-muted-foreground">Ajukan pertanyaan atau keluhan Anda</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Tiket
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : !tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Belum ada tiket support</p>
            <Button className="mt-4" onClick={() => setShowDialog(true)}>
              Buat Tiket Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_code}</span>
                      {getStatusBadge(ticket.status || 'open')}
                    </div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{ticket.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(ticket.created_at || '')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={open => { if (!open && !isSubmitting) { setShowDialog(false); setAttachments([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Tiket Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subjek *</Label>
              <Input
                value={formData.subject}
                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                placeholder="Ringkasan masalah Anda..."
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi *</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                rows={4}
                placeholder="Jelaskan detail masalah atau pertanyaan Anda..."
              />
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lampiran <span className="text-muted-foreground font-normal">(opsional, maks {MAX_FILES} file)</span></Label>
                {attachments.length < MAX_FILES && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <Paperclip className="h-3 w-3" /> Tambah File
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={handleFileAdd}
              />
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      {file.type.startsWith("image/")
                        ? <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        : <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Lampirkan screenshot, foto, atau dokumen pendukung (JPG, PNG, PDF, DOC — maks {MAX_SIZE_MB}MB per file)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setAttachments([]); }} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              disabled={!formData.subject || !formData.description || isSubmitting}
              onClick={() => createTicket.mutate()}
            >
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{uploading ? 'Upload file...' : 'Mengirim...'}</>
                : 'Kirim Tiket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PublicLayout>
  );
}
