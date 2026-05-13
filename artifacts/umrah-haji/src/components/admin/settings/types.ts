import type { ElementType } from "react";

export type SettingsSection =
  | "profile" | "company" | "bank" | "documents"
  | "notifications" | "appearance" | "sidebar" | "security" | "apikeys" | "danger";

export interface NavItem {
  id: SettingsSection;
  label: string;
  icon: ElementType;
  description: string;
  adminOnly?: boolean;
}