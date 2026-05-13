import { useState, type ElementType, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Info, Copy, Eye, EyeOff, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
  hint: string;
}

export type TestResult = { status: "idle" | "testing" | "ok" | "warn" | "error"; message: string };

export interface ApiKeyGroupProps {
  title: string;
  icon: ElementType;
  color: string;
  description: string;
  fields: ApiKeyField[];
  values: Record<string, string>;
  showFields: Record<string, boolean>;
  onChange: (key: string, value: string) => void;
  onToggleShow: (key: string) => void;
  onTest?: () => Promise<{ ok: boolean; warn?: boolean; message: string }>;
  extra?: ReactNode;
}

const COLOR_MAP: Record<string, string> = {
  blue:    "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
  purple:  "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
  green:   "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
  emerald: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
  amber:   "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
};

const ICON_COLOR_MAP: Record<string, string> = {
  blue:    "text-blue-600",
  purple:  "text-purple-600",
  green:   "text-green-600",
  emerald: "text-emerald-600",
  amber:   "text-amber-600",
};

export function ApiKeyGroup({ title, icon: Icon, color, description, fields, values, showFields, onChange, onToggleShow, onTest, extra }: ApiKeyGroupProps) {
  const configuredCount = fields.filter(f => !!values[f.key]).length;
  const allConfigured   = configuredCount === fields.length;
  const anyConfigured   = configuredCount > 0;

  const [testResult, setTestResult] = useState<TestResult>({ status: "idle", message: "" });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Disalin ke clipboard"));
  };

  const handleTest = async () => {
    if (!onTest) return;
    setTestResult({ status: "testing", message: "Menghubungkan..." });
    try {
      const res = await onTest();
      setTestResult({ status: res.warn ? "warn" : res.ok ? "ok" : "error", message: res.message });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
      setTestResult({ status: "error", message: msg });
    }
  };

  const testBanner = testResult.status !== "idle" && (
    <div className={cn(
      "mx-4 mb-3 flex items-start gap-2 p-3 rounded-lg border text-xs",
      testResult.status === "testing" && "bg-muted border-muted-foreground/20 text-muted-foreground",
      testResult.status === "ok"      && "bg-green-50 dark:bg-green-950/20 border-green-200 text-green-700 dark:text-green-400",
      testResult.status === "warn"    && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-700 dark:text-amber-400",
      testResult.status === "error"   && "bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700 dark:text-red-400",
    )}>
      {testResult.status === "testing" && <Loader2 className="h-3.5 w-3.5 shrink-0 mt-0.5 animate-spin" />}
      {testResult.status === "ok"      && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      {testResult.status === "warn"    && <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      {testResult.status === "error"   && <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      <span>{testResult.message}</span>
    </div>
  );

  return (
    <Card className={`border ${COLOR_MAP[color] ?? ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
              <Icon className={`h-4 w-4 ${ICON_COLOR_MAP[color] ?? "text-primary"}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={allConfigured ? "default" : anyConfigured ? "secondary" : "outline"}
              className={cn("text-[10px]", allConfigured && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400")}>
              {allConfigured
                ? <><CheckCircle2 className="h-3 w-3 mr-1" />{configuredCount}/{fields.length} Terkonfigurasi</>
                : anyConfigured
                ? <><Info className="h-3 w-3 mr-1" />{configuredCount}/{fields.length} Terkonfigurasi</>
                : <><XCircle className="h-3 w-3 mr-1" />Belum dikonfigurasi</>}
            </Badge>
            {onTest && (
              <Button
                type="button" size="sm" variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={handleTest}
                disabled={testResult.status === "testing" || !anyConfigured}
              >
                {testResult.status === "testing"
                  ? <><Loader2 className="h-3 w-3 animate-spin" />Testing...</>
                  : <><Zap className="h-3 w-3" />Test Koneksi</>}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {fields.map(f => {
          const val   = values[f.key] || "";
          const isSet = !!val;
          const shown = showFields[f.key] || false;
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  {f.label}
                  {isSet
                    ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                    : <XCircle className="h-3 w-3 text-muted-foreground/50" />}
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{f.hint}</span>
              </div>
              <div className="flex gap-1.5">
                <Input
                  type={f.secret && !shown ? "password" : "text"}
                  value={val}
                  onChange={e => onChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="flex-1 font-mono text-xs h-8"
                />
                {f.secret && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => onToggleShow(f.key)} title={shown ? "Sembunyikan" : "Tampilkan"}>
                    {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {isSet && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(val)} title="Salin">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
      {testBanner}
      {extra}
    </Card>
  );
}