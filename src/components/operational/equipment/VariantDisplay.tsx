import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, XCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface ItemVariant {
  size?: string;
  color?: string;
  material?: string;
  stock?: number;
}

interface VariantDisplayProps {
  itemName: string;
  variants?: ItemVariant[];
  customerName?: string;
  selectedVariant?: string;
  onVariantSelect?: (value: string) => void;
}

export function VariantDisplay({
  itemName,
  variants,
  customerName,
  selectedVariant,
  onVariantSelect,
}: VariantDisplayProps) {
  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Package className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">{itemName}</p>
            {customerName && (
              <p className="text-xs text-amber-700 mb-2">untuk {customerName}</p>
            )}
            <div className="space-y-3">
              {/* Size Selection as Pill Buttons */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Pilih Ukuran</span>
                <ToggleGroup 
                  type="single" 
                  value={selectedVariant} 
                  onValueChange={(val) => val && onVariantSelect?.(val)}
                  className="justify-start flex-wrap gap-2"
                >
                  {variants.map((variant, idx) => {
                    const isOutOfStock = variant.stock === 0;
                    const value = variant.size || `v-${idx}`;
                    
                    return (
                      <ToggleGroupItem
                        key={idx}
                        value={value}
                        disabled={isOutOfStock}
                        className={cn(
                          "h-auto py-1.5 px-3 border border-amber-200 bg-white data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:border-amber-700",
                          isOutOfStock && "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-medium">{variant.size || "Standard"}</span>
                          <span className={cn(
                            "text-[10px]",
                            isOutOfStock ? "text-red-500" : "text-amber-700 data-[state=on]:text-amber-100"
                          )}>
                            {isOutOfStock ? (
                              <span className="flex items-center gap-0.5"><XCircle className="h-2.5 w-2.5" /> Habis</span>
                            ) : (
                              `Stok: ${variant.stock ?? '?'}`
                            )}
                          </span>
                        </div>
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </div>

              {/* Other Variant Details (Color/Material) if any */}
              <div className="flex flex-wrap gap-2">
                {variants.filter(v => v.size === selectedVariant || !selectedVariant).map((variant, idx) => (
                  <div key={idx} className="flex gap-1">
                    {variant.color && (
                      <Badge variant="outline" className="text-[10px] bg-white border-amber-200 text-amber-800">
                        Warna: {variant.color}
                      </Badge>
                    )}
                    {variant.material && (
                      <Badge variant="outline" className="text-[10px] bg-white border-amber-200 text-amber-800">
                        Material: {variant.material}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
