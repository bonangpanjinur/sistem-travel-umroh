import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getStoredToken, setStoredToken } from '@/integrations/supabase/client';
import { AppRole, Profile } from '@/types/database';
import { sortRoles } from '@/lib/constants';

// Toggle verbose auth logging via `?debug=auth` in the URL.
// Keeps production console clean while preserving on-demand debugging.
const DEBUG_AUTH =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === 'auth';
const dlog = (...a: unknown[]) => {
  if (DEBUG_AUTH) console.log(...a);
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  branchId: string | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isStaff: () => boolean;
  isAgent: () => boolean;
  isCustomer: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authHandledRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set authHandledRef synchronously to prevent race condition
    let authHandled = false;

    const handleInvalidSession = () => {
      console.warn('[Auth] handleInvalidSession - Clearing corrupted session', {
        timestamp: new Date().toISOString(),
        pathname: window.location.pathname
      });
      lastFetchedUserIdRef.current = null;
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      setBranchId(null);
      setIsLoading(false);
      // Hard signOut to clear corrupted token in storage (fire & forget)
      supabase.auth.signOut().catch(() => {});
      setStoredToken(null);
      // Redirect to login if user is on a protected area
      const path = window.location.pathname;
      const isProtected =
        path.startsWith('/admin') ||
        path.startsWith('/operational') ||
        path.startsWith('/hr') ||
        path.startsWith('/agent') ||
        path.startsWith('/jamaah') ||
        path.startsWith('/customer');
      if (isProtected && !path.startsWith('/auth/')) {
        console.log('[Auth] Redirecting to login from protected area:', path);
        window.location.href = `/auth/login?redirect=${encodeURIComponent(path)}`;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authHandled = true;
        authHandledRef.current = true;

        dlog('[Auth] onAuthStateChange event:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });

        // Refresh failure: token rotated and revoked, or storage corrupted
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[Auth] TOKEN_REFRESHED but no session — invalid refresh token. Signing out.');
          handleInvalidSession();
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Dedupe: skip refetch on TOKEN_REFRESHED / USER_UPDATED for same user
          if (lastFetchedUserIdRef.current === session.user.id) {
            dlog('[Auth] Skipping refetch - same user ID:', session.user.id);
            setIsLoading(false);
            return;
          }
          dlog('[Auth] Fetching user data for new user:', session.user.id);
          fetchUserData(session.user.id);
        } else {
          dlog('[Auth] No session user - clearing profile and roles');
          lastFetchedUserIdRef.current = null;
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        // Skip if onAuthStateChange already handled this or listener fired
        if (authHandled || authHandledRef.current) {
          dlog('[Auth] getSession skipped - already handled by onAuthStateChange');
          return;
        }

        dlog('[Auth] getSession result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          hasError: !!error,
          timestamp: new Date().toISOString()
        });

        if (error) {
          const msg = (error as any)?.message?.toLowerCase?.() || '';
          if (msg.includes('refresh token') || msg.includes('invalid')) {
            console.warn('[Auth] getSession error — invalid token. Signing out.', error);
            handleInvalidSession();
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          if (lastFetchedUserIdRef.current === session.user.id) {
            dlog('[Auth] getSession - skipping refetch for same user');
            setIsLoading(false);
            return;
          }
          dlog('[Auth] getSession - fetching user data:', session.user.id);
          fetchUserData(session.user.id);
        } else {
          dlog('[Auth] getSession - no session, setting loading to false');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[Auth] getSession threw — clearing session.', err);
        handleInvalidSession();
      });

    // Sync logout across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key && (e.key.includes('supabase.auth.token') || e.key === 'vinstour_access_token') && !e.newValue) {
        dlog('[Auth] Storage event - auth token cleared (logout from another tab)', {
          key: e.key,
          timestamp: new Date().toISOString()
        });
        lastFetchedUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setBranchId(null);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      dlog('[Auth] fetchUserData - starting for userId:', userId);
      lastFetchedUserIdRef.current = userId;
      // Fetch profile + roles in parallel for faster login
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role, branch_id').eq('user_id', userId),
      ]);

      dlog('[Auth] fetchUserData - profile result:', {
        hasProfile: !!profileRes.data,
        profileError: profileRes.error,
        profileRole: (profileRes.data as any)?.role
      });

      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
      }

      dlog('[Auth] fetchUserData - roles result:', {
        rolesCount: rolesRes.data?.length || 0,
        rolesError: rolesRes.error,
        roles: rolesRes.data?.map(r => r.role) || []
      });

      if (rolesRes.data) {
        const userRoles = sortRoles(rolesRes.data.map(r => r.role as AppRole));
        setRoles(userRoles);
        // Pick the first non-null branch_id following role priority order so that
        // multi-role users (e.g. owner + branch_manager + sales) keep a stable branch.
        const orderedBranchId =
          userRoles
            .map((r) => rolesRes.data!.find((row) => row.role === r && row.branch_id)?.branch_id)
            .find((b): b is string => !!b) || null;
        setBranchId(orderedBranchId);
        dlog('[Auth] fetchUserData - roles set:', {
          roles: userRoles,
          branchId: orderedBranchId,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    dlog('[Auth] signOut - clearing all auth state', {
      timestamp: new Date().toISOString()
    });
    setStoredToken(null);
    await supabase.auth.signOut();
    lastFetchedUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setBranchId(null);
    dlog('[Auth] signOut - complete');
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  /**
   * Staf internal — punya akses ke panel admin (/admin, /operational, /hr).
   * Agent & sub_agent adalah mitra eksternal, bukan staf internal.
   * Customer & jamaah tidak termasuk.
   */
  const isStaff = (): boolean => {
    const internalStaffRoles: AppRole[] = [
      'super_admin', 'owner', 'branch_manager',
      'finance', 'sales', 'marketing', 'operational', 'equipment',
    ];
    return roles.some(role => internalStaffRoles.includes(role));
  };

  /**
   * Admin — owner ke atas; berwenang mengelola pengguna, cabang, dan pengaturan.
   */
  const isAdmin = (): boolean => {
    const adminRoles: AppRole[] = ['super_admin', 'owner', 'branch_manager'];
    return roles.some(role => adminRoles.includes(role));
  };

  const isSuperAdmin = (): boolean => {
    return roles.includes('super_admin');
  };

  /**
   * Agen eksternal (agent atau sub_agent).
   * Mereka memiliki portal sendiri di /agent, terpisah dari admin.
   */
  const isAgent = (): boolean => {
    return roles.some(role => (['agent', 'sub_agent'] as AppRole[]).includes(role));
  };

  /**
   * Pengguna publik yang sudah terdaftar (customer atau jamaah).
   * Mereka hanya bisa mengakses portal pribadi di /jamaah dan /customer.
   */
  const isCustomer = (): boolean => {
    return roles.some(role => (['customer', 'jamaah'] as AppRole[]).includes(role));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        branchId,
        isLoading,
        signUp,
        signIn,
        signOut,
        hasRole,
        isAdmin,
        isSuperAdmin,
        isStaff,
        isAgent,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
