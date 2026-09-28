CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(48) NOT NULL,
	"title" varchar(64) NOT NULL,
	"summary" varchar(160) NOT NULL,
	"body" text,
	"category" varchar(48) DEFAULT 'Arcade' NOT NULL,
	"play_url" text NOT NULL,
	"repository_url" text,
	"license" varchar(32) DEFAULT 'MIT' NOT NULL,
	"version" varchar(24) DEFAULT '1.0.0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"author_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"published_game_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"published_at" timestamp,
	CONSTRAINT "game_submissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"kind" varchar(16) DEFAULT 'comment' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(32) NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20),
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"version" varchar(24) NOT NULL,
	"changelog" text,
	"play_url" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "slug" SET DATA TYPE varchar(48);--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "tagline" varchar(120);--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "category" varchar(48) DEFAULT 'Arcade' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "difficulty" varchar(16) DEFAULT 'Medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "players" varchar(24) DEFAULT '1 Player' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "source" varchar(16) DEFAULT 'builtin' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "play_url" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "games" SET "tagline" = left("description", 120) WHERE "tagline" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(254);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(16) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "users" SET "email" = 'legacy-' || "discord_id" || '@legacy.invalid' WHERE "email" IS NULL;--> statement-breakpoint
UPDATE "users" SET "password_hash" = 'disabled' WHERE "password_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_submissions" ADD CONSTRAINT "game_submissions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_submissions" ADD CONSTRAINT "game_submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_submissions" ADD CONSTRAINT "game_submissions_published_game_id_games_id_fk" FOREIGN KEY ("published_game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_submission_id_game_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."game_submissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_submission_id_game_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."game_submissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submission_id_game_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."game_submissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_token_hash_idx" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_submissions_author_id_idx" ON "game_submissions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_submissions_status_idx" ON "game_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_submissions_submitted_at_idx" ON "game_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submission_comments_submission_id_idx" ON "submission_comments" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submission_events_submission_id_idx" ON "submission_events" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submission_versions_submission_id_idx" ON "submission_versions" USING btree ("submission_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");