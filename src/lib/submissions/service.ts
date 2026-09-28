import { aliasedTable, and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  gameSubmissions,
  games,
  submissionComments,
  submissionEvents,
  submissionVersions,
  users,
} from "@/lib/db/schema";
import { SessionUser } from "@/lib/auth/session";
import { isModerator, isOwner } from "@/lib/auth/roles";
import { SubmissionStatus, moderationTransitions, slugSchema } from "@/lib/auth/validation";
import { slugify } from "@/lib/slug";

/**
 * Modrinth-style submission pipeline: authors upload a build, moderators play
 * it and talk to them, and the platform owner publishes it into `games`.
 * All the rules live here so the API routes stay thin and consistent.
 */

export interface SubmissionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  version: string;
  playUrl: string;
  status: SubmissionStatus;
  authorId: string;
  authorUsername: string;
  reviewerId: string | null;
  reviewerUsername: string | null;
  commentCount: number;
  submittedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface SubmissionComment {
  id: string;
  body: string;
  kind: "comment" | "review" | "author_reply";
  createdAt: string;
  authorId: string;
  authorUsername: string;
  authorRole: string;
}

export interface SubmissionEvent {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
  actorUsername: string;
}

export interface SubmissionVersion {
  id: string;
  version: string;
  changelog: string | null;
  playUrl: string;
  createdAt: string;
  authorUsername: string;
}

export interface SubmissionDetail extends SubmissionSummary {
  body: string | null;
  repositoryUrl: string | null;
  license: string;
  publishedGameId: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  comments: SubmissionComment[];
  events: SubmissionEvent[];
  versions: SubmissionVersion[];
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canReview: boolean;
    canPublish: boolean;
    allowedTransitions: SubmissionStatus[];
  };
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fields?: Record<string, string> };

const reviewers = () => aliasedTable(users, "reviewer");

/** Comment totals per submission, aggregated once and left-joined in. */
const commentCounts = () =>
  getDb()!
    .select({
      submissionId: submissionComments.submissionId,
      total: sql<number>`count(*)::int`.as("total"),
    })
    .from(submissionComments)
    .groupBy(submissionComments.submissionId)
    .as("comment_counts");

const summaryColumns = (reviewer: ReturnType<typeof reviewers>, counts: ReturnType<typeof commentCounts>) => ({
  id: gameSubmissions.id,
  slug: gameSubmissions.slug,
  title: gameSubmissions.title,
  summary: gameSubmissions.summary,
  category: gameSubmissions.category,
  version: gameSubmissions.version,
  playUrl: gameSubmissions.playUrl,
  status: gameSubmissions.status,
  authorId: gameSubmissions.authorId,
  authorUsername: users.username,
  reviewerId: gameSubmissions.reviewerId,
  reviewerUsername: reviewer.username,
  commentCount: sql<number>`coalesce(${counts.total}, 0)`,
  submittedAt: gameSubmissions.submittedAt,
  updatedAt: gameSubmissions.updatedAt,
  createdAt: gameSubmissions.createdAt,
});

type SummaryRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  version: string;
  playUrl: string;
  status: string;
  authorId: string;
  authorUsername: string;
  reviewerId: string | null;
  reviewerUsername: string | null;
  commentCount: number;
  submittedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

function toSummary(row: SummaryRow): SubmissionSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    version: row.version,
    playUrl: row.playUrl,
    status: row.status as SubmissionStatus,
    authorId: row.authorId,
    authorUsername: row.authorUsername,
    reviewerId: row.reviewerId ?? null,
    reviewerUsername: row.reviewerUsername ?? null,
    commentCount: Number(row.commentCount ?? 0),
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
    updatedAt: new Date(row.updatedAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

async function uniqueSlug(
  table: typeof gameSubmissions | typeof games,
  column: typeof gameSubmissions.slug | typeof games.slug,
  base: string
) {
  const db = getDb()!;
  const cleaned = slugify(base);
  const root = slugSchema.safeParse(cleaned).success ? cleaned : `game-${Date.now().toString(36)}`;
  let candidate = root;
  for (let i = 2; i < 50; i++) {
    const [taken] = await db.select({ id: table.id }).from(table).where(eq(column, candidate)).limit(1);
    if (!taken) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

const uniqueSubmissionSlug = (base: string) =>
  uniqueSlug(gameSubmissions, gameSubmissions.slug, base) as Promise<string>;
const uniqueGameSlug = (base: string) => uniqueSlug(games, games.slug, base) as Promise<string>;

/** `mine` = the caller's submissions, `queue` = everything waiting for review. */
export async function listSubmissions(
  viewer: SessionUser,
  scope: "mine" | "queue" | "all"
): Promise<SubmissionSummary[]> {
  const db = getDb()!;
  const reviewer = reviewers();
  const counts = commentCounts();

  // Defence in depth: the routes check this too, but the service is the real
  // boundary — a plain user must never see the queue.
  if (scope !== "mine" && !isModerator(viewer.role)) return [];

  const filter =
    scope === "mine"
      ? eq(gameSubmissions.authorId, viewer.id)
      : scope === "queue"
        ? inArray(gameSubmissions.status, ["pending", "in_review", "changes_requested", "approved", "rejected"])
        : undefined;

  const rows = await db
    .select(summaryColumns(reviewer, counts))
    .from(gameSubmissions)
    .innerJoin(users, eq(users.id, gameSubmissions.authorId))
    .leftJoin(reviewer, eq(reviewer.id, gameSubmissions.reviewerId))
    .leftJoin(counts, eq(counts.submissionId, gameSubmissions.id))
    .where(filter)
    .orderBy(desc(gameSubmissions.updatedAt));

  return rows.map((row) => toSummary(row as SummaryRow));
}

export async function getSubmission(
  id: string,
  viewer: SessionUser
): Promise<ServiceResult<SubmissionDetail>> {
  const db = getDb()!;
  const reviewer = reviewers();
  const counts = commentCounts();

  const rows = await db
    .select({
      ...summaryColumns(reviewer, counts),
      body: gameSubmissions.body,
      repositoryUrl: gameSubmissions.repositoryUrl,
      license: gameSubmissions.license,
      reviewedAt: gameSubmissions.reviewedAt,
      publishedAt: gameSubmissions.publishedAt,
      publishedGameId: gameSubmissions.publishedGameId,
    })
    .from(gameSubmissions)
    .innerJoin(users, eq(users.id, gameSubmissions.authorId))
    .leftJoin(reviewer, eq(reviewer.id, gameSubmissions.reviewerId))
    .leftJoin(counts, eq(counts.submissionId, gameSubmissions.id))
    .where(eq(gameSubmissions.id, id))
    .limit(1);

  const row = rows[0] as
    | (SummaryRow & {
        body: string | null;
        repositoryUrl: string | null;
        license: string;
        reviewedAt: Date | null;
        publishedAt: Date | null;
        publishedGameId: string | null;
      })
    | undefined;

  if (!row) return { ok: false, status: 404, error: "Submission not found." };
  // Unpublished submissions are private: author + moderation team only.
  if (row.status !== "published" && row.authorId !== viewer.id && !isModerator(viewer.role)) {
    return { ok: false, status: 403, error: "You cannot see this submission." };
  }

  const [comments, events, versions] = await Promise.all([
    db
      .select({
        id: submissionComments.id,
        body: submissionComments.body,
        kind: submissionComments.kind,
        createdAt: submissionComments.createdAt,
        authorId: submissionComments.authorId,
        authorUsername: users.username,
        authorRole: users.role,
      })
      .from(submissionComments)
      .innerJoin(users, eq(users.id, submissionComments.authorId))
      .where(eq(submissionComments.submissionId, id))
      .orderBy(asc(submissionComments.createdAt)),
    db
      .select({
        id: submissionEvents.id,
        action: submissionEvents.action,
        fromStatus: submissionEvents.fromStatus,
        toStatus: submissionEvents.toStatus,
        note: submissionEvents.note,
        createdAt: submissionEvents.createdAt,
        actorUsername: users.username,
      })
      .from(submissionEvents)
      .innerJoin(users, eq(users.id, submissionEvents.actorId))
      .where(eq(submissionEvents.submissionId, id))
      .orderBy(desc(submissionEvents.createdAt)),
    db
      .select({
        id: submissionVersions.id,
        version: submissionVersions.version,
        changelog: submissionVersions.changelog,
        playUrl: submissionVersions.playUrl,
        createdAt: submissionVersions.createdAt,
        authorUsername: users.username,
      })
      .from(submissionVersions)
      .innerJoin(users, eq(users.id, submissionVersions.createdBy))
      .where(eq(submissionVersions.submissionId, id))
      .orderBy(desc(submissionVersions.createdAt)),
  ]);

  const isAuthor = row.authorId === viewer.id;
  const status = row.status as SubmissionStatus;

  return {
    ok: true,
    data: {
      ...toSummary(row),
      body: row.body,
      repositoryUrl: row.repositoryUrl,
      license: row.license,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      publishedGameId: row.publishedGameId,
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        kind: c.kind as SubmissionComment["kind"],
        createdAt: new Date(c.createdAt).toISOString(),
        authorId: c.authorId,
        authorUsername: c.authorUsername,
        authorRole: c.authorRole,
      })),
      events: events.map((e) => ({ ...e, createdAt: new Date(e.createdAt).toISOString() })),
      versions: versions.map((v) => ({ ...v, createdAt: new Date(v.createdAt).toISOString() })),
      permissions: {
        canEdit: isAuthor,
        canComment: isAuthor || isModerator(viewer.role),
        canReview: isModerator(viewer.role),
        canPublish: isOwner(viewer.role),
        allowedTransitions: isModerator(viewer.role) ? moderationTransitions[status] ?? [] : [],
      },
    },
  };
}

export interface SubmissionInput {
  title: string;
  summary: string;
  body?: string;
  category: string;
  playUrl: string;
  repositoryUrl?: string;
  license: string;
  version: string;
}

export async function createSubmission(
  author: SessionUser,
  input: SubmissionInput & { slug?: string; submit: boolean }
): Promise<ServiceResult<SubmissionSummary>> {
  const db = getDb()!;
  if (!input.playUrl?.trim()) {
    return { ok: false, status: 422, error: "A playable build URL is required.", fields: { playUrl: "Required." } };
  }
  const slug = await uniqueSubmissionSlug(input.slug || input.title);
  const now = new Date();
  const status: SubmissionStatus = input.submit ? "pending" : "draft";

  const [created] = await db
    .insert(gameSubmissions)
    .values({
      slug,
      title: input.title,
      summary: input.summary,
      body: input.body ?? null,
      category: input.category,
      playUrl: input.playUrl,
      repositoryUrl: input.repositoryUrl || null,
      license: input.license,
      version: input.version,
      status,
      authorId: author.id,
      submittedAt: input.submit ? now : null,
      updatedAt: now,
    })
    .returning({ id: gameSubmissions.id });

  if (!created) return { ok: false, status: 500, error: "Could not create the submission." };

  await db.insert(submissionVersions).values({
    submissionId: created.id,
    version: input.version,
    playUrl: input.playUrl,
    changelog: "Initial version.",
    createdBy: author.id,
  });

  await db.insert(submissionEvents).values({
    submissionId: created.id,
    actorId: author.id,
    action: input.submit ? "submitted" : "created",
    toStatus: status,
    note: null,
  });

  const detail = await getSubmission(created.id, author);
  if (!detail.ok) return { ok: false, status: detail.status, error: detail.error };
  return { ok: true, data: detail.data };
}

const AUTHOR_EDITABLE_STATUSES: SubmissionStatus[] = ["draft", "changes_requested", "rejected"];

export async function updateSubmission(
  author: SessionUser,
  id: string,
  input: Partial<SubmissionInput> & { changelog?: string; submit?: boolean }
): Promise<ServiceResult<SubmissionDetail>> {
  const db = getDb()!;
  const [existing] = await db.select().from(gameSubmissions).where(eq(gameSubmissions.id, id)).limit(1);
  if (!existing) return { ok: false, status: 404, error: "Submission not found." };
  if (existing.authorId !== author.id) {
    return { ok: false, status: 403, error: "Only the author can edit this submission." };
  }

  const current = existing.status as SubmissionStatus;
  const wantsResubmit = input.submit === true;

  if (!AUTHOR_EDITABLE_STATUSES.includes(current) && !(wantsResubmit && current !== "published")) {
    return {
      ok: false,
      status: 409,
      error: "This submission is being reviewed. Post a comment instead of editing it.",
    };
  }

  const now = new Date();
  const nextStatus: SubmissionStatus = wantsResubmit ? "pending" : current;
  const versionChanged = Boolean(input.version && input.version !== existing.version);
  const buildChanged = Boolean(input.playUrl && input.playUrl !== existing.playUrl);

  await db
    .update(gameSubmissions)
    .set({
      ...(input.title ? { title: input.title } : {}),
      ...(input.summary ? { summary: input.summary } : {}),
      ...(input.body !== undefined ? { body: input.body || null } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.playUrl ? { playUrl: input.playUrl } : {}),
      ...(input.repositoryUrl !== undefined ? { repositoryUrl: input.repositoryUrl || null } : {}),
      ...(input.license ? { license: input.license } : {}),
      ...(input.version ? { version: input.version } : {}),
      status: nextStatus,
      updatedAt: now,
      ...(wantsResubmit ? { submittedAt: now, reviewerId: null } : {}),
    })
    .where(eq(gameSubmissions.id, id));

  if (wantsResubmit || versionChanged || buildChanged) {
    await db.insert(submissionVersions).values({
      submissionId: id,
      version: input.version ?? existing.version,
      playUrl: input.playUrl ?? existing.playUrl,
      changelog: input.changelog || (wantsResubmit ? "Resubmitted for review." : "Updated build."),
      createdBy: author.id,
    });
  }

  await db.insert(submissionEvents).values({
    submissionId: id,
    actorId: author.id,
    action: wantsResubmit ? "submitted" : "updated",
    fromStatus: current,
    toStatus: nextStatus,
    note: input.changelog || null,
  });

  return getSubmission(id, author);
}

export async function addComment(
  viewer: SessionUser,
  id: string,
  body: string,
  kind: "comment" | "review" | "author_reply"
): Promise<ServiceResult<{ id: string; createdAt: string }>> {
  const db = getDb()!;
  const [existing] = await db.select().from(gameSubmissions).where(eq(gameSubmissions.id, id)).limit(1);
  if (!existing) return { ok: false, status: 404, error: "Submission not found." };

  const isAuthor = existing.authorId === viewer.id;
  if (!isAuthor && !isModerator(viewer.role)) {
    return { ok: false, status: 403, error: "You cannot comment on this submission." };
  }

  const [created] = await db
    .insert(submissionComments)
    .values({ submissionId: id, authorId: viewer.id, body, kind })
    .returning({ id: submissionComments.id, createdAt: submissionComments.createdAt });

  await db.update(gameSubmissions).set({ updatedAt: new Date() }).where(eq(gameSubmissions.id, id));

  if (!created) return { ok: false, status: 500, error: "Could not save the comment." };
  return { ok: true, data: { id: created.id, createdAt: new Date(created.createdAt).toISOString() } };
}

export async function changeStatus(
  moderator: SessionUser,
  id: string,
  to: SubmissionStatus,
  note?: string
): Promise<ServiceResult<{ status: SubmissionStatus }>> {
  const db = getDb()!;
  const [existing] = await db.select().from(gameSubmissions).where(eq(gameSubmissions.id, id)).limit(1);
  if (!existing) return { ok: false, status: 404, error: "Submission not found." };
  if (!isModerator(moderator.role)) {
    return { ok: false, status: 403, error: "Moderator access only." };
  }

  const from = existing.status as SubmissionStatus;
  if (from === to) return { ok: false, status: 400, error: "The submission is already in that state." };
  const allowed = moderationTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      status: 409,
      error: `A submission in "${from}" cannot move to "${to}". Allowed: ${allowed.join(", ") || "none"}.`,
    };
  }
  // Publishing is the owner's call and goes through publishSubmission().
  if (to === "published") {
    return { ok: false, status: 403, error: "Use the publish endpoint to add it to the platform." };
  }

  await db
    .update(gameSubmissions)
    .set({
      status: to,
      updatedAt: new Date(),
      reviewerId: existing.reviewerId ?? moderator.id,
      reviewedAt: ["approved", "rejected", "changes_requested"].includes(to) ? new Date() : existing.reviewedAt,
    })
    .where(eq(gameSubmissions.id, id));

  await db.insert(submissionEvents).values({
    submissionId: id,
    actorId: moderator.id,
    action: "status_change",
    fromStatus: from,
    toStatus: to,
    note: note || null,
  });

  return { ok: true, data: { status: to } };
}

export async function publishSubmission(
  owner: SessionUser,
  id: string,
  options: { tagline?: string; difficulty?: "Easy" | "Medium" | "Hard"; players?: string; enabled?: boolean }
): Promise<ServiceResult<{ gameId: string; slug: string }>> {
  const db = getDb()!;
  if (!isOwner(owner.role)) return { ok: false, status: 403, error: "Platform owner access only." };

  const [existing] = await db.select().from(gameSubmissions).where(eq(gameSubmissions.id, id)).limit(1);
  if (!existing) return { ok: false, status: 404, error: "Submission not found." };
  if (existing.status !== "approved") {
    return { ok: false, status: 409, error: "Only approved submissions can be published." };
  }

  const slug = await uniqueGameSlug(existing.slug);
  const now = new Date();

  const [game] = await db
    .insert(games)
    .values({
      slug,
      name: existing.title,
      description: existing.summary,
      tagline: options.tagline ?? existing.summary.slice(0, 120),
      category: existing.category,
      difficulty: options.difficulty ?? "Medium",
      players: options.players ?? "1 Player",
      enabled: options.enabled ?? true,
      source: "submission",
      playUrl: existing.playUrl,
      createdBy: existing.authorId,
    })
    .returning({ id: games.id, slug: games.slug });

  if (!game) return { ok: false, status: 500, error: "Could not create the game entry." };

  await db
    .update(gameSubmissions)
    .set({ status: "published", publishedAt: now, publishedGameId: game.id, updatedAt: now })
    .where(eq(gameSubmissions.id, id));

  await db.insert(submissionEvents).values({
    submissionId: id,
    actorId: owner.id,
    action: "published",
    fromStatus: "approved",
    toStatus: "published",
    note: `Added to the platform as "${game.slug}".`,
  });

  return { ok: true, data: { gameId: game.id, slug: game.slug } };
}

/** Assigns (or clears) the moderator responsible for a submission. */
export async function assignReviewer(
  moderator: SessionUser,
  id: string,
  reviewerId: string | null
): Promise<ServiceResult<{ reviewerId: string | null }>> {
  const db = getDb()!;
  if (!isModerator(moderator.role)) return { ok: false, status: 403, error: "Moderator access only." };
  if (reviewerId) {
    const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, reviewerId)).limit(1);
    if (!target) return { ok: false, status: 404, error: "User not found." };
    if (!isModerator(target.role)) return { ok: false, status: 400, error: "That user is not a moderator." };
  }
  await db.update(gameSubmissions).set({ reviewerId, updatedAt: new Date() }).where(eq(gameSubmissions.id, id));
  return { ok: true, data: { reviewerId } };
}
