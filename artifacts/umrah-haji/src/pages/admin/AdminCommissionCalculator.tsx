import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

/** AGEN-ADD5 — Kalkulator Komisi Agen */
export default function AdminCommissionCalculator() {
  const [pax, setPax] = useState(1);
  const [pricePerPax, setPricePerPax] = useState(35000000);
  const [commissionPct, setCommissionPct] = useState(5);
  const [royaltyPct, setRoyaltyPct] = useState(10);

  const total = pax * pricePerPax;
  const commission = (total * commissionPct) / 100;
  const royalty = (commission * royaltyPct) / 100;

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-7 w-7 text-primary" />Kalkulator Komisi</h1>
      <Card>
        <CardHeader><CardTitle>Input</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label>Jumlah Jamaah</Label><Input type="number" value={pax} onChange={(e) => setPax(Number(e.target.value))} /></div>
          <div><Label>Harga / Pax (IDR)</Label><Input type="number" value={pricePerPax} onChange={(e) => setPricePerPax(Number(e.target.value))} /></div>
          <div><Label>Komisi Agen (%)</Label><Input type="number" value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} /></div>
          <div><Label>Royalti Parent (%)</Label><Input type="number" value={royaltyPct} onChange={(e) => setRoyaltyPct(Number(e.target.value))} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Estimasi</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-lg">
          <div className="flex justify-between"><span>Total Booking</span><b>Rp {total.toLocaleString("id-ID")}</b></div>
          <div className="flex justify-between"><span>Komisi Agen</span><b className="text-emerald-600">Rp {commission.toLocaleString("id-ID")}</b></div>
          <div className="flex justify-between"><span>Royalti Parent (jika sub-agen)</span><b>Rp {royalty.toLocaleString("id-ID")}</b></div>
          <div className="flex justify-between border-t pt-2"><span>Komisi Bersih</span><b className="text-primary">Rp {(commission - royalty).toLocaleString("id-ID")}</b></div>
        </CardContent>
      </Card>
    </div>
  );
}