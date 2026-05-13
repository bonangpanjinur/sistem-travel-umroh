/**
 * Lightweight icon registry for admin menus & command palette.
 * Replaces `import * as LucideIcons` (~1500 icons, multi-MB) with explicit
 * named imports for the icons we actually use. Tree-shaken to ~60 KB.
 */

import {
  LayoutDashboard, BarChart3, BarChart2, Package, CalendarDays, CalendarClock,
  BookOpen, BookMarked, Backpack, Map, MapPin, Wallet, BedDouble,
  Users, Users2, UserSquare2, User, UserCheck, UserCog, UserPlus,
  Network, Gift, Share2, Star, Award, GraduationCap, StickyNote,
  CreditCard, Coins, PiggyBank, TrendingUp, TrendingDown, PieChart,
  Ticket, Globe, Contact2, Banknote,
  FileCheck, FileText, FileCog, FileBarChart, FileSearch,
  Plane, Building, Hotel, Bus, Store,
  LifeBuoy, MessageSquare, Megaphone, HelpCircle,
  ShieldAlert, ShieldCheck, KeyRound, Palette, ScanSearch,
  MessageCircle, Layers, Settings, Circle,
  ListOrdered, LayoutGrid, LineChart,
  Webhook, Target, Navigation, Plug, Database, Crown,
  PackageOpen, ClipboardCheck, ArrowDownToLine, ArrowUpFromLine,
  Radio, Mail, Bell, BellRing, MessagesSquare, WifiOff, Image,
  Trophy, Landmark, Smile, Sparkles,
  type LucideIcon,
} from 'lucide-react';

// ShieldQuestion may not exist in installed version — alias ShieldAlert as fallback
const ShieldQuestion = ShieldAlert;
// PersonStanding may not exist — alias User as fallback
const PersonStanding = User;
// ChartLine may not exist — alias LineChart
const ChartLine = LineChart;
// MessageSquareDot / BrainCircuit may not exist — alias fallbacks
const MessageSquareDot = MessageSquare;
const BrainCircuit = Sparkles;

export const ADMIN_MENU_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, BarChart3, BarChart2, Package, CalendarDays, CalendarClock,
  BookOpen, BookMarked, Backpack, Map, MapPin, Wallet, BedDouble,
  Users, Users2, UserSquare2, User, UserCheck, UserCog, UserPlus,
  Network, Gift, Share2, Star, Award, GraduationCap, StickyNote,
  CreditCard, Coins, PiggyBank, TrendingUp, TrendingDown, PieChart,
  Ticket, Globe, Contact2, Banknote,
  FileCheck, FileText, FileCog, FileBarChart, FileSearch,
  Plane, Building, Hotel, Bus, Store,
  LifeBuoy, MessageSquare, Megaphone, HelpCircle,
  ShieldAlert, ShieldCheck, ShieldQuestion, KeyRound, Palette, ScanSearch,
  MessageCircle, Layers, Settings, ListOrdered, LayoutGrid, LineChart,
  ChartLine, PersonStanding,
  Circle,
  Webhook, Target, Navigation, Plug, Database, Crown,
  PackageOpen, ClipboardCheck, ArrowDownToLine, ArrowUpFromLine,
  Radio, Mail, Bell, BellRing, MessagesSquare, WifiOff, Image,
  Trophy, Landmark, Smile, Sparkles,
  MessageSquareDot, BrainCircuit,
};

/** Resolve an icon by name, falling back to Circle when unknown/missing. */
export function getMenuIcon(name?: string): LucideIcon {
  if (!name) return Circle;
  return ADMIN_MENU_ICONS[name] ?? Circle;
}
