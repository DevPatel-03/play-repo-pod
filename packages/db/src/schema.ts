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
export const uploadDocuments = pgTable(
	"upload_documents",
	{
		documentId: uuid("upload_document_id").primaryKey().defaultRandom(),
		documentName: varchar("document_name").notNull(),
		fileUrl: varchar("file_url").notNull(),
		fileSizeInBytes: integer("file_size_in_bytes").notNull(),
		extractionStatus: DocumentExtactionStatusDbEnum("extraction_status")
			.default("IDEAL")
			.notNull(),
		extractionId: varchar("extraction_id").unique(),
		...baseDeleteColumns,
		...baseTableColumns,
	},
	(table) => [
		index("upload_documents_extraction_status_idx").on(table.extractionStatus),
	],
);

export const uploadDocumentRelations = relations(
	uploadDocuments,
	({ many }) => ({
		extractedPageData: many(extractedPageData),
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
		collectedFrom: varchar("collected_from", { length: 255 }),
		deliveredTo: varchar("delivered_to", { length: 255 }),
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
