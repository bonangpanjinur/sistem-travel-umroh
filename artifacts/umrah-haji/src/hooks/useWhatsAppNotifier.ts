/**
 * ⚠️ DEPRECATED: useWhatsAppNotifier
 * 
 * This hook is DEPRECATED and should NOT be used in new code.
 * Use `useWhatsAppNotifierSecure` instead, which sends all messages through backend API.
 * 
 * SECURITY ISSUE:
 * The old implementation exposed Fonnte API tokens directly from the browser,
 * which is a critical security risk. Anyone with access to browser DevTools or
 * network traffic could capture the token and send unauthorized WhatsApp messages.
 * 
 * MIGRATION PATH:
 * - Old: import { useWhatsAppNotifier } from "@/hooks/useWhatsAppNotifier";
 * - New: import { useWhatsAppNotifierSecure } from "@/hooks/useWhatsAppNotifierSecure";
 * 
 * The API is identical, so you can usually just swap the import statement.
 * 
 * TIMELINE:
 * - Phase 1 (Current): New code uses useWhatsAppNotifierSecure
 * - Phase 2 (Mei 2026): All existing code migrated to useWhatsAppNotifierSecure
 * - Phase 3 (Juni 2026): Old hooks marked as deprecated with console warnings
 * - Phase 4 (Q3 2026): Old hooks removed entirely
 * 
 * For more information, see: WHATSAPP_SECURITY_MIGRATION.md
 */

import { useWhatsAppNotifierSecure } from "./useWhatsAppNotifierSecure";

/**
 * @deprecated Use useWhatsAppNotifierSecure instead
 * @see useWhatsAppNotifierSecure
 */
export function useWhatsAppNotifier() {
  console.warn(
    "⚠️ DEPRECATED: useWhatsAppNotifier is deprecated. Use useWhatsAppNotifierSecure instead. " +
    "See WHATSAPP_SECURITY_MIGRATION.md for migration details."
  );
  return useWhatsAppNotifierSecure();
}
