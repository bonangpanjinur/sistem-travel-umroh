/**
 * Lightweight icon registry for admin menus & command palette.
 * Replaces `import * as LucideIcons` (~1500 icons, multi-MB) with explicit
 * named imports for the ~50 icons we actually use. Tree-shaken to ~50 KB.
 */

import {
  LayoutDashboard, BarChart3, BarChart2, Package, CalendarDays, CalendarClock,
  BookOpen, BookMarked, Backpack, Map, Wallet, BedDouble, Users, UserSquare2,
  Network, Gift, Share2, Star, GraduationCap, StickyNote, CreditCard, Coins,
  TrendingUp, TrendingDown, PieChart, UserPlus, Ticket, Globe, Contact2,
  Banknote, FileCheck, FileText, Plane, Building, Hotel, UserCheck, Bus, Store,
  LifeBuoy, MessageSquare, Megaphone, FileBarChart, UserCog, ShieldAlert,
  KeyRound, Palette, MessageCircle, Layers, Settings, Circle,
  FileCog, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export const ADMIN_MENU_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, BarChart3, BarChart2, Package, CalendarDays, CalendarClock,
  BookOpen, BookMarked, Backpack, Map, Wallet, BedDouble, Users, UserSquare2,
  Network, Gift, Share2, Star, GraduationCap, StickyNote, CreditCard, Coins,
  TrendingUp, TrendingDown, PieChart, UserPlus, Ticket, Globe, Contact2,
  Banknote, FileCheck, FileText, Plane, Building, Hotel, UserCheck, Bus, Store,
  LifeBuoy, MessageSquare, Megaphone, FileBarChart, UserCog, ShieldAlert,
  KeyRound, Palette, MessageCircle, Layers, Settings, FileCog, ShieldCheck,
};

/** Resolve an icon by name, falling back to Circle when unknown/missing. */
export function getMenuIcon(name?: string): LucideIcon {
  if (!name) return Circle;
  return ADMIN_MENU_ICONS[name] ?? Circle;
}
