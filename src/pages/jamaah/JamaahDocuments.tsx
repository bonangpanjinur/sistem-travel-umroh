import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  verified: { label: "Terverifikasi", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { label: "Menunggu", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  rejected: { label: "Ditolak", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function JamaahDocuments() {
  const { user } = useAuth();

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["jamaah-documents", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("customer_documents")
        .select("*, document_type:document_types(name, code)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">Dokumen Saya</h1>
            <p className="text-xs opacity-80">Kelola dokumen perjalanan</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <LoadingState />
        ) : !documents || documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Belum ada dokumen"
            description="Dokumen perjalanan Anda akan muncul di sini setelah diunggah"
          />
        ) : (
          documents.map((doc) => {
            const status = statusConfig[doc.status || "pending"] || statusConfig.pending;
            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{(doc.document_type as any)?.name || "Dokumen"}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.created_at ? format(new Date(doc.created_at), "d MMM yyyy", { locale: id }) : "-"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={status.variant} className="gap-1">
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-muted-foreground mt-2 pl-12">{doc.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
