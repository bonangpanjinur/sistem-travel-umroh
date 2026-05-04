import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  question: string;
  answer: string;
  is_published: boolean;
}

const INITIAL_FORM: FormData = {
  question: "",
  answer: "",
  is_published: true,
};

export function FAQEditor() {
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch FAQs from static_pages
  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      setIsLoading(true);
      // Get the FAQ page content and parse it
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .eq("slug", "faq")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // For now, we'll store FAQs in a separate table or in the static_pages content
      // This is a simplified version that stores FAQs in localStorage
      const stored = localStorage.getItem("faqs");
      if (stored) {
        setFAQs(JSON.parse(stored));
      } else {
        // Default FAQs
        const defaultFAQs: FAQ[] = [
          {
            id: "1",
            question: "Bagaimana cara mendaftar umroh?",
            answer:
              "Anda dapat mendaftar melalui website kami di halaman Paket Umroh, kemudian pilih paket yang sesuai dan ikuti langkah pendaftaran.",
            sort_order: 1,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            question: "Apa saja persyaratan umroh?",
            answer:
              "1. Paspor yang masih berlaku minimal 7 bulan\n2. Pas foto terbaru ukuran 4x6\n3. Surat keterangan sehat dari dokter\n4. Bukti vaksinasi meningitis",
            sort_order: 2,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            question: "Berapa lama proses visa umroh?",
            answer:
              "Proses visa umroh biasanya memakan waktu 5-7 hari kerja setelah semua dokumen lengkap.",
            sort_order: 3,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setFAQs(defaultFAQs);
        localStorage.setItem("faqs", JSON.stringify(defaultFAQs));
      }
    } catch (error: any) {
      toast.error("Gagal memuat FAQ");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (faq?: FAQ) => {
    if (faq) {
      setEditingId(faq.id);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        is_published: faq.is_published,
      });
    } else {
      setEditingId(null);
      setFormData(INITIAL_FORM);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(INITIAL_FORM);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Pertanyaan dan jawaban tidak boleh kosong");
      return;
    }

    try {
      let updatedFAQs: FAQ[];

      if (editingId) {
        updatedFAQs = faqs.map((faq) =>
          faq.id === editingId
            ? {
                ...faq,
                question: formData.question,
                answer: formData.answer,
                is_published: formData.is_published,
                updated_at: new Date().toISOString(),
              }
            : faq
        );
        toast.success("FAQ berhasil diperbarui");
      } else {
        const newFAQ: FAQ = {
          id: Math.random().toString(36).substr(2, 9),
          question: formData.question,
          answer: formData.answer,
          is_published: formData.is_published,
          sort_order: faqs.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        updatedFAQs = [...faqs, newFAQ];
        toast.success("FAQ berhasil ditambahkan");
      }

      localStorage.setItem("faqs", JSON.stringify(updatedFAQs));
      setFAQs(updatedFAQs);
      handleCloseDialog();
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    }
  };

  const handleDelete = (id: string) => {
    try {
      const updatedFAQs = faqs.filter((faq) => faq.id !== id);
      localStorage.setItem("faqs", JSON.stringify(updatedFAQs));
      setFAQs(updatedFAQs);
      toast.success("FAQ berhasil dihapus");
      setSelectedForDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message}`);
    }
  };

  const handleTogglePublished = (id: string) => {
    const updatedFAQs = faqs.map((faq) =>
      faq.id === id ? { ...faq, is_published: !faq.is_published } : faq
    );
    localStorage.setItem("faqs", JSON.stringify(updatedFAQs));
    setFAQs(updatedFAQs);
    toast.success("Status FAQ berhasil diubah");
  };

  const handleReorder = (id: string, direction: "up" | "down") => {
    const index = faqs.findIndex((faq) => faq.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === faqs.length - 1)) {
      return;
    }

    const newFAQs = [...faqs];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newFAQs[index], newFAQs[newIndex]] = [newFAQs[newIndex], newFAQs[index]];

    // Update sort_order
    newFAQs.forEach((faq, i) => {
      faq.sort_order = i + 1;
    });

    localStorage.setItem("faqs", JSON.stringify(newFAQs));
    setFAQs(newFAQs);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manajemen FAQ</CardTitle>
            <CardDescription>Kelola pertanyaan yang sering diajukan pelanggan</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah FAQ
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada FAQ. Tambahkan yang pertama sekarang!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="p-4 flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm pr-4">{faq.question}</h4>
                      {!faq.is_published && (
                        <span className="text-xs text-muted-foreground mt-1">Disembunyikan</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(faq);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForDelete(faq.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {expandedId === faq.id && (
                    <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
                      <p className="text-sm whitespace-pre-wrap">{faq.answer}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublished(faq.id)}
                        >
                          {faq.is_published ? "Sembunyikan" : "Publikasikan"}
                        </Button>
                        {index > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(faq.id, "up")}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        )}
                        {index < faqs.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(faq.id, "down")}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit FAQ" : "Tambah FAQ Baru"}</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah untuk {editingId ? "memperbarui" : "menambahkan"} pertanyaan FAQ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Question */}
            <div className="space-y-2">
              <Label htmlFor="question">Pertanyaan *</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="Contoh: Bagaimana cara mendaftar?"
              />
            </div>

            {/* Answer */}
            <div className="space-y-2">
              <Label htmlFor="answer">Jawaban *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                placeholder="Tuliskan jawaban lengkap untuk pertanyaan ini..."
                className="min-h-[150px] resize-none"
              />
            </div>

            {/* Published */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_published: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Publikasikan FAQ ini</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus FAQ ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => selectedForDelete && handleDelete(selectedForDelete)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
          <AlertDialogCancel>Batal</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
