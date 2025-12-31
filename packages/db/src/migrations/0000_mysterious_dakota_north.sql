CREATE TYPE "public"."document_status" AS ENUM('IDEAL', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "branches" (
	"branch_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"branch_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"company_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "document_token_usage" (
	"token_usage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"request_id" varchar(255) NOT NULL,
	"input_tokens" integer NOT NULL,
	"tool_use_prompt_tokens" integer DEFAULT 0 NOT NULL,
	"cached_content_tokens" integer DEFAULT 0 NOT NULL,
	"candidates_tokens" integer DEFAULT 0 NOT NULL,
	"thoughts_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_page_data" (
	"extracted_page_data_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"page_number" smallint NOT NULL,
	"container_numbers" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"container_sizes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"full_empty_statuses" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"page_date" varchar(255),
	"instruction_number" varchar(255),
	"vehicle_number" varchar(255),
	"collected_from" varchar(255),
	"delivered_to" varchar(255),
	"unsure_fields" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_documents" (
	"upload_document_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instruction_number" varchar(255) NOT NULL,
	"document_name" varchar NOT NULL,
	"file_url" varchar NOT NULL,
	"file_size_in_bytes" integer NOT NULL,
	"company_id" uuid,
	"branch_id" uuid,
	"extraction_status" "document_status" DEFAULT 'IDEAL' NOT NULL,
	"extraction_id" varchar,
	"deleted_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "upload_documents_extraction_id_unique" UNIQUE("extraction_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_token_usage" ADD CONSTRAINT "document_token_usage_document_id_upload_documents_upload_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."upload_documents"("upload_document_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_page_data" ADD CONSTRAINT "extracted_page_data_document_id_upload_documents_upload_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."upload_documents"("upload_document_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_documents" ADD CONSTRAINT "upload_documents_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_documents" ADD CONSTRAINT "upload_documents_company_id_companies_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_documents" ADD CONSTRAINT "upload_documents_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_token_usage_document_idx" ON "document_token_usage" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_token_usage_request_idx" ON "document_token_usage" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "extracted_page_data_document_idx" ON "extracted_page_data" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "extracted_page_data_document_page_idx" ON "extracted_page_data" USING btree ("document_id","page_number");--> statement-breakpoint
CREATE INDEX "upload_documents_user_idx" ON "upload_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "upload_documents_company_idx" ON "upload_documents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "upload_documents_branch_idx" ON "upload_documents" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "upload_documents_extraction_status_idx" ON "upload_documents" USING btree ("extraction_status");