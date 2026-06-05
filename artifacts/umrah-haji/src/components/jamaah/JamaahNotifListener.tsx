import { useJamaahNotifRealtime } from '@/hooks/useJamaahNotifRealtime';

/**
 * Zero-render side-effect component.
 *
 * Mounts a single Supabase realtime channel for the logged-in jamaah user's
 * notifications. Renders nothing — purely a hook host so the subscription lives
 * at app level and stays alive across page navigations.
 *
 * Mounted once in App.tsx alongside JamaahThemeAttacher.
 */
export function JamaahNotifListener() {
  useJamaahNotifRealtime();
  return null;
}
