import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Search, Users } from "lucide-react";

const STAFF_ROLES = [
  { value: "operational", label: "Operational" },
  { value: "sales",       label: "Sales" },
  { value: "finance",     label: "Finance" },
  { value: "marketing",   label: "Marketing" },
  { value: "equipment",   label: "Equipment" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  operational: "bg-amber-100 text-amber-800",
  sales:       "bg-cyan-100 text-cyan-800",
  finance:     "bg-green-100 text-green-800",
  marketing:   "bg-pink-100 text-pink-800",
  equipment:   "bg-gray-100 text-gray-800",
};

/**
 * CAB-ADD2 — Branch manager dapat melihat dan mengelola staff cabangnya
 * (assign role staff existing user → branch, hapus role staff dari branch).
 * Staff yg bisa dikelola: operational, sales, finance, marketing, equipment.
 */
export default function BranchStaff() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Branch this manager owns
  const { data: branch } = useQuery({
    queryKey: ["my-branch", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, city")
        .eq("manager_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const branchId = branch?.id ?? null;

  // Staff list scoped to this branch
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["branch-staff", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .eq("branch_id", branchId)
        .in("role", STAFF_ROLES.map((r) => r.value));
      if (!roles?.length) return [];
      const userIds = [...new Set(roles.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url")
        .in("user_id", userIds);
      const { data: emails } = await supabase.rpc("list_users_with_emails");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      const emailMap = new Map((emails ?? []).map((e: any) => [e.id, e.email]));
      return roles.map((r: any) => ({
        ...r,
        full_name: (profileMap.get(r.user_id) as any)?.full_name ?? "—",
        phone: (profileMap.get(r.user_id) as any)?.phone ?? null,
        email: emailMap.get(r.user_id) ?? "—",
      }));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff dihapus dari cabang");
      queryClient.invalidateQueries({ queryKey: ["branch-staff", branchId] });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menghapus"),
  });

  const filtered = (staff as any[]).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q)
    );
  });

  if (!branchId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Akun Anda belum ditetapkan sebagai manager cabang manapun.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Staff Cabang {branch?.name}</h1>
          <p className="text-sm text-muted-foreground">
            Kelola staff yang bekerja di cabang Anda
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Tambah Staff
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Daftar Staff ({filtered.length})
            </CardTitle>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / email / role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada staff. Klik "Tambah Staff" untuk memulai.</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_COLORS[s.role] ?? ""}>{s.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon"
                      onClick={() => setConfirmDelete({ id: s.id, name: s.full_name })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        branchId={branchId}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["branch-staff", branchId] })}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus staff dari cabang?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} tidak akan punya akses ke cabang ini lagi.
              Akun user-nya tetap ada dan tidak terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && removeMutation.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddStaffDialog({
  open, onOpenChange, branchId, onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  branchId: string;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("operational");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast.error("Email wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const { data: emails } = await supabase.rpc("list_users_with_emails");
      const match = (emails ?? []).find(
        (e: any) => e.email?.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!match) {
        toast.error("User dengan email ini belum terdaftar. Minta mereka mendaftar dulu.");
        return;
      }
      const { error } = await supabase.from("user_roles").insert({
        user_id: match.id,
        role,
        branch_id: branchId,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("User ini sudah punya role tersebut di cabang ini.");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Staff berhasil ditambahkan");
      onAdded();
      onOpenChange(false);
      setEmail("");
      setRole("operational");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menambahkan staff");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Staff Cabang</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email user</label>
            <Input
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              User harus sudah terdaftar di sistem. Mereka akan mendapat akses sesuai role.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Menyimpan…" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}