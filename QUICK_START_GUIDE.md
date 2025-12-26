# Quick Start Guide - Google GenAI OCR Integration

## Overview
This guide will help you complete the implementation of the Google GenAI OCR integration for processing proof of delivery (POD) receipt PDFs.

## Current Status

✅ **Completed:**
- Database schema with all required tables (users, companies, branches, upload_documents, extracted_page_data, document_token_usage)
- tRPC API endpoints for document management
- OCR extraction service structure with TODO placeholders
- Comprehensive research documentation

📝 **TODO - Implementation Steps:**

### Step 1: Install Dependencies

Add to your package.json or install directly:

```bash
# Navigate to project root
cd /home/runner/work/play-repo-pod/play-repo-pod

# Install required packages
npm install @google/generative-ai
npm install pdf-lib
npm install multer @types/multer
npm install p-retry
npm install sharp  # Optional, for image optimization
```

Or add to `apps/server/package.json`:
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "pdf-lib": "^1.17.1",
    "multer": "^1.4.5-lts.1",
    "p-retry": "^6.2.0"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12"
  }
}
```

### Step 2: Set Up Environment Variables

Add to your `.env` file:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@host:port/database
```

Get your API key from: https://makersuite.google.com/app/apikey

### Step 3: Update Database Schema

Run database migrations:
```bash
npm run db:generate
npm run db:push
```

### Step 4: Implement OCR Extraction Logic

Complete the `extractPODDataFromPDF` function in `packages/api/src/services/ocr-extraction.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFDocument } from "pdf-lib";
import { randomUUID } from "crypto";

export async function extractPODDataFromPDF(
  documentId: string,
  pdfBuffer: Buffer,
  db: DB,
): Promise<ExtractedPODData[]> {
  // 1. Update document status to PROCESSING
  await updateDocumentStatus(documentId, "PROCESSING", undefined, db);
  
  const startTime = Date.now();
  
  try {
    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 3. Convert PDF to base64 (or process pages individually)
    const base64Data = pdfBuffer.toString('base64');
    
    // 4. Create extraction prompt
    const prompt = `You are an expert at reading handwritten proof of delivery (POD) receipts.

Analyze this proof of delivery receipt and extract the following information:

REQUIRED FIELDS:
- Container Numbers: Array of container IDs
- Container Sizes: Array of sizes (e.g., "20ft", "40ft")
- Full/Empty Status: Array of "FULL" or "EMPTY"

OPTIONAL FIELDS:
- Date: In YYYY-MM-DD format
- Instruction Number: Reference number
- Vehicle Number: Vehicle registration
- Collected From: Pickup location
- Delivered To: Delivery destination

For uncertain fields, add field names to "unsureFields" array.
Return as JSON with this structure:
{
  "containerNumbers": ["string"],
  "containerSizes": ["string"],
  "fullEmptyStatuses": ["FULL"|"EMPTY"],
  "pageDate": "YYYY-MM-DD",
  "instructionNumber": "string",
  "vehicleNumber": "string",
  "collectedFrom": "string",
  "deliveredTo": "string",
  "unsureFields": ["field1", "field2"]
}`;

    // 5. Call Gemini API
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data
        }
      }
    ]);
    
    const response = result.response;
    const text = response.text();
    
    // 6. Parse response
    const extractedData = JSON.parse(text);
    
    // 7. Save to database
    const pageData: ExtractedPODData = {
      pageNumber: 1, // Increment for multi-page
      ...extractedData
    };
    
    await saveExtractedPageData(documentId, pageData, db);
    
    // 8. Track token usage
    const usage = response.usageMetadata;
    if (usage) {
      await saveTokenUsage(documentId, {
        requestId: randomUUID(),
        inputTokens: usage.promptTokenCount || 0,
        candidatesTokens: usage.candidatesTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
        durationMs: Date.now() - startTime,
      }, db);
    }
    
    // 9. Update status to COMPLETED
    await updateDocumentStatus(documentId, "COMPLETED", randomUUID(), db);
    
    return [pageData];
    
  } catch (error) {
    console.error("OCR extraction failed:", error);
    await updateDocumentStatus(documentId, "FAILED", undefined, db);
    throw error;
  }
}
```

### Step 5: Add File Upload Endpoint

Update `apps/server/src/index.ts` to handle file uploads:

```typescript
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.post('/api/upload-document', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate file type
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }
    
    const { userId, instructionNumber, companyId, branchId } = req.body;
    
    // Create document record
    const [document] = await db
      .insert(uploadDocuments)
      .values({
        userId: userId,
        instructionNumber: instructionNumber,
        documentName: file.originalname,
        fileUrl: `temp://${file.originalname}`, // Not storing, just reference
        fileSizeInBytes: file.size,
        companyId: companyId,
        branchId: branchId,
        extractionStatus: "IDEAL",
      })
      .returning();
    
    // Process PDF asynchronously (recommended: use a queue)
    extractPODDataFromPDF(document.documentId, file.buffer, db)
      .catch(err => console.error('OCR processing failed:', err));
    
    res.json({ 
      success: true, 
      documentId: document.documentId 
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

### Step 6: Create a Default User

For single-user setup, create a default user:

```sql
INSERT INTO users (email, name) 
VALUES ('admin@example.com', 'Admin User')
ON CONFLICT (email) DO NOTHING;
```

Or programmatically:
```typescript
// In your setup/seed script
const [user] = await db
  .insert(users)
  .values({
    email: 'admin@example.com',
    name: 'Admin User'
  })
  .onConflictDoNothing()
  .returning();
```

### Step 7: Test the Integration

1. Start your server:
```bash
npm run dev:server
```

2. Upload a test PDF:
```bash
curl -X POST http://localhost:3000/api/upload-document \
  -F "file=@test-pod-receipt.pdf" \
  -F "userId=<user-id-from-db>" \
  -F "instructionNumber=INS-123"
```

3. Check extraction status:
```typescript
// Using tRPC client
const status = await trpc.document.getExtractionStatus.query({ 
  documentId: 'document-id' 
});
```

4. Get extracted data:
```typescript
const data = await trpc.document.getExtractedData.query({ 
  documentId: 'document-id' 
});
```

## Project Structure

```
play-repo-pod/
├── packages/
│   ├── db/
│   │   └── src/
│   │       └── schema.ts          # ✅ Updated with all tables
│   └── api/
│       └── src/
│           ├── routers/
│           │   ├── index.ts       # ✅ Updated with document router
│           │   └── document.ts    # ✅ Created with all endpoints
│           └── services/
│               └── ocr-extraction.ts  # 📝 TODO: Complete implementation
├── apps/
│   └── server/
│       └── src/
│           └── index.ts           # 📝 TODO: Add file upload endpoint
└── docs/
    └── GOOGLE_GENAI_INTEGRATION.md  # ✅ Comprehensive guide
```

## API Endpoints

### tRPC Endpoints (Available)
- `document.upload` - Upload document metadata
- `document.getDocument` - Get document details
- `document.getDocumentsByUser` - Get user's documents
- `document.getExtractedData` - Get extracted OCR data
- `document.getExtractionStatus` - Check processing status
- `document.listDocuments` - List all documents with pagination

### REST Endpoints (TODO)
- `POST /api/upload-document` - Upload PDF file

## Next Steps

1. **Install dependencies** (Step 1)
2. **Configure environment variables** (Step 2)
3. **Push database schema** (Step 3)
4. **Implement OCR logic** (Step 4)
5. **Add file upload endpoint** (Step 5)
6. **Create default user** (Step 6)
7. **Test end-to-end** (Step 7)

## Resources

- Full documentation: `docs/GOOGLE_GENAI_INTEGRATION.md`
- Database schema: `packages/db/src/schema.ts`
- API router: `packages/api/src/routers/document.ts`
- OCR service: `packages/api/src/services/ocr-extraction.ts`

## Support

For issues or questions:
1. Check the comprehensive guide in `docs/GOOGLE_GENAI_INTEGRATION.md`
2. Review Google's [Gemini API documentation](https://ai.google.dev/docs)
3. Check the TODO comments in the code

## Notes

- PDFs are processed in memory and NOT stored on disk
- Token usage is tracked for billing/monitoring
- Multi-page PDFs can be handled by processing each page separately
- Recommend using a job queue (Bull, BullMQ) for production async processing
- Add authentication before deploying to production
