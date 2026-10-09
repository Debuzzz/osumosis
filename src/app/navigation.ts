import { Activity, Layers3, Sparkles, type LucideIcon } from "lucide-react";
import { t } from "../lib/i18n";
export type Page = "library" | "recommend" | "plays" | "settings";
export interface NavigationItem {
  id: Page;
  title: string;
  icon: LucideIcon;
  detail?: string;
}
export const getNavigationItems = (installed: number): NavigationItem[] => [
  { id: "library", title: t("Library"), icon: Layers3, detail: String(installed) },
  { id: "recommend", title: t("For you"), icon: Sparkles },
  { id: "plays", title: t("Your plays"), icon: Activity },
];
