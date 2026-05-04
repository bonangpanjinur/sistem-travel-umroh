import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Plane, Info } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const packageChangeSchema = z.object({
  package_change_deadline_days: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9]/g, "")),
    z.number().min(0, "Batas hari tidak boleh negatif")
  ),
  package_change_penalty_fee: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9]/g, "")),
    z.number().min(0, "Denda tidak boleh negatif")
  ),
});

type PackageChangeFormData = z.infer<typeof packageChangeSchema>;

interface PackageChangeSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PackageChangeSettingsDialog({
  isOpen,
  onClose,
}: PackageChangeSettingsDialogProps) {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();

  const form = useForm<PackageChangeFormData>({
    resolver: zodResolver(packageChangeSchema),
    defaultValues: {
      package_change_deadline_days: 60,
      package_change_penalty_fee: 0,
    },
  });

  useEffect(() => {
    if (isOpen && !isLoading) {
      form.reset({
        package_change_deadline_days: parseInt(getSetting("package_change_deadline_days")) || 60,
        package_change_penalty_fee: parseFloat(getSetting("package_change_penalty_fee")) || 0,
      });
    }
  }, [isOpen, isLoading, getSetting, form]);

  const onSubmit = (data: PackageChangeFormData) => {
    updateMultipleSettings([
      { key: "package_change_deadline_days", value: data.package_change_deadline_days },
      { key: "package_change_penalty_fee", value: data.package_change_penalty_fee },
    ], {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            Pengaturan Pindah Paket
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 mb-6 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Atur kebijakan denda untuk jamaah yang ingin pindah paket atau tanggal keberangkatan.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="package_change_deadline_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Batas Hari Pindah Paket (H-X)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="60"
                          className="rounded-xl pr-12"
                          {...field}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">HARI</span>
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground italic">
                      Gratis biaya pindah jika dilakukan sebelum H-X hari keberangkatan.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="package_change_penalty_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Denda Pindah Paket (Rp)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">RP</span>
                        <Input
                          type="number"
                          placeholder="0"
                          className="rounded-xl pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground italic">
                      Biaya tambahan jika pindah paket kurang dari batas hari yang ditentukan.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={onClose} className="rounded-xl">
                  Batal
                </Button>
                <Button type="submit" disabled={isUpdating} className="rounded-xl px-8">
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan Pengaturan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
