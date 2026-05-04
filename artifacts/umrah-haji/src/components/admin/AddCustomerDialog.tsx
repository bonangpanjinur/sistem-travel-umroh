import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface AddCustomerDialogProps {
  trigger?: React.ReactNode;
}

interface CustomerFormData {
  full_name: string;
  nik: string;
  gender: "male" | "female" | "";
  birth_place: string;
  birth_date: string;
  email: string;
  phone: string;
  address: string;
  branch_id: string;
  marital_status: string;
  spouse_name: string;
}

const initialFormData: CustomerFormData = {
  full_name: "",
  nik: "",
  gender: "",
  birth_place: "",
  birth_date: "",
  email: "",
  phone: "",
  address: "",
  branch_id: "",
  marital_status: "single",
  spouse_name: "",
};

export function AddCustomerDialog({ trigger }: AddCustomerDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const { data: branches } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: formData.full_name,
          nik: formData.nik || null,
          gender: formData.gender || null,
          birth_place: formData.birth_place || null,
          birth_date: formData.birth_date || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          branch_id: formData.branch_id || null,
          marital_status: formData.marital_status || 'single',
          spouse_name: formData.spouse_name || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Jamaah berhasil ditambahkan!");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      setFormData(initialFormData);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Gagal menambahkan jamaah: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    createMutation.mutate();
  };

  const handleChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setFormData(initialFormData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Jamaah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Jamaah Baru</DialogTitle>
          <DialogDescription>
            Isi data dasar jamaah. Data lengkap (paspor, dokumen, dll) dapat dilengkapi setelah pembayaran terverifikasi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="full_name">Nama Lengkap *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={e => handleChange("full_name", e.target.value)}
              placeholder="Nama sesuai KTP"
              required
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select
                value={formData.gender}
                onValueChange={v => handleChange("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Laki-laki</SelectItem>
                  <SelectItem value="female">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nik">NIK</Label>
              <Input
                id="nik"
                value={formData.nik}
                onChange={e => handleChange("nik", e.target.value)}
                placeholder="16 digit"
                maxLength={16}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label htmlFor="birth_place">Tempat Lahir</Label>
              <Input
                id="birth_place"
                value={formData.birth_place}
                onChange={e => handleChange("birth_place", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="birth_date">Tanggal Lahir</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={e => handleChange("birth_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => handleChange("phone", e.target.value)}
                placeholder="08XXXXXXXXXX"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => handleChange("email", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={e => handleChange("address", e.target.value)}
              placeholder="Alamat singkat"
            />
          </div>

          <div>
            <Label htmlFor="branch_id">Cabang</Label>
            <Select
              value={formData.branch_id}
              onValueChange={v => handleChange("branch_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih cabang (opsional)" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="marital_status">Status Pernikahan</Label>
              <Select
                value={formData.marital_status}
                onValueChange={v => handleChange("marital_status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Lajang</SelectItem>
                  <SelectItem value="married">Menikah</SelectItem>
                  <SelectItem value="widowed">Janda/Duda</SelectItem>
                  <SelectItem value="divorced">Cerai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="spouse_name">Nama Pasangan</Label>
              <Input
                id="spouse_name"
                value={formData.spouse_name}
                onChange={e => handleChange("spouse_name", e.target.value)}
                placeholder="Nama suami/istri (jika menikah)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
