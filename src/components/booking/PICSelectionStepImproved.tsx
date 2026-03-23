import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Users, Ticket, MapPin, Loader2, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type PICSource = 'pusat' | 'cabang' | 'agen' | 'referral';

interface PICSelectionStepImprovedProps {
  picSource: PICSource;
  selectedBranchId: string;
  selectedAgentId: string;
  referralCode: string;
  onPICSourceChange: (source: PICSource) => void;
  onBranchChange: (branchId: string) => void;
  onAgentChange: (agentId: string) => void;
  onReferralChange: (code: string) => void;
  validation?: { isValid: boolean; errorMessage?: string; metadata?: any };
  isValidating?: boolean;
}

export function PICSelectionStepImproved({
  picSource,
  selectedBranchId,
  selectedAgentId,
  referralCode,
  onPICSourceChange,
  onBranchChange,
  onAgentChange,
  onReferralChange,
  validation,
  isValidating
}: PICSelectionStepImprovedProps) {
  const [searchBranch, setSearchBranch] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const { tenant } = useTenant();

  // Auto-set PIC source based on tenant context
  useEffect(() => {
    if (tenant.type === 'branch' && tenant.id && picSource !== 'cabang') {
      onPICSourceChange('cabang');
      onBranchChange(tenant.id);
    } else if (tenant.type === 'agent' && tenant.id && picSource !== 'agen') {
      onPICSourceChange('agen');
      onAgentChange(tenant.id);
    }
  }, [tenant.type, tenant.id]);

  // Fetch branches
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['active-branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, city, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, company_name, agent_code')
        .eq('is_active', true)
        .order('company_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredBranches = branches?.filter(b =>
    b.name.toLowerCase().includes(searchBranch.toLowerCase()) ||
    (b.city && b.city.toLowerCase().includes(searchBranch.toLowerCase()))
  ) || [];

  const filteredAgents = agents?.filter(a =>
    (a.company_name || '').toLowerCase().includes(searchAgent.toLowerCase()) ||
    (a.agent_code || '').toLowerCase().includes(searchAgent.toLowerCase())
  ) || [];

  const PIC_OPTIONS = [
    {
      value: 'pusat' as PICSource,
      label: 'Daftar Langsung',
      description: 'Daftar langsung melalui kantor pusat kami',
      icon: Building2,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-300',
      activeColor: 'border-blue-500 bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      value: 'cabang' as PICSource,
      label: 'Daftar Melalui Kantor Cabang',
      description: 'Pilih kantor cabang terdekat Anda',
      icon: Building2,
      color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300',
      activeColor: 'border-emerald-500 bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      value: 'agen' as PICSource,
      label: 'Daftar Melalui Agen Travel',
      description: 'Daftar melalui agen resmi kami',
      icon: Users,
      color: 'bg-purple-50 border-purple-200 hover:border-purple-300',
      activeColor: 'border-purple-500 bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      value: 'referral' as PICSource,
      label: 'Saya Punya Kode Referral',
      description: 'Masukkan kode dari jamaah lain',
      icon: Ticket,
      color: 'bg-orange-50 border-orange-200 hover:border-orange-300',
      activeColor: 'border-orange-500 bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ];

  const selectedOption = PIC_OPTIONS.find(opt => opt.value === picSource);
  const isAutoDetected = tenant.type && (
    (tenant.type === 'branch' && picSource === 'cabang' && selectedBranchId === tenant.id) ||
    (tenant.type === 'agent' && picSource === 'agen' && selectedAgentId === tenant.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Label className="text-lg font-semibold mb-2 block">Bagaimana Anda ingin mendaftar?</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Pilih cara pendaftaran yang sesuai dengan preferensi Anda. Setiap pilihan memiliki keuntungan tersendiri.
        </p>
      </div>

      {/* Validation Feedback */}
      {isValidating ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memverifikasi pilihan Anda...
        </div>
      ) : validation && !validation.isValid ? (
        <Alert variant="destructive" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {validation.errorMessage || 'Pilihan pendaftaran tidak valid'}
          </AlertDescription>
        </Alert>
      ) : validation?.isValid && validation.metadata && picSource !== 'pusat' && (
        <Alert className="border-emerald-200 bg-emerald-50 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            Terverifikasi: <strong>{validation.metadata.name || validation.metadata.branch_name || 'Data Valid'}</strong>
            {picSource === 'referral' && ` (Oleh: ${validation.metadata.name})`}
            {picSource === 'agen' && ` (Cabang: ${validation.metadata.branch_name})`}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-detected banner (only show if no validation error) */}
      {isAutoDetected && (!validation || validation.isValid) && (
        <Alert className="border-emerald-200 bg-emerald-50 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            PIC Anda telah otomatis terdeteksi sebagai <strong>{tenant.name}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* PIC Options Grid */}
      <RadioGroup value={picSource} onValueChange={(v) => onPICSourceChange(v as PICSource)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PIC_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = picSource === option.value;
            return (
              <div
                key={option.value}
                className={cn(
                  "relative border-2 rounded-lg p-4 cursor-pointer transition-all",
                  option.color,
                  isSelected && option.activeColor
                )}
                onClick={() => onPICSourceChange(option.value)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    <RadioGroupItem value={option.value} id={`pic-${option.value}`} className="hidden" />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected ? `border-current ${option.iconColor}` : 'border-gray-300'
                    )}>
                      {isSelected && (
                        <div className={cn("w-2.5 h-2.5 rounded-full", option.iconColor.replace('text-', 'bg-'))} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-4 w-4 flex-shrink-0", option.iconColor)} />
                      <Label
                        htmlFor={`pic-${option.value}`}
                        className="font-semibold text-sm cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </RadioGroup>

      {/* Conditional Content Based on Selection */}
      {picSource === 'cabang' && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Pilih Kantor Cabang
            </CardTitle>
            <CardDescription>
              Pilih cabang terdekat dengan lokasi Anda untuk kemudahan komunikasi dan layanan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Cari berdasarkan nama atau kota..."
              value={searchBranch}
              onChange={(e) => setSearchBranch(e.target.value)}
              className="text-sm"
            />

            {branchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBranches.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredBranches.map((branch) => {
                  const isSelected = selectedBranchId === branch.id;
                  const isAutoSelected = tenant.type === 'branch' && tenant.id === branch.id;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => onBranchChange(branch.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all hover:border-emerald-400",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-emerald-100 hover:bg-emerald-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{branch.name}</p>
                            {isAutoSelected && (
                              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                Terdeteksi Otomatis
                              </Badge>
                            )}
                          </div>
                          {branch.city && (
                            <p className="text-xs text-muted-foreground">{branch.city}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada cabang yang ditemukan
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {picSource === 'agen' && (
        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Pilih Agen Travel
            </CardTitle>
            <CardDescription>
              Pilih agen resmi kami yang tersedia di berbagai lokasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Cari berdasarkan nama agen..."
              value={searchAgent}
              onChange={(e) => setSearchAgent(e.target.value)}
              className="text-sm"
            />

            {agentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAgents.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  const isAutoSelected = tenant.type === 'agent' && tenant.id === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => onAgentChange(agent.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all hover:border-purple-400",
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-purple-100 hover:bg-purple-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{agent.company_name || agent.agent_code}</p>
                            {isAutoSelected && (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                Terdeteksi Otomatis
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Kode: {agent.agent_code}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada agen yang ditemukan
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {picSource === 'referral' && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-orange-600" />
              Masukkan Kode Referral
            </CardTitle>
            <CardDescription>
              Jika Anda memiliki kode referral dari jamaah lain, masukkan di sini untuk mendapatkan keuntungan khusus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  placeholder="Contoh: REF-NAMA123"
                  value={referralCode}
                  onChange={(e) => onReferralChange(e.target.value.toUpperCase())}
                  className={cn(
                    "text-sm uppercase pr-10",
                    validation?.isValid && picSource === 'referral' ? "border-emerald-500 bg-emerald-50/30" : ""
                  )}
                />
                {isValidating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {validation?.isValid && picSource === 'referral' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Kode referral biasanya diberikan oleh jamaah yang telah terdaftar sebelumnya. Pastikan Anda memasukkan kode yang benar.
              </p>
            </div>

            {validation?.isValid && picSource === 'referral' && validation.metadata && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 text-sm">
                  Kode valid! Pemberi referral: <strong>{validation.metadata.name}</strong>
                </AlertDescription>
              </Alert>
            )}
            
            {validation && !validation.isValid && picSource === 'referral' && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {validation.errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {picSource === 'pusat' && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Daftar Langsung ke Pusat
            </CardTitle>
            <CardDescription>
              Anda akan didampingi langsung oleh tim profesional kami di kantor pusat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-blue-200 bg-white">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Dengan mendaftar langsung ke pusat, Anda akan mendapatkan konsultasi personal dan penawaran khusus dari tim kami.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
