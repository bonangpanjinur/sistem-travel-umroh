import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { getAgentRef } from '@/hooks/useAgentRef';

export interface TenantInfo {
  type: 'branch' | 'agent' | null;
  id: string | null;
  slug: string | null;
  name: string | null;
}

interface TenantContextType {
  tenant: TenantInfo;
  setTenant: (tenant: TenantInfo) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = React.useState<TenantInfo>({
    type: null,
    id: null,
    slug: null,
    name: null,
  });

  // Restore tenant from localStorage on mount — survives page refresh.
  // Only restores if not already set by an explicit website visit.
  useEffect(() => {
    setTenant(prev => {
      if (prev.type !== null) return prev;
      const ref = getAgentRef();
      if (ref.agentId) {
        return { type: 'agent', id: ref.agentId, slug: ref.agentSlug || null, name: null };
      }
      if (ref.branchId) {
        return { type: 'branch', id: ref.branchId, slug: ref.branchSlug || null, name: null };
      }
      return prev;
    });
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
