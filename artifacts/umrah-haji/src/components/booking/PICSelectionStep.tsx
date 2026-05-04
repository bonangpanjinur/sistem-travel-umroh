import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Ticket, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PICSource = 'pusat' | 'cabang' | 'agen' | 'referral';

interface PICSelectionStepProps {
  picSource: PICSource;
  selectedBranchId: string;
  selectedAgentId: string;
  referralCode: string;
  onPICSourceChange: (source: PICSource) => void;
  onBranchChange: (branchId: string) => void;
  onAgentChange: (agentId: string) => void;
  onReferralChange: (code: string) => void;
}

export function PICSelectionStep({
  picSource,
  selectedBranchId,
  selectedAgentId,
  referralCode,
  onPICSourceChange,
  onBranchChange,
  onAgentChange,
  onReferralChange,
}: PICSelectionStepProps) {
  const [searchBranch, setSearchBranch] = useState('');
  const [searchAgent, setSearchAgent] = useState('');

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
    (a.company_name ?? '').toLowerCase().includes(searchAgent.toLowerCase())
  ) || [];

  const PIC_OPTIONS = [
    {
      value: 'pusat' as PICSource,
      label: 'Daftar Langsung',
      description: 'Daftar langsung melalui kantor pusat kami',
      icon: Building2,
    },
    {
      value: 'cabang' as PICSource,
      label: 'Daftar Melalui Kantor Cabang',
      description: 'Pilih kantor cabang terdekat Anda',
      icon: Building2,
    },
    {
      value: 'agen' as PICSource,
      label: 'Daftar Melalui Agen Travel',
      description: 'Daftar melalui agen resmi kami',
      icon: Users,
    },
    {
      value: 'referral' as PICSource,
      label: 'Saya Punya Kode Referral',
      description: 'Masukkan kode dari jamaah lain',
      icon: Ticket,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-4 block">Bagaimana Anda ingin mendaftar?</Label>
        <RadioGroup value={picSource} onValueChange={(v) => onPICSourceChange(v as PICSource)}>
          <div className="space-y-3">
            {PIC_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50",
                    picSource === option.value && "border-primary bg-primary/5"
                  )}
                  onClick={() => onPICSourceChange(option.value)}
                >
                  <RadioGroupItem value={option.value} id={`pic-${option.value}`} className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor={`pic-${option.value}`}
                      className="flex items-center gap-2 cursor-pointer font-medium text-sm mb-1"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </div>

      {/* Conditional Content Based on Selection */}
      {picSource === 'cabang' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Pilih Kantor Cabang
            </CardTitle>
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredBranches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => onBranchChange(branch.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary",
                      selectedBranchId === branch.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{branch.name}</p>
                        {branch.city && (
                          <p className="text-xs text-muted-foreground">{branch.city}</p>
                        )}
                      </div>
                      {selectedBranchId === branch.id && (
                        <Badge className="bg-primary">Dipilih</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada cabang yang ditemukan
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {picSource === 'agen' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pilih Agen Travel
            </CardTitle>
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => onAgentChange(agent.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary",
                      selectedAgentId === agent.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{agent.company_name}</p>
                        <p className="text-xs text-muted-foreground">Kode: {agent.agent_code}</p>
                      </div>
                      {selectedAgentId === agent.id && (
                        <Badge className="bg-primary">Dipilih</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada agen yang ditemukan
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {picSource === 'referral' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Masukkan Kode Referral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Contoh: REF-NAMA123"
              value={referralCode}
              onChange={(e) => onReferralChange(e.target.value.toUpperCase())}
              className="text-sm uppercase"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Kode referral biasanya diberikan oleh jamaah yang telah terdaftar sebelumnya.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
