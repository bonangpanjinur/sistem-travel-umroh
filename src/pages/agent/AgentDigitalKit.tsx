import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Image, Play, Zap, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatBytes } from "@/lib/format";

interface MarketingMaterial {
  id: string;
  name: string;
  description: string;
  material_type: "brochure" | "flyer" | "banner" | "poster" | "video" | "template";
  category: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  download_count: number;
  tags: string[];
  created_at: string;
}

const MATERIAL_TYPE_ICONS = {
  brochure: FileText,
  flyer: FileText,
  banner: Image,
  poster: Image,
  video: Play,
  template: Zap,
};

const MATERIAL_TYPE_LABELS = {
  brochure: "Brosur",
  flyer: "Flyer",
  banner: "Banner",
  poster: "Poster",
  video: "Video",
  template: "Template",
};

export default function AgentDigitalKit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch marketing materials
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["marketing-materials", selectedType, selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("marketing_materials")
        .select("*")
        .eq("is_active", true)
        .eq("available_for_agents", true)
        .order("created_at", { ascending: false });

      if (selectedType !== "all") {
        query = query.eq("material_type", selectedType);
      }

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      if (searchQuery) {
        return (data || []).filter(
          (m) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.tags?.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
      }

      return data || [];
    },
  });

  // Get unique categories
  const categories = Array.from(
    new Set(materials.map((m) => m.category).filter(Boolean))
  );

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async (material: MarketingMaterial) => {
      // Record download
      const { error: downloadError } = await supabase
        .from("marketing_material_downloads")
        .insert({
          material_id: material.id,
          user_id: user?.id,
        });

      if (downloadError && !downloadError.message.includes("duplicate")) {
        throw downloadError;
      }

      // Trigger actual download
      const link = document.createElement("a");
      link.href = material.file_url;
      link.download = material.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return material;
    },
    onSuccess: (material) => {
      toast.success(`${material.file_name} berhasil diunduh!`);
      queryClient.invalidateQueries({ queryKey: ["marketing-materials"] });
    },
    onError: (error: any) => {
      toast.error("Gagal mengunduh file: " + error.message);
    },
  });

  const MaterialCard = ({ material }: { material: MarketingMaterial }) => {
    const IconComponent = MATERIAL_TYPE_ICONS[material.material_type];

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold line-clamp-2">{material.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {MATERIAL_TYPE_LABELS[material.material_type]}
                </p>
              </div>
            </div>
          </div>

          {material.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {material.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {material.category && (
              <Badge variant="outline" className="text-xs">
                {material.category}
              </Badge>
            )}
            {material.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p>{formatBytes(material.file_size)}</p>
              <p>{material.download_count} downloads</p>
            </div>
            <Button
              size="sm"
              onClick={() => downloadMutation.mutate(material)}
              disabled={downloadMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Unduh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Digital Kit Promosi</h1>
        <p className="text-muted-foreground">
          Unduh materi promosi untuk membantu penjualan Anda
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari materi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipe Material</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="brochure">Brosur</SelectItem>
                  <SelectItem value="flyer">Flyer</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="poster">Poster</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Kategori</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-20 mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Tidak ada materi ditemukan</h3>
            <p className="text-muted-foreground">
              Coba ubah filter atau hubungi admin untuk menambah materi promosi
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}

      {/* Stats */}
      {materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Materi</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Downloads</p>
                <p className="text-2xl font-bold">
                  {materials.reduce((sum, m) => sum + m.download_count, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ukuran</p>
                <p className="text-2xl font-bold">
                  {formatBytes(
                    materials.reduce((sum, m) => sum + m.file_size, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
