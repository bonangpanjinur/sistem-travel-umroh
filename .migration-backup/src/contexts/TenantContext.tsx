import React, { createContext, useContext, ReactNode } from 'react';

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
