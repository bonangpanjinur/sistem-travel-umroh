import React from "react";
import { useUdacPermissions } from "@/hooks/useUdacPermissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

interface UdacPermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}

export const UdacPermissionGuard: React.FC<UdacPermissionGuardProps> = ({
  permission,
  children,
  fallback,
  showError = false,
}) => {
  const { hasPermission, isLoading } = useUdacPermissions();

  if (isLoading) {
    return null; // Atau loading spinner
  }

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showError) {
    return (
      <Alert variant="destructive" className="my-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Akses Ditolak</AlertTitle>
        <AlertDescription>
          Anda tidak memiliki izin akses untuk fitur ini ({permission}). 
          Silakan hubungi administrator jika Anda memerlukan akses.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

/**
 * HOC for wrapping pages or components with UDAC protection
 */
export function withUdacPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  showError = true
) {
  return function WithUdacPermissionWrapper(props: P) {
    return (
      <UdacPermissionGuard permission={permission} showError={showError}>
        <Component {...props} />
      </UdacPermissionGuard>
    );
  };
}
