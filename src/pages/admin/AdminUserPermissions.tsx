import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * @deprecated This page is now a redirect shim to AdminUsers with permissions modal
 * 
 * This page previously contained duplicate permission management functionality.
 * All permission management has been consolidated into AdminUsers.tsx with a modal dialog.
 * 
 * This component now redirects to /admin/users and optionally opens the permissions dialog
 * for a specific user if a user_id query parameter is provided.
 */
export default function AdminUserPermissions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');

  useEffect(() => {
    // Redirect to AdminUsers page
    // If user_id is provided, it will be passed along to open the permissions dialog
    if (userId) {
      navigate(`/admin/users?open_permissions=${userId}`, { replace: true });
    } else {
      navigate('/admin/users', { replace: true });
    }
  }, [navigate, userId]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Mengarahkan ke manajemen user...</p>
      </div>
    </div>
  );
}
