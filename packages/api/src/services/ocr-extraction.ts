/**
 * OCR Extraction Service using Google Gemini 2.0 Flash
 * 
 * This service handles PDF document processing and OCR extraction for proof of delivery (POD) receipts.
 * 
 * Research Notes & Best Practices:
 * 
 * 1. GOOGLE GENERATIVE AI PACKAGE OPTIONS:
 *    - @google/generative-ai: Official Google AI SDK (recommended)
 *    - @ai-sdk/google: Vercel AI SDK wrapper (already in project)
 *    
 * 2. GEMINI 2.0 FLASH MODEL:
 *    - Model ID: "gemini-2.0-flash-exp" or "gemini-2.0-flash"
 *    - Excellent for OCR and document understanding
 *    - Supports multimodal inputs (text + images)
 *    - Fast processing with good accuracy for handwritten text
 *    
 * 3. FILE HANDLING APPROACH:
 *    - Option A: Convert PDF to images (png/jpeg) then to base64
 *    - Option B: Direct PDF upload via File API (if supported)
 *    - Recommendation: Convert to images for better control
 *    - Libraries: pdf-parse, pdfjs-dist, or pdf-lib for PDF processing
 *    
 * 4. PROMPT ENGINEERING FOR HANDWRITTEN OCR:
 *    - Be explicit about handwritten text recognition
 *    - Request structured JSON output
 *    - Specify field names and expected data types
 *    - Ask model to flag uncertain fields
 *    
 * 5. TOKEN USAGE TRACKING:
 *    - Gemini API returns usage metadata in response
 *    - Track: inputTokens, outputTokens, totalTokens
 *    - Also available: cachedContentTokenCount for context caching
 *    
 * 6. ERROR HANDLING:
 *    - Handle API rate limits
 *    - Retry logic for transient failures
 *    - Fallback for unclear text regions
 *    
 * 7. MULTI-PAGE PDF HANDLING:
 *    - Process each page separately
 *    - Store results per page in extracted_page_data table
 *    - Track page numbers for reference
 */

import type { DB } from "@my-better-t-app/db";
import {
	documentTokenUsage,
	extractedPageData,
	uploadDocuments,
} from "@my-better-t-app/db/schema";
import { eq } from "drizzle-orm";

/**
 * TODO: Implement OCR extraction logic
 * 
 * Steps to implement:
 * 1. Install @google/generative-ai package
 * 2. Configure Gemini 2.0 Flash model with API key
 * 3. Implement PDF to image conversion
 * 4. Create extraction prompt for POD receipt data
 * 5. Process each page and extract structured data
 * 6. Save extracted data to database
 * 7. Track token usage for billing/monitoring
 * 
 * Example Prompt Structure:
 * ```
 * You are an expert at reading handwritten delivery receipts.
 * Analyze this proof of delivery (POD) receipt image and extract the following information:
 * 
 * - Container Numbers (array of strings)
 * - Container Sizes (array of strings, e.g., "20ft", "40ft")
 * - Full/Empty Status (array of "FULL" or "EMPTY")
 * - Date (format: YYYY-MM-DD)
 * - Instruction Number
 * - Vehicle Number
 * - Collected From (location)
 * - Delivered To (location)
 * 
 * For any fields you're uncertain about, add them to an "unsureFields" array.
 * Return the data as a JSON object.
 * ```
 */

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
 * Process a PDF document and extract POD data using Gemini 2.0 Flash
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
	// TODO: Implement extraction logic
	// 1. Update document status to PROCESSING
	// 2. Convert PDF to images
	// 3. For each page:
	//    a. Convert to base64
	//    b. Call Gemini API with extraction prompt
	//    c. Parse response
	//    d. Save to extracted_page_data table
	// 4. Track token usage in document_token_usage table
	// 5. Update document status to COMPLETED or FAILED
	
	console.log(
		`TODO: Implement OCR extraction for document ${documentId}`,
		`Buffer size: ${pdfBuffer.length} bytes`,
	);
	
	// Placeholder return
	return [];
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
	status: "IDEAL" | "PROCESSING" | "COMPLETED" | "FAILED",
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
