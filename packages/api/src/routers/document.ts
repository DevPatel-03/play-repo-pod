import { db } from "@my-better-t-app/db";
import {
	extractedPageData,
	uploadDocuments,
} from "@my-better-t-app/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";
import { publicProcedure, router } from "../index";
import { extractPODDataFromPDF } from "../services/ocr-extraction";

/**
 * Document Router
 * 
 * Handles document upload, OCR extraction, and data retrieval
 * 
 * TODO: Add actual file upload handling
 * - Use multer or similar for multipart/form-data
 * - Or implement base64 file upload via tRPC
 * - Process PDF in memory without storing to disk
 */

export const documentRouter = router({
	/**
	 * Upload a document for OCR processing
	 * 
	 * TODO: Implement actual file upload
	 * For now, this accepts metadata and triggers placeholder extraction
	 */
	upload: publicProcedure
		.input(
			z.object({
				userId: z.string().uuid(),
				instructionNumber: z.string().min(1),
				documentName: z.string().min(1),
				fileUrl: z.string().url(),
				fileSizeInBytes: z.number().int().positive(),
				companyId: z.string().uuid().optional(),
				branchId: z.string().uuid().optional(),
				// TODO: Add file data (base64 or buffer)
				// fileData: z.string() or similar
			}),
		)
		.mutation(async ({ input }) => {
			// Create document record
			const [document] = await db
				.insert(uploadDocuments)
				.values({
					userId: input.userId,
					instructionNumber: input.instructionNumber,
					documentName: input.documentName,
					fileUrl: input.fileUrl,
					fileSizeInBytes: input.fileSizeInBytes,
					companyId: input.companyId,
					branchId: input.branchId,
					extractionStatus: "IDEAL",
				})
				.returning();

			// TODO: Trigger OCR extraction
			// In production, this should be done asynchronously (queue/worker)
			// For now, just log the intent
			console.log(
				`TODO: Trigger OCR extraction for document ${document.documentId}`,
			);

			// Placeholder: Call extraction service
			// const pdfBuffer = Buffer.from(input.fileData, 'base64');
			// await extractPODDataFromPDF(document.documentId, pdfBuffer, db);

			return {
				documentId: document.documentId,
				extractionStatus: document.extractionStatus,
			};
		}),

	/**
	 * Get document status and metadata
	 */
	getDocument: publicProcedure
		.input(z.object({ documentId: z.string().uuid() }))
		.query(async ({ input }) => {
			const document = await db.query.uploadDocuments.findFirst({
				where: eq(uploadDocuments.documentId, input.documentId),
			});

			if (!document) {
				throw new Error("Document not found");
			}

			return document;
		}),

	/**
	 * Get all documents for a user
	 */
	getDocumentsByUser: publicProcedure
		.input(z.object({ userId: z.string().uuid() }))
		.query(async ({ input }) => {
			const documents = await db.query.uploadDocuments.findMany({
				where: eq(uploadDocuments.userId, input.userId),
				orderBy: (docs, { desc }) => [desc(docs.createdAt)],
			});

			return documents;
		}),

	/**
	 * Get extracted data for a document
	 */
	getExtractedData: publicProcedure
		.input(z.object({ documentId: z.string().uuid() }))
		.query(async ({ input }) => {
			const pages = await db.query.extractedPageData.findMany({
				where: eq(extractedPageData.documentId, input.documentId),
				orderBy: (data, { asc }) => [asc(data.pageNumber)],
			});

			return pages;
		}),

	/**
	 * Get extraction status
	 */
	getExtractionStatus: publicProcedure
		.input(z.object({ documentId: z.string().uuid() }))
		.query(async ({ input }) => {
			const document = await db.query.uploadDocuments.findFirst({
				where: eq(uploadDocuments.documentId, input.documentId),
				columns: {
					documentId: true,
					extractionStatus: true,
					extractionId: true,
				},
			});

			if (!document) {
				throw new Error("Document not found");
			}

			return {
				documentId: document.documentId,
				status: document.extractionStatus,
				extractionId: document.extractionId,
			};
		}),

	/**
	 * List all documents with their extraction status
	 */
	listDocuments: publicProcedure
		.input(
			z
				.object({
					limit: z.number().int().positive().max(100).default(20),
					offset: z.number().int().nonnegative().default(0),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const { limit = 20, offset = 0 } = input || {};

			const documents = await db.query.uploadDocuments.findMany({
				limit,
				offset,
				orderBy: (docs, { desc }) => [desc(docs.createdAt)],
			});

			return documents;
		}),
});
