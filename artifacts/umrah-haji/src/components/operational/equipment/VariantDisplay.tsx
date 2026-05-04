import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

interface ItemVariant {
  size?: string;
  color?: string;
  material?: string;
}

interface VariantDisplayProps {
  itemName: string;
  variants?: ItemVariant[];
  customerName?: string;
}

export function VariantDisplay({
  itemName,
  variants,
  customerName,
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
            <div className="flex flex-wrap gap-2">
              {variants.map((variant, idx) => (
                <div key={idx} className="flex gap-1">
                  {variant.size && (
                    <Badge variant="secondary" className="text-xs">
                      Ukuran: {variant.size}
                    </Badge>
                  )}
                  {variant.color && (
                    <Badge variant="secondary" className="text-xs">
                      Warna: {variant.color}
                    </Badge>
                  )}
                  {variant.material && (
                    <Badge variant="secondary" className="text-xs">
                      Material: {variant.material}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
