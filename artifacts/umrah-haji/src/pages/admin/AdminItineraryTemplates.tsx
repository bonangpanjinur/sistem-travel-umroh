import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Copy, Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface ItineraryDay {
  day: number;
  title: string;
  activities: { time: string; activity: string; location?: string }[];
}

interface ItineraryTemplate {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  package_type: string;
  days: ItineraryDay[];
  is_active: boolean;
  created_at: string;
}

export default function AdminItineraryTemplates() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ItineraryTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_days: 9,
    package_type: "umrah",
    days: [] as ItineraryDay[],
  });
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [dayForm, setDayForm] = useState({ title: "", activities: "" });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["itinerary-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_templates" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as unknown as ItineraryTemplate[];
    },
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ItineraryTemplate>) => {
      if (editingTemplate?.id) {
        const { error } = await supabase
          .from("itinerary_templates" as any)
          .update(data)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itinerary_templates" as any)
          .insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-templates"] });
      toast.success("Template berhasil disimpan");
      handleCloseDialog();
    },
    onError: (error: Error) => toast.error("Gagal: " + error.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("itinerary_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-templates"] });
      toast.success("Template dihapus");
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (template: ItineraryTemplate) => {
      const { error } = await supabase
        .from("itinerary_templates" as any)
        .insert({
          name: template.name + " (Copy)",
          description: template.description,
          duration_days: template.duration_days,
          package_type: template.package_type,
          days: template.days,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-templates"] });
      toast.success("Template diduplikasi");
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: "", description: "", duration_days: 9, package_type: "umrah", days: [] });
    setEditingDay(null);
  };

  const handleEdit = (template: ItineraryTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      duration_days: template.duration_days,
      package_type: template.package_type,
      days: template.days || [],
    });
    setIsDialogOpen(true);
  };

  const handleAddDay = () => {
    const newDay: ItineraryDay = {
      day: formData.days.length + 1,
      title: `Hari ${formData.days.length + 1}`,
      activities: [],
    };
    setFormData({ ...formData, days: [...formData.days, newDay] });
    setEditingDay(formData.days.length);
    setDayForm({ title: newDay.title, activities: "" });
  };

  const handleSaveDay = () => {
    if (editingDay === null) return;
    const activities = dayForm.activities
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [time, ...rest] = line.split(" - ");
        const [activity, location] = rest.join(" - ").split(" @ ");
        return { time: time?.trim() || "00:00", activity: activity?.trim() || "", location: location?.trim() };
      });

    const updatedDays = [...formData.days];
    updatedDays[editingDay] = { ...updatedDays[editingDay], title: dayForm.title, activities };
    setFormData({ ...formData, days: updatedDays });
    setEditingDay(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: formData.name,
      description: formData.description,
      duration_days: formData.duration_days,
      package_type: formData.package_type,
      days: formData.days as any,
      is_active: true,
    });
  };

  const generateDefaultTemplate = () => {
    const defaultDays: ItineraryDay[] = [
      {
        day: 1,
        title: "Keberangkatan dari Indonesia",
        activities: [
          { time: "06:00", activity: "Berkumpul di Bandara", location: "Terminal Internasional" },
          { time: "09:00", activity: "Check-in dan Boarding" },
          { time: "12:00", activity: "Penerbangan ke Jeddah" },
        ],
      },
      {
        day: 2,
        title: "Madinah - Ziarah Masjid Nabawi",
        activities: [
          { time: "05:00", activity: "Sholat Subuh Berjamaah", location: "Masjid Nabawi" },
          { time: "09:00", activity: "Ziarah Raudhah" },
          { time: "16:00", activity: "City Tour Madinah" },
        ],
      },
      {
        day: 3,
        title: "Madinah - Ziarah Sejarah",
        activities: [
          { time: "08:00", activity: "Ziarah Uhud & Khandaq", location: "Madinah" },
          { time: "14:00", activity: "Ziarah Masjid Quba" },
          { time: "16:00", activity: "Ziarah Qiblatain" },
        ],
      },
    ];
    // Add more days
    for (let i = 4; i <= formData.duration_days - 1; i++) {
      defaultDays.push({
        day: i,
        title: i <= 5 ? "Makkah - Ibadah di Masjidil Haram" : "Makkah - Umrah & Thawaf",
        activities: [
          { time: "05:00", activity: "Sholat Subuh", location: "Masjidil Haram" },
          { time: "09:00", activity: "Thawaf Sunnah" },
          { time: "20:00", activity: "Tahajud & Ibadah Malam" },
        ],
      });
    }
    defaultDays.push({
      day: formData.duration_days,
      title: "Kepulangan ke Indonesia",
      activities: [
        { time: "08:00", activity: "Check-out Hotel" },
        { time: "10:00", activity: "Transfer ke Bandara Jeddah" },
        { time: "14:00", activity: "Penerbangan kembali" },
      ],
    });
    setFormData({ ...formData, days: defaultDays });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Itinerary</h1>
          <p className="text-muted-foreground">Kelola template jadwal perjalanan</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <Badge>{template.package_type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {template.duration_days} Hari
                </span>
                <span>{template.days?.length || 0} Aktivitas</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate(template)}>
                  <Copy className="h-4 w-4 mr-1" /> Duplikasi
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && !isLoading && (
          <Card className="col-span-full p-8 text-center">
            <p className="text-muted-foreground">Belum ada template. Buat template pertama Anda!</p>
          </Card>
        )}
      </div>

      {/* Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Buat Template Baru"}</DialogTitle>
            <DialogDescription>Atur jadwal harian untuk paket perjalanan</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Template</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Umrah 9 Hari Standard"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Durasi (Hari)</Label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    min={1}
                    max={45}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipe Paket</Label>
                  <Select value={formData.package_type} onValueChange={(v) => setFormData({ ...formData, package_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umrah">Umrah</SelectItem>
                      <SelectItem value="haji">Haji</SelectItem>
                      <SelectItem value="haji_plus">Haji Plus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat template..."
              />
            </div>

            {/* Days Management */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Jadwal Harian ({formData.days.length} hari)</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={generateDefaultTemplate}>
                    Generate Default
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddDay}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Hari
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {formData.days.map((day, idx) => (
                  <div key={idx} className="p-3">
                    {editingDay === idx ? (
                      <div className="space-y-2">
                        <Input
                          value={dayForm.title}
                          onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })}
                          placeholder="Judul hari"
                        />
                        <Textarea
                          value={dayForm.activities}
                          onChange={(e) => setDayForm({ ...dayForm, activities: e.target.value })}
                          placeholder="Format: HH:MM - Aktivitas @ Lokasi (satu per baris)"
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={handleSaveDay}>Simpan</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingDay(null)}>Batal</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">Hari {day.day}: {day.title}</p>
                          <p className="text-sm text-muted-foreground">{day.activities?.length || 0} aktivitas</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDay(idx);
                            setDayForm({
                              title: day.title,
                              activities: day.activities?.map((a) => `${a.time} - ${a.activity}${a.location ? ` @ ${a.location}` : ""}`).join("\n") || "",
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {formData.days.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground">Klik "Generate Default" atau "Tambah Hari"</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
