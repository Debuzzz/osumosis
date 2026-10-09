import { z } from "zod";

export const sourceSchema = z.enum(["local", "cached", "new", "all"]);
export const modeSchema = z.enum(["any", "0", "1", "2", "3"]);
export const statusSchema = z.enum([
  "any",
  "ranked",
  "approved",
  "qualified",
  "loved",
  "pending",
  "wip",
  "graveyard",
  "unknown",
  "unsubmitted",
]);
export const searchSchema = z.object({
  q: z.string().max(2000).default(""),
  source: sourceSchema.default("local"),
  mode: modeSchema.default("any"),
  status: statusSchema.default("any"),
  collection: z.string().regex(/^\d*$/).default(""),
  sort: z
    .enum(["title", "artist", "difficulty", "length", "bpm", "recent", "played"])
    .default("title"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(48),
  group: z.enum(["maps", "sets"]).default("maps"),
});
