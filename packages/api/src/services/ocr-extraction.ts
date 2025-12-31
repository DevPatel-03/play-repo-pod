/**
 * OCR Extraction Service using Google Gemini 2.0 Flash Preview
 * 
 * This service handles PDF document processing and OCR extraction for proof of delivery (POD) receipts.
 * Uses Vercel AI SDK (@ai-sdk/google) for streamlined integration with Gemini models.
 */

import type { DB } from "@my-better-t-app/db";
import {
	documentTokenUsage,
	extractedPageData,
	uploadDocuments,
	type DocumentExtactionStatusEnumType,
} from "@my-better-t-app/db/schema";
import { eq } from "drizzle-orm";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import pdf from "pdf-parse";

/**
 * Schema for extracted POD data validation
 */
const ExtractedPODSchema = z.object({
	containerNumbers: z.array(z.string().nullable()),
	containerSizes: z.array(z.string().nullable()),
	fullEmptyStatuses: z.array(z.enum(["FULL", "EMPTY"]).nullable()),
	pageDate: z.string().optional(),
	instructionNumber: z.string().optional(),
	vehicleNumber: z.string().optional(),
	collectedFrom: z.string().optional(),
	deliveredTo: z.string().optional(),
	unsureFields: z.array(z.string()).default([]),
});

export interface ExtractedPODData {
	pageNumber: number;
	containerNumbers: (string | null)[];
	containerSizes: (string | null)[];
	fullEmptyStatuses: (string | null)[];
	pageDate?: string;
	instructionNumber?: string;
	vehicleNumber?: string;
	collectedFrom?: string;
	deliveredTo?: string;
	unsureFields: string[];
}

export interface TokenUsageData {
	requestId: string;
	inputTokens: number;
	toolUsePromptTokens?: number;
	cachedContentTokens?: number;
	candidatesTokens?: number;
	thoughtsTokens?: number;
	outputTokens: number;
	totalTokens: number;
	durationMs: number;
}

/**
 * Process a PDF document and extract POD data using Gemini 2.0 Flash Preview
 * 
 * @param documentId - The ID of the document to process
 * @param pdfBuffer - The PDF file buffer (not stored, only processed in memory)
 * @param db - Database connection
 * @returns Array of extracted page data
 */
export async function extractPODDataFromPDF(
	documentId: string,
	pdfBuffer: Buffer,
	db: DB,
): Promise<ExtractedPODData[]> {
	const startTime = Date.now();
	const extractionId = crypto.randomUUID();

	try {
		// Update document status to PROCESSING
		await updateDocumentStatus(documentId, "PROCESSING", extractionId, db);

		// Parse PDF to get text and metadata
		const pdfData = await pdf(pdfBuffer);
		const numPages = pdfData.numpages;

		console.log(`Processing ${numPages} pages for document ${documentId}`);

		const extractedPages: ExtractedPODData[] = [];

		// Process each page separately for better granularity
		for (let pageNum = 1; pageNum <= numPages; pageNum++) {
			try {
				const pageData = await extractPageData(
					pdfBuffer,
					pageNum,
					documentId,
					db,
					startTime,
				);
				extractedPages.push(pageData);
			} catch (pageError) {
				console.error(`Error processing page ${pageNum}:`, pageError);
				// Continue with other pages even if one fails
				extractedPages.push({
					pageNumber: pageNum,
					containerNumbers: [],
					containerSizes: [],
					fullEmptyStatuses: [],
					unsureFields: ["*all*"],
				});
			}
		}

		// Update status to COMPLETED
		await updateDocumentStatus(documentId, "COMPLETED", extractionId, db);

		return extractedPages;
	} catch (error) {
		console.error("OCR extraction failed:", error);
		await updateDocumentStatus(documentId, "FAILED", extractionId, db);
		throw error;
	}
}

/**
 * Extract data from a single PDF page using Gemini 2.0 Flash Preview
 */
async function extractPageData(
	pdfBuffer: Buffer,
	pageNumber: number,
	documentId: string,
	db: DB,
	startTime: number,
): Promise<ExtractedPODData> {
	const requestId = crypto.randomUUID();

	// Convert PDF to base64 for API
	const base64Data = pdfBuffer.toString("base64");

	// Use Gemini 2.0 Flash Preview for optimal OCR performance
	const model = google("gemini-2.0-flash-exp");

	// Comprehensive prompt for handwritten POD receipt extraction
	const prompt = `You are an expert at reading handwritten proof of delivery (POD) receipts from logistics and shipping companies.

Analyze this proof of delivery receipt document (page ${pageNumber}) and extract the following information with high accuracy:

**CONTAINER INFORMATION (Arrays - all must have same length):**
- Container Numbers: Full container IDs (e.g., "ABCD1234567", "EFGH8901234")
- Container Sizes: Standard sizes (e.g., "20ft", "40ft", "20'", "40'", "20GP", "40HC")
- Full/Empty Status: Must be either "FULL" or "EMPTY" for each container

**DOCUMENT METADATA:**
- Date: Delivery or document date in YYYY-MM-DD format
- Instruction Number: Reference/tracking/instruction number
- Vehicle Number: Truck/vehicle registration or identification

**LOCATION INFORMATION:**
- Collected From: Pickup location/depot/warehouse
- Delivered To: Delivery destination/location

**SPECIAL INSTRUCTIONS:**
1. If text is UNCLEAR, SMUDGED, or you're UNCERTAIN about any field, add that field name to "unsureFields"
2. If a value cannot be read at all, use null in the array
3. Maintain array consistency - if you have 3 containers, you must have 3 sizes and 3 statuses
4. Look for common handwritten variations: "FUL" = "FULL", "EMT"/"MT" = "EMPTY"
5. Container numbers are typically alphanumeric (format may vary by region/company)
6. Pay special attention to similar-looking characters: 0/O, 1/I, 5/S, 8/B

Return structured data as JSON only.`;

	try {
		// Use generateObject for structured output with Gemini 2.0 Flash Preview
		const result = await generateObject({
			model,
			schema: ExtractedPODSchema,
			prompt,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: prompt,
						},
						{
							type: "file",
							data: base64Data,
							mimeType: "application/pdf",
						},
					],
				},
			],
		});

		const extractedData = result.object;

		// Prepare page data
		const pageData: ExtractedPODData = {
			pageNumber,
			containerNumbers: extractedData.containerNumbers,
			containerSizes: extractedData.containerSizes,
			fullEmptyStatuses: extractedData.fullEmptyStatuses,
			pageDate: extractedData.pageDate,
			instructionNumber: extractedData.instructionNumber,
			vehicleNumber: extractedData.vehicleNumber,
			collectedFrom: extractedData.collectedFrom,
			deliveredTo: extractedData.deliveredTo,
			unsureFields: extractedData.unsureFields,
		};

		// Save extracted data to database
		await saveExtractedPageData(documentId, pageData, db);

		// Track token usage
		if (result.usage) {
			await saveTokenUsage(
				documentId,
				{
					requestId,
					inputTokens: result.usage.promptTokens || 0,
					candidatesTokens: result.usage.completionTokens || 0,
					outputTokens: result.usage.completionTokens || 0,
					totalTokens: result.usage.totalTokens || 0,
					durationMs: Date.now() - startTime,
				},
				db,
			);
		}

		return pageData;
	} catch (error) {
		console.error(`Error extracting page ${pageNumber}:`, error);
		throw error;
	}
}

/**
 * Save extracted page data to the database
 */
export async function saveExtractedPageData(
	documentId: string,
	pageData: ExtractedPODData,
	db: DB,
): Promise<void> {
	await db.insert(extractedPageData).values({
		documentId,
		pageNumber: pageData.pageNumber,
		containerNumbers: pageData.containerNumbers,
		containerSizes: pageData.containerSizes,
		fullEmptyStatuses: pageData.fullEmptyStatuses,
		pageDate: pageData.pageDate,
		instructionNumber: pageData.instructionNumber,
		vehicleNumber: pageData.vehicleNumber,
		collectedFrom: pageData.collectedFrom,
		deliveredTo: pageData.deliveredTo,
		unsureFields: pageData.unsureFields,
	});
}

/**
 * Save token usage data to the database
 */
export async function saveTokenUsage(
	documentId: string,
	usage: TokenUsageData,
	db: DB,
): Promise<void> {
	await db.insert(documentTokenUsage).values({
		documentId,
		requestId: usage.requestId,
		inputTokens: usage.inputTokens,
		toolUsePromptTokens: usage.toolUsePromptTokens || 0,
		cachedContentTokens: usage.cachedContentTokens || 0,
		candidatesTokens: usage.candidatesTokens || 0,
		thoughtsTokens: usage.thoughtsTokens || 0,
		outputTokens: usage.outputTokens,
		totalTokens: usage.totalTokens,
		durationMs: usage.durationMs,
	});
}

/**
 * Update document extraction status
 */
export async function updateDocumentStatus(
	documentId: string,
	status: DocumentExtactionStatusEnumType,
	extractionId?: string,
	db?: DB,
): Promise<void> {
	if (!db) return;
	
	await db
		.update(uploadDocuments)
		.set({
			extractionStatus: status,
			extractionId: extractionId,
		})
		.where(eq(uploadDocuments.documentId, documentId));
}
