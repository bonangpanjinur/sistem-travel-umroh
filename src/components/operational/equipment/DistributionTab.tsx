import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Users, Package, CheckCircle2 } from "lucide-react";
import { BarcodeInput } from "./BarcodeInput";
import { PrintManifest } from "./PrintManifest";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Distribution } from "@/pages/operational/EquipmentPage";

interface DistributionTabProps {
  distributions: Distribution[] | undefined;
  onReturn: (dist: Distribution) => void;
  departures: any[] | undefined;
  selectedDeparture: string;
}

export function DistributionTab({
  distributions,
  onReturn,
  departures,
  selectedDeparture,
}: DistributionTabProps) {
  const [viewMode, setViewMode] = useState<"table" | "checklist">("table");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Calculate distribution progress
  const totalDistributed = distributions?.filter(
    (d) => d.status !== "returned"
  ).length || 0;
  const totalReturned = distributions?.filter(
    (d) => d.status === "returned"
  ).length || 0;
  const totalRecords = (distributions?.length || 0);
  const progressPercentage =
    totalRecords > 0 ? (totalDistributed / totalRecords) * 100 : 0;

  // Get current departure info
  const currentDeparture = departures?.find((d) => d.id === selectedDeparture);

  const handleCheckItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const handlePrintManifest = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Barcode Scanner */}
      {selectedDeparture !== "all" && (
        <BarcodeInput
          onBarcodeScanned={(customerId) => {
            // This will be enhanced in Phase 5 with auto-distribution logic
            console.log("Barcode scanned:", customerId);
          }}
          isActive={true}
        />
      )}
      {/* Departure Info & Progress */}
      {selectedDeparture !== "all" && currentDeparture && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Keberangkatan Dipilih
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">
                  {format(new Date(currentDeparture.departure_date), "dd MMMM yyyy", {
                    locale: localeId,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentDeparture.package?.name || "Paket Umrah"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {totalDistributed}/{totalRecords}
                </p>
                <p className="text-xs text-muted-foreground">Terdistribusi</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress Distribusi</span>
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {totalDistributed} dari {totalRecords} item telah didistribusikan
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Tabel
          </Button>
          <Button
            variant={viewMode === "checklist" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("checklist")}
          >
            Checklist
          </Button>
        </div>
        <PrintManifest
          distributions={distributions}
          departureName={currentDeparture?.package?.name}
          departureDate={currentDeparture?.departure_date}
        />
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Jamaah</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions && distributions.length > 0 ? (
                distributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="text-sm">
                      {format(
                        new Date(dist.distributed_at),
                        "dd MMM yyyy HH:mm",
                        { locale: localeId }
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{dist.equipment?.name}</TableCell>
                    <TableCell>{dist.customer?.full_name}</TableCell>
                    <TableCell>{dist.quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          dist.status === "returned" ? "secondary" : "default"
                        }
                      >
                        {dist.status === "returned" ? "Dikembalikan" : "Terdistribusi"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dist.status !== "returned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReturn(dist)}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Kembalikan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {selectedDeparture === "all"
                      ? "Pilih keberangkatan untuk melihat distribusi"
                      : "Belum ada distribusi untuk keberangkatan ini"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Checklist View */}
      {viewMode === "checklist" && (
        <div className="space-y-4">
          {distributions && distributions.length > 0 ? (
            <div className="grid gap-3">
              {distributions.map((dist) => (
                <Card
                  key={dist.id}
                  className={`cursor-pointer transition-all ${
                    checkedItems.has(dist.id)
                      ? "bg-green-50 border-green-300"
                      : "hover:border-primary"
                  }`}
                  onClick={() => handleCheckItem(dist.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={checkedItems.has(dist.id)}
                        onChange={() => handleCheckItem(dist.id)}
                        className="h-6 w-6 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="font-semibold truncate">
                            {dist.equipment?.name}
                          </p>
                          <Badge variant="outline" className="flex-shrink-0">
                            {dist.quantity}x
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {dist.customer?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(
                            new Date(dist.distributed_at),
                            "dd MMM yyyy HH:mm",
                            { locale: localeId }
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {dist.status === "returned" ? (
                          <Badge variant="secondary">Dikembalikan</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReturn(dist);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {selectedDeparture === "all"
                  ? "Pilih keberangkatan untuk melihat checklist distribusi"
                  : "Belum ada distribusi untuk keberangkatan ini"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Print Manifest Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
        }
      `}</style>
    </div>
  );
}
