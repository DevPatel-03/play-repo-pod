# Required Dependencies for Google GenAI OCR Integration

## Core Dependencies

### Google Generative AI SDK
```json
"@google/generative-ai": "^0.21.0"
```
**Purpose:** Official Google AI SDK for Gemini models
**Used for:** OCR extraction, document processing
**Documentation:** https://ai.google.dev/docs

### PDF Processing
```json
"pdf-lib": "^1.17.1"
```
**Purpose:** Pure JavaScript PDF manipulation
**Used for:** PDF parsing, page extraction, conversion
**Documentation:** https://pdf-lib.js.org/

**Alternative:**
```json
"pdfjs-dist": "^4.0.0"
```
**Purpose:** Mozilla's PDF.js library
**Used for:** PDF rendering and text extraction

### File Upload Handling
```json
"multer": "^1.4.5-lts.1",
"@types/multer": "^1.4.12"
```
**Purpose:** Middleware for handling multipart/form-data
**Used for:** PDF file uploads from client
**Documentation:** https://github.com/expressjs/multer

### Retry Logic
```json
"p-retry": "^6.2.0"
```
**Purpose:** Retry failed async operations
**Used for:** API call retries with exponential backoff
**Documentation:** https://github.com/sindresorhus/p-retry

## Optional Dependencies

### Image Processing
```json
"sharp": "^0.33.0"
```
**Purpose:** High-performance image processing
**Used for:** Image optimization, format conversion
**Documentation:** https://sharp.pixelplumbing.com/

### Queue Processing (Production Recommended)
```json
"bullmq": "^5.0.0"
```
**Purpose:** Background job processing
**Used for:** Async OCR processing queue
**Documentation:** https://docs.bullmq.io/

### UUID Generation
```json
"uuid": "^10.0.0",
"@types/uuid": "^10.0.0"
```
**Purpose:** Generate unique request IDs
**Used for:** Tracking API requests
**Note:** Node 20+ has built-in crypto.randomUUID()

## Already Installed

These are already in your project:
- `@ai-sdk/google`: Vercel AI SDK (alternative to @google/generative-ai)
- `ai`: Vercel AI SDK core
- `drizzle-orm`: Database ORM
- `@trpc/server`: API framework
- `zod`: Schema validation
- `express`: Web server
- `dotenv`: Environment variables

## Installation Commands

### Install All at Once (Bun workspace)
```bash
# From project root
bun add -w @google/generative-ai pdf-lib multer p-retry
bun add -w -d @types/multer
```

### Install Optional Packages
```bash
bun add -w sharp bullmq
```

## Package Configuration

### Add to `apps/server/package.json`

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "pdf-lib": "^1.17.1",
    "multer": "^1.4.5-lts.1",
    "p-retry": "^6.2.0",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12"
  }
}
```

### Or Add to Root `package.json` Catalog

```json
{
  "workspaces": {
    "catalog": {
      "@google/generative-ai": "^0.21.0",
      "pdf-lib": "^1.17.1",
      "multer": "^1.4.5-lts.1",
      "p-retry": "^6.2.0"
    }
  }
}
```

Then in server package.json:
```json
{
  "dependencies": {
    "@google/generative-ai": "catalog:",
    "pdf-lib": "catalog:",
    "multer": "catalog:",
    "p-retry": "catalog:"
  }
}
```

## Environment Variables Required

Add to `.env` or `.env.example`:
```env
# Google Generative AI
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Optional: Rate limiting
GEMINI_MAX_REQUESTS_PER_MINUTE=60
GEMINI_MAX_REQUESTS_PER_DAY=1000

# Optional: File upload limits
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=application/pdf
```

## Version Compatibility

### Node.js
- **Minimum:** Node.js 18.x
- **Recommended:** Node.js 20.x or later
- **Reason:** Modern crypto APIs, better performance

### TypeScript
- **Minimum:** TypeScript 5.0
- **Recommended:** TypeScript 5.8+
- **Reason:** Better type inference, improved ESM support

### npm
- **Minimum:** npm 8.x
- **Recommended:** npm 10.x
- **Reason:** Workspace catalog feature support

## Security Considerations

### API Key Protection
```typescript
// ✅ Good - Server-side only
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// ❌ Bad - Never expose in client
const apiKey = "AIzaSy..."; // Hardcoded
```

### File Validation
```typescript
// ✅ Validate file type and size
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files allowed'));
    }
    cb(null, true);
  }
});
```

## Performance Optimization

### Image Quality Settings
```typescript
import sharp from 'sharp';

// Optimize images for OCR
await sharp(buffer)
  .resize(1920, null, { // Max width 1920px
    withoutEnlargement: true
  })
  .jpeg({ quality: 85 })
  .toBuffer();
```

### Concurrent Processing
```typescript
import pLimit from 'p-limit';

// Limit concurrent API calls
const limit = pLimit(3);
const promises = pages.map(page => 
  limit(() => processPage(page))
);
await Promise.all(promises);
```

## Cost Optimization

### Token Usage Monitoring
```typescript
// Track and log token usage
console.log(`Tokens used: ${usage.totalTokens}`);
console.log(`Estimated cost: $${(usage.totalTokens / 1000000) * 0.075}`);
```

### Context Caching (For Repeated Prompts)
```typescript
// Use Gemini's context caching for repeated prompts
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  systemInstruction: "You are an expert OCR system...",
  // Enable caching
  cachedContent: cachedContentId
});
```

## Troubleshooting

### Common Installation Issues

**Issue: `sharp` installation fails**
```bash
# Solution: Install with legacy peer deps (npm fallback)
# If Bun fails to build, try using npm with legacy peer deps
npm install sharp --legacy-peer-deps
```

**Issue: TypeScript types not found**
```bash
# Solution: Install type definitions
bun add -w -d @types/multer @types/node
```

**Issue: ESM module errors**
```json
// Solution: Ensure package.json has
{
  "type": "module"
}
```

## Package Size Considerations

| Package | Size | Tree-shaken |
|---------|------|-------------|
| @google/generative-ai | ~100KB | Yes |
| pdf-lib | ~250KB | Yes |
| multer | ~50KB | No |
| p-retry | ~5KB | Yes |
| sharp | ~8MB | No (native) |

**Recommendation:** Only install `sharp` if image optimization is needed.

## Alternative Packages

### PDF Processing Alternatives
- `pdf-parse`: Lighter weight, text-only extraction
- `pdfjs-dist`: Full-featured, larger bundle
- `pdf2pic`: Direct PDF to image conversion

### File Upload Alternatives
- `formidable`: Lower-level, more control
- `busboy`: Stream-based, memory efficient
- Express native: `express.raw()` for simple cases

### Retry Alternatives
- `async-retry`: Similar API
- `retry`: Lower-level control
- Manual implementation with exponential backoff

## Next Steps

1. **Review** the COMPLETE_SETUP_GUIDE.md for implementation steps
2. **Install** required dependencies
3. **Configure** environment variables
4. **Implement** OCR extraction logic
5. **Test** with sample PDFs

## Resources

- Google AI SDK: https://www.npmjs.com/package/@google/generative-ai
- pdf-lib: https://www.npmjs.com/package/pdf-lib
- multer: https://www.npmjs.com/package/multer
- p-retry: https://www.npmjs.com/package/p-retry
