# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Castro is a clinical documentation assistant for mental health professionals. It transforms audio recordings of therapy sessions into structured clinical notes by:
1. Transcribing audio via Whisper
2. Mapping transcription content to note template sections via Ollama LLM
3. Detecting documentation gaps and prompting for missing information
4. Integrating with IntakeQ for appointment scheduling and note submission

## Commands

```bash
# Development
npm run dev              # Start dev server (usually port 3000)
npm run build            # Production build
npm start                # Preview production build

# Database (PostgreSQL via Drizzle ORM)
npm run db:push          # Push schema changes (use for dev)
npm run db:generate      # Generate migration files
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed database with sample data

# Testing
npm run test             # Run all unit tests (Vitest)
npm run test:watch       # Watch mode
npx vitest run tests/unit/services/contentMapping.test.ts  # Run single test file
npx vitest -t "should map content"                          # Run tests matching pattern
npx playwright test      # Run E2E tests (requires dev server)
npx playwright test tests/e2e/user-journey.spec.ts          # Single E2E test
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TanStack Router (file-based routing)
- **Backend**: TanStack Start (server functions in route files)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Ollama (local LLM) + Whisper (transcription)
- **Styling**: Tailwind CSS + Radix UI (shadcn/ui components)

### Directory Structure

```
src/
├── routes/           # TanStack Router - file-based routing
│   ├── __root.tsx    # Root layout with providers
│   ├── index.tsx     # Dashboard/home page
│   ├── api/          # Server API handlers (GET, POST, etc.)
│   └── settings/     # Settings pages
├── services/         # Backend business logic
│   ├── contentMapping/  # Transcription → note section mapping
│   ├── gapDetection/    # Missing documentation detection
│   ├── noteGeneration/  # Final note assembly
│   ├── intakeq/         # IntakeQ API integration
│   ├── ollama/          # Local LLM client
│   ├── whisper/         # Transcription service
│   └── s3/              # AWS S3 for audio storage
├── db/
│   └── schema/       # Drizzle schema definitions
├── components/       # React UI components
├── lib/              # Utilities, validations, helpers
└── navigation/       # Navigation context and layout
```

### Key Service Flows

**Session Processing Pipeline:**
1. `sessionRecordings` - Browser/uploaded audio stored in S3
2. `transcription/` - Audio → text via Whisper
3. `contentMapping/` - Text → template sections via Ollama
4. `gapDetection/` - Analyze completeness, generate prompts
5. `noteGeneration/` - Assemble final clinical note

**IntakeQ Integration:**
- `services/intakeq/client.ts` - API client for appointments/clients
- `castro-intakeq-extension/` - Chrome extension for note submission
- Encrypted API key storage via `intakeqSettings` table

### API Route Pattern

Server handlers are defined inline in route files:

```typescript
// src/routes/api/example/index.ts
export const Route = createFileRoute('/api/example/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Handle GET request
        return Response.json({ data });
      },
      POST: async ({ request }) => {
        // Handle POST request
        const body = await request.json();
        return Response.json({ data }, { status: 201 });
      },
    },
  },
});
```

### Database Schema

Core tables (defined in `src/db/schema/`):
- `noteTemplates` / `templateSections` / `templateFields` - Note structure definitions
- `sessions` / `sessionSectionContent` / `sessionGaps` - Processing state
- `transcriptions` / `transcriptionSegments` - Audio transcription data
- `s3Credentials` / `intakeqSettings` - Encrypted credential storage
- `auditLogs` - Security audit trail

### Path Alias

Use `~` for imports from `src/`:
```typescript
import { db } from '~/db';
import { sessions } from '~/db/schema';
import { ContentMappingEngine } from '~/services/contentMapping';
```

## Testing

**Unit tests** (`tests/unit/`): Test services, validations, utilities
**E2E tests** (`tests/e2e/`): Full user journeys with Playwright

Test files follow pattern: `*.test.ts` for unit, `*.spec.ts` for E2E

## Environment Variables

Required in `.env`:
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `ENCRYPTION_KEY` - 32-byte hex key for credential encryption
- `OLLAMA_BASE_URL` - Local Ollama server (default: http://localhost:11434)
- `WHISPER_BASE_URL` - Whisper API endpoint
