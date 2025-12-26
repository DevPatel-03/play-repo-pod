# my-better-t-app

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Express, TRPC, and more.

## 🆕 Google GenAI OCR Integration

This project now includes **Google Gemini 2.0 Flash** integration for OCR extraction from proof of delivery (POD) receipt PDFs with handwritten text recognition.

### Quick Links
- 📚 **[Quick Start Guide](QUICK_START_GUIDE.md)** - Step-by-step implementation guide
- 📦 **[Dependencies Guide](DEPENDENCIES.md)** - Required packages and installation
- 📖 **[Full Documentation](docs/GOOGLE_GENAI_INTEGRATION.md)** - Comprehensive integration guide

### Key Features
- ✅ Extract handwritten data from PDF receipts
- ✅ Structured data storage (containers, dates, locations)
- ✅ Token usage tracking for cost monitoring
- ✅ Multi-page PDF support
- ✅ tRPC API endpoints for document management
- 📝 TODO placeholders ready for your prompt implementation

### Database Schema Includes
- `users` - User management
- `companies` & `branches` - Organization structure
- `upload_documents` - Document tracking with extraction status
- `extracted_page_data` - OCR results per page
- `document_token_usage` - API usage monitoring

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Express** - Fast, unopinionated web framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
bun run db:push
```


Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
my-better-t-app/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Express, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Biome formatting and linting
