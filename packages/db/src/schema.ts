import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const todo = pgTable("todo", {
	id: serial("id").primaryKey(),
	text: text("text").notNull(),
	completed: boolean("completed").default(false).notNull(),
});

export const documentExtactionStatusEnum = [
	"IDEAL",
	"PROCESSING",
	"COMPLETED",
	"FAILED",
] as const;
export type DocumentExtactionStatusEnumType =
	(typeof documentExtactionStatusEnum)[number];
export const DocumentExtactionStatusDbEnum = pgEnum(
	"document_status",
	documentExtactionStatusEnum,
);
const createdAt = timestamp("created_at").defaultNow().notNull();
const updatedAt = timestamp("updated_at")
	.defaultNow()
	.$onUpdateFn(() => new Date())
	.notNull();
const deletedAt = timestamp("deleted_at");
const isDeleted = boolean("is_deleted").default(false);

export const baseTableColumns = {
	createdAt,
	updatedAt,
};

export const baseDeleteColumns = {
	deletedAt,
	isDeleted,
};

// Users table (simplified for single user setup)
export const users = pgTable("users", {
	userId: uuid("user_id").primaryKey().defaultRandom(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 255 }),
	...baseTableColumns,
	...baseDeleteColumns,
});

// Companies table
export const companies = pgTable("companies", {
	companyId: uuid("company_id").primaryKey().defaultRandom(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	...baseTableColumns,
	...baseDeleteColumns,
});

// Branches table
export const branches = pgTable("branches", {
	branchId: uuid("branch_id").primaryKey().defaultRandom(),
	companyId: uuid("company_id").references(() => companies.companyId, {
		onDelete: "cascade",
	}),
	branchName: varchar("branch_name", { length: 255 }).notNull(),
	...baseTableColumns,
	...baseDeleteColumns,
});

export const uploadDocuments = pgTable(
	"upload_documents",
	{
		documentId: uuid("upload_document_id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.references(() => users.userId)
			.notNull(),
		instructionNumber: varchar("instruction_number", { length: 255 }).notNull(),
		documentName: varchar("document_name").notNull(),
		fileUrl: varchar("file_url").notNull(),
		fileSizeInBytes: integer("file_size_in_bytes").notNull(),
		companyId: uuid("company_id").references(() => companies.companyId, {
			onDelete: "set null",
		}),
		branchId: uuid("branch_id").references(() => branches.branchId, {
			onDelete: "set null",
		}),
		extractionStatus: DocumentExtactionStatusDbEnum("extraction_status")
			.default("IDEAL")
			.notNull(),
		extractionId: varchar("extraction_id").unique(),
		...baseDeleteColumns,
		...baseTableColumns,
	},
	(table) => [
		index("upload_documents_user_idx").on(table.userId),
		index("upload_documents_company_idx").on(table.companyId),
		index("upload_documents_branch_idx").on(table.branchId),
		index("upload_documents_extraction_status_idx").on(table.extractionStatus),
	],
);

export const uploadDocumentRelations = relations(
	uploadDocuments,
	({ one, many }) => ({
		user: one(users, {
			fields: [uploadDocuments.userId],
			references: [users.userId],
		}),
		company: one(companies, {
			fields: [uploadDocuments.companyId],
			references: [companies.companyId],
		}),
		branch: one(branches, {
			fields: [uploadDocuments.branchId],
			references: [branches.branchId],
		}),
		extractedPageData: many(extractedPageData),
		tokenUsage: many(documentTokenUsage),
	}),
);

export const extractedPageData = pgTable(
	"extracted_page_data",
	{
		extractedPageDataId: uuid("extracted_page_data_id")
			.primaryKey()
			.defaultRandom(),
		documentId: uuid("document_id")
			.references(() => uploadDocuments.documentId, { onDelete: "cascade" })
			.notNull(),
		pageNumber: smallint("page_number").notNull(),
		containerNumbers: text("container_numbers")
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`)
			.$type<(string | null)[]>(),
		containerSizes: text("container_sizes")
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`)
			.$type<(string | null)[]>(),
		fullEmptyStatuses: text("full_empty_statuses")
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`)
			.$type<(string | null)[]>(),
		pageDate: varchar("page_date", { length: 255 }),
		instructionNumber: varchar("instruction_number", { length: 255 }),
		vehicleNumber: varchar("vehicle_number", { length: 255 }),
		collectedFrom: varchar("collected_from", { length: 255 }),
		deliveredTo: varchar("delivered_to", { length: 255 }),
		unsureFields: text("unsure_fields")
			.array()
			.default(sql`ARRAY[]::text[]`)
			.$type<string[]>(),
		...baseTableColumns,
		...baseDeleteColumns,
	},
	(table) => [
		index("extracted_page_data_document_idx").on(table.documentId),
		uniqueIndex("extracted_page_data_document_page_idx").on(
			table.documentId,
			table.pageNumber,
		),
	],
);

export const extractedPageDataRelations = relations(
	extractedPageData,
	({ one }) => ({
		document: one(uploadDocuments, {
			fields: [extractedPageData.documentId],
			references: [uploadDocuments.documentId],
		}),
	}),
);

export const documentTokenUsage = pgTable(
	"document_token_usage",
	{
		tokenUsageId: uuid("token_usage_id").primaryKey().defaultRandom(),
		documentId: uuid("document_id")
			.references(() => uploadDocuments.documentId, { onDelete: "cascade" })
			.notNull(),
		requestId: varchar("request_id", { length: 255 }).notNull(),
		// Input tokens (promptTokenCount)
		inputTokens: integer("input_tokens").notNull(),
		// Tool use prompt tokens (toolUsePromptTokenCount)
		toolUsePromptTokens: integer("tool_use_prompt_tokens").notNull().default(0),
		// Cached content tokens (cachedContentTokenCount)
		cachedContentTokens: integer("cached_content_tokens")
			.notNull()
			.default(0),
		// Output tokens (candidatesTokenCount)
		candidatesTokens: integer("candidates_tokens").notNull().default(0),
		// Thinking tokens (thoughtsTokenCount)
		thoughtsTokens: integer("thoughts_tokens").notNull().default(0),
		// Legacy output tokens column (for backwards compatibility, will be sum of candidates + thoughts)
		outputTokens: integer("output_tokens").notNull(),
		totalTokens: integer("total_tokens").notNull(),
		durationMs: integer("duration_ms").notNull(),
		...baseTableColumns,
	},
	(table) => [
		index("document_token_usage_document_idx").on(table.documentId),
		index("document_token_usage_request_idx").on(table.requestId),
	],
);

export const documentTokenUsageRelations = relations(
	documentTokenUsage,
	({ one }) => ({
		document: one(uploadDocuments, {
			fields: [documentTokenUsage.documentId],
			references: [uploadDocuments.documentId],
		}),
	}),
);
