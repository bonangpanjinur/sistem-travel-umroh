import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { UserPlus, Loader2 } from "lucide-react";

interface RegisterAsJamaahDialogProps {
  trigger?: React.ReactNode;
}

export function RegisterAsJamaahDialog({ trigger }: RegisterAsJamaahDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    nik: "",
    gender: "" as "male" | "female" | "",
    birth_place: "",
    birth_date: "",
  });

  // Check if user is already registered as jamaah
  const { data: existingCustomer, isLoading: checkingCustomer } = useQuery({
    queryKey: ["check-customer-registration", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Pre-fill form with profile data when dialog opens
  useEffect(() => {
    if (open && profile && user) {
      setFormData({
        full_name: profile.full_name || "",
        email: user.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        province: profile.province || "",
        nik: "",
        gender: "",
        birth_place: "",
        birth_date: "",
      });
    }
  }, [open, profile, user]);

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          province: formData.province || null,
          nik: formData.nik || null,
          gender: formData.gender || null,
          birth_place: formData.birth_place || null,
          birth_date: formData.birth_date || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Berhasil terdaftar sebagai jamaah!");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      queryClient.invalidateQueries({ queryKey: ["check-customer-registration"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Gagal mendaftar: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    registerMutation.mutate();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Daftarkan Saya sebagai Jamaah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrasi Cepat sebagai Jamaah</DialogTitle>
          <DialogDescription>
            Data dari profil Anda akan digunakan. Lengkapi informasi tambahan yang diperlukan.
          </DialogDescription>
        </DialogHeader>

        {checkingCustomer ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : existingCustomer ? (
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-medium text-lg">Anda sudah terdaftar sebagai jamaah</p>
            <p className="text-muted-foreground mt-1">
              Nama: <span className="font-medium">{existingCustomer.full_name}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => handleChange("full_name", e.target.value)}
                  required
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
              
              <div>
                <Label htmlFor="phone">No. Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleChange("phone", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="nik">NIK</Label>
                <Input
                  id="nik"
                  value={formData.nik}
                  onChange={e => handleChange("nik", e.target.value)}
                  placeholder="16 digit NIK"
                  maxLength={16}
                />
              </div>

              <div>
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <Select
                  value={formData.gender}
                  onValueChange={v => handleChange("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="sm:col-span-2">
                <Label htmlFor="address">Alamat</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={e => handleChange("address", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="city">Kota</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={e => handleChange("city", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="province">Provinsi</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={e => handleChange("province", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={registerMutation.isPending}>
                {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Daftar sebagai Jamaah
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
