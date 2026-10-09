import type { PublicSettings } from "../../../shared/types";
export type SettingsForm = PublicSettings & { clientSecret: string };
export type SettingsField = (
  key: "client" | "tosuUrl" | "clientId" | "clientSecret" | "targetStars" | "preferredMods",
  value: string | number,
) => void;
