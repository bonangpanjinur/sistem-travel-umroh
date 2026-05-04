import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquare, Settings, FileText, History, Send, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface WhatsAppConfig {
  id: string;
  provider: string;
  api_key: string | null;
  sender_number: string | null;
  is_active: boolean;
}

interface WhatsAppTemplate {
  id: string;
  code: string;
  name: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
}

interface WhatsAppLog {
  id: string;
  recipient_phone: string;
  message_content: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function AdminWhatsApp() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("");
  const [editTemplate, setEditTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // Fetch config
  const { data: config } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_config" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WhatsAppConfig | null;
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as WhatsAppTemplate[];
    },
  });

  // Fetch logs
  const { data: logs = [] } = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as WhatsAppLog[];
    },
  });

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<WhatsAppConfig>) => {
      if (config?.id) {
        const { error } = await supabase
          .from("whatsapp_config" as any)
          .update(configData)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_config" as any)
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      toast.success("Konfigurasi WhatsApp berhasil disimpan");
    },
    onError: (error: Error) => {
      toast.error("Gagal menyimpan konfigurasi: " + error.message);
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<WhatsAppTemplate>) => {
      if (editTemplate?.id) {
        const { error } = await supabase
          .from("whatsapp_templates" as any)
          .update(templateData)
          .eq("id", editTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_templates" as any)
          .insert(templateData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template berhasil disimpan");
      setIsTemplateDialogOpen(false);
      setEditTemplate(null);
    },
    onError: (error: Error) => {
      toast.error("Gagal menyimpan template: " + error.message);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("whatsapp_templates" as any)
        .delete()
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error("Gagal menghapus template: " + error.message);
    },
  });

  // Send test message
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          phone: testPhone,
          template_code: testTemplate,
          variables: { nama: "Test User" },
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
      toast.success("Pesan test berhasil dikirim!");
      setTestPhone("");
    },
    onError: (error: Error) => {
      toast.error("Gagal mengirim pesan: " + error.message);
    },
  });

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveConfigMutation.mutate({
      provider: formData.get("provider") as string,
      api_key: formData.get("api_key") as string,
      sender_number: formData.get("sender_number") as string,
      is_active: formData.get("is_active") === "on",
    });
  };

  const handleSaveTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const variablesStr = formData.get("variables") as string;
    saveTemplateMutation.mutate({
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      message_template: formData.get("message_template") as string,
      variables: variablesStr ? variablesStr.split(",").map((v) => v.trim()) : [],
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Integration</h1>
          <p className="text-muted-foreground">Kelola notifikasi WhatsApp untuk jamaah</p>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Konfigurasi
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Log Pesan
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Send className="h-4 w-4" />
            Test Kirim
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi WhatsApp API</CardTitle>
              <CardDescription>Atur provider dan API key untuk integrasi WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select name="provider" defaultValue={config?.provider || "fonnte"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fonnte">Fonnte</SelectItem>
                        <SelectItem value="wablas">Wablas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender_number">Nomor Pengirim</Label>
                    <Input
                      id="sender_number"
                      name="sender_number"
                      placeholder="08xxxxxxxxxx"
                      defaultValue={config?.sender_number || ""}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api_key"
                      name="api_key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Masukkan API Key"
                      defaultValue={config?.api_key || ""}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Dapatkan API key dari dashboard provider Anda</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_active" name="is_active" defaultChecked={config?.is_active || false} />
                  <Label htmlFor="is_active">Aktifkan WhatsApp Integration</Label>
                </div>
                <Button type="submit" disabled={saveConfigMutation.isPending}>
                  {saveConfigMutation.isPending ? "Menyimpan..." : "Simpan Konfigurasi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Template Pesan</CardTitle>
                <CardDescription>Kelola template pesan untuk berbagai notifikasi</CardDescription>
              </div>
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditTemplate(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editTemplate ? "Edit Template" : "Tambah Template Baru"}</DialogTitle>
                    <DialogDescription>Gunakan {"{variable}"} untuk variabel dinamis</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Kode Template</Label>
                        <Input id="code" name="code" placeholder="BOOKING_CONFIRM" defaultValue={editTemplate?.code || ""} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nama Template</Label>
                        <Input id="name" name="name" placeholder="Konfirmasi Booking" defaultValue={editTemplate?.name || ""} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message_template">Isi Pesan</Label>
                      <Textarea id="message_template" name="message_template" placeholder="Assalamu'alaikum {nama}..." rows={5} defaultValue={editTemplate?.message_template || ""} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variables">Variabel (pisahkan dengan koma)</Label>
                      <Input id="variables" name="variables" placeholder="nama, kode_booking, total_harga" defaultValue={editTemplate?.variables?.join(", ") || ""} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saveTemplateMutation.isPending}>
                        {saveTemplateMutation.isPending ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Variabel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-mono text-sm">{template.code}</TableCell>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables?.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditTemplate(template); setIsTemplateDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTemplateMutation.mutate(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Log Pengiriman Pesan</CardTitle>
              <CardDescription>Riwayat pesan WhatsApp yang terkirim</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Nomor Tujuan</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: id })}</TableCell>
                      <TableCell className="font-mono text-sm">{log.recipient_phone}</TableCell>
                      <TableCell className="max-w-md truncate">{log.message_content}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                          {log.status === "sent" ? "Terkirim" : log.status === "failed" ? "Gagal" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada log pengiriman pesan</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Kirim Pesan</CardTitle>
              <CardDescription>Kirim pesan test untuk memastikan integrasi berjalan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test_phone">Nomor Tujuan</Label>
                  <Input id="test_phone" placeholder="08xxxxxxxxxx" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test_template">Template</Label>
                  <Select value={testTemplate} onValueChange={setTestTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => sendTestMutation.mutate()} disabled={!testPhone || !testTemplate || sendTestMutation.isPending}>
                {sendTestMutation.isPending ? "Mengirim..." : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Test
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}