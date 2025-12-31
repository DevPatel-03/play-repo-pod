# Google GenAI Integration for POD Receipt OCR

## Overview

This implementation provides OCR (Optical Character Recognition) capabilities for proof of delivery (POD) receipt PDFs using Google's Gemini 2.0 Flash model. The system extracts handwritten data from uploaded PDFs and stores it in a structured database format.

## Research & Best Practices

### 1. Google Generative AI Package Selection

**Recommended Package:** `@google/generative-ai`
- Official Google AI SDK
- Direct access to all Gemini features
- Better control over token usage tracking
- Supports file uploads and multimodal inputs

**Alternative:** `@ai-sdk/google` (Vercel AI SDK)
- Already included in the project
- Simplified API but less control
- Good for streaming responses
- Can be used for simpler use cases

### 2. Gemini 2.0 Flash Model

**Model Details:**
- **Model ID:** `gemini-2.0-flash-exp` or `gemini-2.0-flash`
- **Strengths:**
  - Excellent OCR capabilities for both typed and handwritten text
  - Multimodal support (text + images/PDFs)
  - Fast processing speed
  - Cost-effective for document processing
  - Strong document understanding capabilities

**Capabilities:**
- Extract text from handwritten documents
- Understand document structure
- Provide confidence scores
- Handle multiple pages
- Support for various image formats

### 3. File Handling Strategies

**Option A: PDF → Images → Base64 (Recommended)**
```
PDF File → Convert to Images (PNG/JPEG) → Base64 encode → Gemini API
```

**Libraries:**
- `pdf-lib`: Modern, pure JS, works in browser and Node
- `pdfjs-dist`: Mozilla's PDF.js library
- `pdf-parse`: Simple PDF text extraction
- `sharp`: Image processing and optimization

**Benefits:**
- Better control over image quality
- Can optimize DPI for OCR
- Easier to debug (can view intermediate images)
- Works well with Gemini's vision capabilities

**Option B: Direct PDF Upload**
```
PDF File → Direct upload via File API → Gemini API
```

**Implementation:**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Convert PDF to base64
const base64Data = pdfBuffer.toString('base64');

const result = await model.generateContent([
  prompt,
  {
    inlineData: {
      mimeType: "application/pdf",
      data: base64Data
    }
  }
]);
```

### 4. Prompt Engineering for Handwritten OCR

**Key Principles:**
- Be explicit about handwritten text
- Request structured JSON output
- Specify field types and formats
- Ask for confidence/uncertainty flags

**Example Prompt:**
```
You are an expert at reading handwritten proof of delivery (POD) receipts.

Analyze the attached document image and extract the following information:

REQUIRED FIELDS:
- Container Numbers: Array of container IDs (e.g., ["ABCD1234567", "EFGH8901234"])
- Container Sizes: Array of sizes matching containers (e.g., ["20ft", "40ft"])
- Full/Empty Status: Array of "FULL" or "EMPTY" for each container

OPTIONAL FIELDS:
- Date: In YYYY-MM-DD format
- Instruction Number: Reference/tracking number
- Vehicle Number: Truck/vehicle registration
- Collected From: Pickup location
- Delivered To: Delivery destination

IMPORTANT:
- If text is unclear or uncertain, include the field name in "unsureFields" array
- If a value cannot be read, use null in the array
- Return data as valid JSON
- Handle handwritten text carefully

OUTPUT FORMAT:
{
  "containerNumbers": ["string", ...],
  "containerSizes": ["string", ...],
  "fullEmptyStatuses": ["FULL" | "EMPTY", ...],
  "pageDate": "YYYY-MM-DD" | null,
  "instructionNumber": "string" | null,
  "vehicleNumber": "string" | null,
  "collectedFrom": "string" | null,
  "deliveredTo": "string" | null,
  "unsureFields": ["fieldName", ...]
}
```

### 5. Token Usage Tracking

**Gemini API Response Structure:**
```typescript
{
  response: {
    text: "...",
    // ... other fields
  },
  usageMetadata: {
    promptTokenCount: number,      // Input tokens
    candidatesTokenCount: number,  // Output tokens
    totalTokenCount: number,       // Total tokens
    cachedContentTokenCount: number // Cached tokens (if using context caching)
  }
}
```

**Database Schema Implementation:**
```typescript
{
  inputTokens: promptTokenCount,
  candidatesTokens: candidatesTokenCount,
  outputTokens: candidatesTokenCount + thoughtsTokens,
  totalTokens: totalTokenCount,
  cachedContentTokens: cachedContentTokenCount || 0
}
```

### 6. Error Handling & Retry Logic

**Common Issues:**
- Rate limits (429 errors)
- API timeouts
- Invalid responses
- Network failures

**Recommended Strategy:**
```typescript
import pRetry from 'p-retry';

const extractWithRetry = pRetry(
  async () => {
    return await geminiAPI.extract();
  },
  {
    retries: 3,
    onFailedAttempt: (error) => {
      console.log(`Attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`);
    }
  }
);
```

### 7. Multi-Page PDF Handling

**Strategy:**
1. Convert PDF to individual page images
2. Process pages in parallel (if API limits allow) or sequentially
3. Store each page's results separately in `extracted_page_data` table
4. Link all pages to the same document via `documentId`

**Benefits:**
- Granular data access
- Easier to retry failed pages
- Better for pagination in UI
- Allows partial success (some pages succeed even if others fail)

## Database Schema

### Tables

**1. users**
- `userId`: Primary key
- `email`: User email
- `name`: User name

**2. companies**
- `companyId`: Primary key
- `companyName`: Company name

**3. branches**
- `branchId`: Primary key
- `companyId`: Foreign key to companies
- `branchName`: Branch name

**4. upload_documents**
- `documentId`: Primary key
- `userId`: Foreign key to users
- `instructionNumber`: Document reference
- `documentName`: Original filename
- `fileUrl`: Storage URL (for reference, PDF not stored)
- `fileSizeInBytes`: File size
- `companyId`: Optional company reference
- `branchId`: Optional branch reference
- `extractionStatus`: IDEAL | PROCESSING | COMPLETED | FAILED
- `extractionId`: Unique extraction job ID

**5. extracted_page_data**
- `extractedPageDataId`: Primary key
- `documentId`: Foreign key to upload_documents
- `pageNumber`: Page number in document
- `containerNumbers`: Array of container IDs
- `containerSizes`: Array of container sizes
- `fullEmptyStatuses`: Array of statuses
- `pageDate`: Date from document
- `instructionNumber`: Instruction reference
- `vehicleNumber`: Vehicle registration
- `collectedFrom`: Pickup location
- `deliveredTo`: Delivery destination
- `unsureFields`: Fields with uncertain values

**6. document_token_usage**
- `tokenUsageId`: Primary key
- `documentId`: Foreign key to upload_documents
- `requestId`: API request ID
- `inputTokens`: Prompt tokens
- `toolUsePromptTokens`: Tool usage tokens
- `cachedContentTokens`: Cached tokens
- `candidatesTokens`: Response tokens
- `thoughtsTokens`: Thinking tokens
- `outputTokens`: Total output tokens
- `totalTokens`: Sum of all tokens
- `durationMs`: Processing time

## API Endpoints (tRPC)

### document.upload
Upload a document for OCR processing
```typescript
input: {
  userId: string (uuid),
  instructionNumber: string,
  documentName: string,
  fileUrl: string,
  fileSizeInBytes: number,
  companyId?: string (uuid),
  branchId?: string (uuid)
}
```

### document.getDocument
Get document metadata
```typescript
input: { documentId: string }
```

### document.getDocumentsByUser
Get all documents for a user
```typescript
input: { userId: string }
```

### document.getExtractedData
Get extracted page data for a document
```typescript
input: { documentId: string }
```

### document.getExtractionStatus
Check extraction status
```typescript
input: { documentId: string }
```

### document.listDocuments
List all documents with pagination
```typescript
input: {
  limit?: number (default: 20, max: 100),
  offset?: number (default: 0)
}
```

## Installation

### Required Packages

From the project root, add packages using Bun (workspace-aware):

```bash
# Google Generative AI SDK
bun add -w @google/generative-ai

# PDF Processing (choose one)
bun add -w pdf-lib
# OR
bun add -w pdfjs-dist

# Image processing (optional, for optimization)
bun add -w sharp

# File upload handling
bun add -w multer
bun add -w -d @types/multer

# Retry logic
bun add -w p-retry
```

### Environment Variables

Add to `.env`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://...
```

## Implementation Steps

### 1. Install Dependencies
```bash
# From project root (workspace-aware)
bun add -w @google/generative-ai pdf-lib sharp multer p-retry
bun add -w -d @types/multer
```

### 2. Implement OCR Service
Complete the TODO in `packages/api/src/services/ocr-extraction.ts`:
- Set up Gemini client
- Implement PDF to image conversion
- Create extraction prompt
- Parse and validate responses
- Save to database

### 3. Add File Upload Endpoint
Update server to handle multipart/form-data:
```typescript
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload-document', upload.single('file'), async (req, res) => {
  const file = req.file;
  // Process file buffer
  // Call OCR service
  // Return document ID
});
```

### 4. Update Database
Run migrations:
```bash
bun run db:generate
bun run db:push
```

### 5. Test Implementation
- Upload test PDF
- Verify extraction
- Check token usage tracking
- Validate data structure

## Security Considerations

1. **API Key Protection**: Never expose API key in client-side code
2. **File Validation**: Validate file types and sizes before processing
3. **Rate Limiting**: Implement rate limits to prevent abuse
4. **Input Sanitization**: Sanitize all extracted data before storage
5. **User Authentication**: Add proper authentication (currently placeholder)

## Performance Optimization

1. **Async Processing**: Use queue system (Bull, BullMQ) for background processing
2. **Parallel Processing**: Process multiple pages in parallel
3. **Caching**: Cache common prompts using Gemini's context caching
4. **Image Optimization**: Reduce image size while maintaining OCR quality
5. **Batch Processing**: Group multiple documents for efficiency

## Monitoring & Logging

Track:
- API response times
- Token usage costs
- Error rates
- Extraction accuracy
- Queue depth (if using async processing)

## Cost Estimation

Gemini 2.0 Flash pricing (approximate):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

Typical document:
- 1 page PDF → ~1000-2000 input tokens
- Structured output → ~500-1000 output tokens
- Cost per page: ~$0.001-0.002

## Future Enhancements

1. Add user authentication
2. Implement async job queue
3. Add confidence scores for extracted fields
4. Support for additional document types
5. Batch upload and processing
6. Real-time extraction status updates (WebSocket)
7. Export functionality (CSV, Excel)
8. Document comparison and validation
9. Historical data analysis
10. Multi-language support

## Troubleshooting

### Common Issues

**Issue: API Key Invalid**
- Verify API key in .env file
- Check key has Generative AI API enabled

**Issue: Poor OCR Accuracy**
- Increase image resolution/DPI
- Improve prompt specificity
- Use better image preprocessing

**Issue: Rate Limits**
- Implement exponential backoff
- Use queue system for batch processing
- Consider upgrading API quota

## References

- [Google Generative AI Documentation](https://ai.google.dev/docs)
- [Gemini API Quickstart](https://ai.google.dev/tutorials/node_quickstart)
- [Gemini 2.0 Flash Model Card](https://ai.google.dev/models/gemini)
- [Prompt Engineering Guide](https://ai.google.dev/docs/prompt_best_practices)
