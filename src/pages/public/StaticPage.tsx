import { useParams, useLocation } from "react-router-dom";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaticPage() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const slug = paramSlug || location.pathname.replace("/", "");
  const { data: page, isLoading, error } = useStaticPage(slug);

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  if (error || !page) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Halaman Tidak Ditemukan</h1>
          <p className="text-muted-foreground">Halaman yang Anda cari tidak tersedia.</p>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      {page.meta_title && <title>{page.meta_title}</title>}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">{page.title}</h1>
        <div 
          className="prose prose-lg max-w-none text-foreground
            prose-headings:text-foreground prose-p:text-muted-foreground
            prose-strong:text-foreground prose-li:text-muted-foreground
            prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(page.content) }}
        />
      </div>
    </DynamicPublicLayout>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hlo])/gm, (match) => match ? `<p>${match}` : '')
    .replace(/<p><(h[1-3]|li|ol|ul)/g, '<$1')
    .replace(/<\/(h[1-3]|li)><\/p>/g, '</$1>');
}
