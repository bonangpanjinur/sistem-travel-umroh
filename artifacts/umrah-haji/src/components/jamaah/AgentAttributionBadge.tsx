import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Building2, UserCheck } from 'lucide-react';

export function AgentAttributionBadge() {
  const { user } = useAuth();

  const { data: account } = useQuery({
    queryKey: ['customer_account_badge', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_accounts' as any)
        .select('*, agents(company_name, agent_code), branches(name, code)')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  if (!account) return null;

  const agent = account?.agents;
  const branch = account?.branches;

  if (!agent && !branch) return null;

  return (
    <div className="flex items-center gap-2">
      {agent && (
        <Badge variant="secondary" className="text-xs flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          Agen: {agent.company_name || agent.agent_code}
        </Badge>
      )}
      {branch && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          Cabang: {branch.name || branch.code}
        </Badge>
      )}
    </div>
  );
}
