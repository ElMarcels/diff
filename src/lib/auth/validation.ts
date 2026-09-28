import { z } from "zod";

/**
 * Shared validation for every auth/creation endpoint. Kept in one place so
 * the client forms and the API routes validate exactly the same thing.
 */

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores are allowed.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password is too long.");

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: passwordSchema,
});

export const profileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().min(1).max(64).optional(),
  locale: z.enum(["en", "es"]).optional(),
  publicProfile: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  animationsEnabled: z.boolean().optional(),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Slug must be at least 3 characters.")
  .max(48)
  .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and dashes are allowed.");

export const SUBMISSION_STATUSES = [
  "draft",
  "pending",
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
  "published",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const httpUrl = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .refine((v) => /^https?:\/\//i.test(v), "The URL must start with http:// or https://");

export const submissionCreateSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(3, "Give your game a title.").max(64),
  summary: z.string().trim().min(10, "Write a short summary (10+ characters).").max(160),
  body: z.string().trim().max(8000).optional(),
  category: z.string().trim().min(2).max(48).default("Arcade"),
  playUrl: httpUrl,
  repositoryUrl: z.union([httpUrl, z.literal("")]).optional(),
  license: z.string().trim().min(1).max(32).default("MIT"),
  version: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+){0,2}$/, "Use a version like 1.0 or 1.0.0.")
    .default("1.0.0"),
  submit: z.boolean().default(true), // false keeps it as a draft
});

export const submissionUpdateSchema = z.object({
  title: z.string().trim().min(3).max(64).optional(),
  summary: z.string().trim().min(10).max(160).optional(),
  body: z.string().trim().max(8000).optional(),
  category: z.string().trim().min(2).max(48).optional(),
  playUrl: httpUrl.optional(),
  repositoryUrl: z.union([httpUrl, z.literal("")]).optional(),
  license: z.string().trim().min(1).max(32).optional(),
  version: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+){0,2}$/, "Use a version like 1.0 or 1.0.0.")
    .optional(),
  changelog: z.string().trim().max(2000).optional(),
  submit: z.boolean().optional(), // true = (re)send to the moderation queue
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(4000),
});

/** Statuses a moderator is allowed to move a submission to. */
export const moderationTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  draft: ["pending"],
  pending: ["in_review", "approved", "rejected", "changes_requested"],
  in_review: ["changes_requested", "approved", "rejected"],
  changes_requested: ["pending"],
  approved: ["published", "in_review"],
  rejected: ["pending"],
  published: [],
};

export const statusChangeSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES),
  note: z.string().trim().max(2000).optional(),
});

export const roleUpdateSchema = z.object({
  id: z.string().uuid("Unknown user id."),
  role: z.enum(["user", "moderator", "owner"]),
});

export const gameCreateSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().min(10).max(1000),
  tagline: z.string().trim().max(120).optional(),
  category: z.string().trim().min(2).max(48).default("Arcade"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  players: z.string().trim().min(2).max(24).default("1 Player"),
  playUrl: z.union([httpUrl, z.literal("")]).optional(),
  source: z.enum(["builtin", "submission", "mod"]).default("mod"),
  enabled: z.boolean().default(true),
});

export const gameUpdateSchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  description: z.string().trim().min(10).max(1000).optional(),
  tagline: z.string().trim().max(120).optional(),
  category: z.string().trim().min(2).max(48).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  players: z.string().trim().min(2).max(24).optional(),
  playUrl: z.union([httpUrl, z.literal("")]).optional(),
  enabled: z.boolean().optional(),
});

export const publishSchema = z.object({
  tagline: z.string().trim().max(120).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  players: z.string().trim().min(2).max(24).optional(),
  enabled: z.boolean().default(true),
});

/** Flattens a ZodError into `{ field: message }` for the UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
