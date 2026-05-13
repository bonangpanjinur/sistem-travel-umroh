import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * FAQEditor — now a redirect/pointer component.
 *
 * FAQ data is managed via Supabase (`faqs` table) in the dedicated
 * AdminFAQManager page at /admin/faq-manager.
 * This component replaces the old localStorage-based editor with a
 * clean navigation prompt so the AdminAppearance tab still works.
 */
export function FAQEditor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Manajemen FAQ
        </CardTitle>
        <CardDescription>
          FAQ kini dikelola secara terpusat melalui halaman FAQ Manager yang didukung database Supabase,
          sehingga perubahan langsung tampil di website dan chatbot secara real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Tambah, edit, atur urutan, dan publikasikan FAQ langsung dari halaman khusus berikut:
        </p>
        <Button asChild className="gap-2">
          <Link to="/admin/faq-manager">
            <ExternalLink className="h-4 w-4" />
            Buka FAQ Manager
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
