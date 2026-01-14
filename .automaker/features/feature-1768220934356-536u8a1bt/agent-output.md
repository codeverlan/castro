I'll start by exploring the `/resources` directory to understand its structure and contents, then help you brainstorm enhancements for the API documentation.

🔧 Tool: Bash
Input: {
  "command": "ls -la /resources 2>/dev/null || ls -la ./resources 2>/dev/null || find . -type d -name \"resources\" 2>/dev/null | head -5",
  "description": "Find resources directory location"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/resources/**/*"
}
I can see there are 7 IntakeQ API documentation PDFs in the `/resources` directory. Let me read each of these PDF files to understand the API documentation:

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Client API .pdf"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Appointments API .pdf"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Notes API .pdf"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Invoice API .pdf"
}
Now let me read the remaining API documentation PDFs:

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Questionnaire API .pdf"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Claims API .pdf"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/resources/IntakeQ Files API .pdf"
}
Now let me explore the existing codebase to understand its structure and what's already been implemented:

🔧 Tool: Glob
Input: {
  "pattern": "**/*.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/*.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /Users/tyler-lcsw/projects/castro",
  "description": "List root project directory"
}

🔧 Tool: Glob
Input: {
  "pattern": "src/**/*"
}

🔧 Tool: Bash
Input: {
  "command": "find /Users/tyler-lcsw/projects/castro/src -type f -name \"*.ts\" -o -name \"*.tsx\" | head -100",
  "description": "List all source files"
}
Now let me look at the existing service structure and API patterns:

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/src/routes/api/notes/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/src/services/s3/service.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/tyler-lcsw/projects/castro/package.json"
}
Now I have a comprehensive understanding of both the IntakeQ API documentation and the existing codebase structure. Let me provide a detailed analysis and brainstorm enhancements.

<summary>
## Summary: IntakeQ API Documentation Analysis and Enhancement Recommendations

### Analysis Completed

I've thoroughly analyzed all 7 IntakeQ API documentation PDFs in the `/resources` directory:

1. **IntakeQ Client API** - Client management (query, save, tags, diagnoses)
2. **IntakeQ Appointments API** - Appointment CRUD operations with webhooks
3. **IntakeQ Notes API** - Treatment notes (query, PDF download, full JSON)
4. **IntakeQ Invoice API** - Invoice management with payment tracking and webhooks
5. **IntakeQ Questionnaire API** - Intake forms, templates, and submission webhooks
6. **IntakeQ Claims API** - Insurance claims management
7. **IntakeQ Files API** - File upload/download for client documents

### Key API Characteristics

**Common Patterns:**
- Base URL: `https://intakeq.com/api/v1/`
- Authentication: `X-Auth-Key` header
- Rate limits: 10 requests/min, 500/day (standard tier)
- Pagination: 100 records max per request
- Timestamps: Unix milliseconds format
- Webhooks available for real-time integrations

**Data Relationships:**
- Clients ↔ Appointments ↔ Invoices
- Clients ↔ Questionnaires/Intakes ↔ Notes
- Appointments ↔ Telehealth (Zoom/IntakeQ video)
- Claims ↔ Clients ↔ Insurance

### Enhancement Recommendations for the Castro Project

Based on the existing codebase patterns (services, API routes, validations), here are brainstormed enhancements:

#### 1. **IntakeQ Integration Service** (`src/services/intakeq/`)
- Create a comprehensive IntakeQ client wrapper
- Implement rate limiting with request queue
- Add credential encryption similar to S3 service
- Support webhook endpoint registration

#### 2. **Client Sync Feature**
- Bidirectional sync between Castro sessions and IntakeQ clients
- Map session data to IntakeQ client profiles
- Auto-create clients when generating notes

#### 3. **Note Export to IntakeQ**
- Export generated clinical notes directly to IntakeQ as treatment notes
- Map Castro note sections to IntakeQ question objects
- Support PDF attachment uploads via Files API

#### 4. **Appointment Integration**
- Pull upcoming appointments to inform session context
- Link sessions to IntakeQ appointments
- Auto-generate notes for completed appointments

#### 5. **Invoice Generation**
- Create invoices from completed sessions
- Support procedure codes from note templates
- Integrate payment tracking

#### 6. **Questionnaire Pre-population**
- Use intake form responses to pre-fill note fields
- Auto-detect gaps from missing questionnaire answers
- Map intake data to session transcription analysis

#### 7. **Webhook Handlers** (`src/routes/api/webhooks/intakeq/`)
- Handle appointment status changes
- Process intake form submissions
- React to invoice payments
- Sync note locks

#### 8. **Claims Support**
- Generate claims from session data
- Auto-populate diagnosis codes from notes
- Track claim status

### Files Modified
- Analysis only - no files modified

### Notes for Developer
- The IntakeQ API uses Unix timestamps in **milliseconds** (not seconds)
- External client IDs enable two-way syncing
- Webhook signatures should be validated for security
- Consider implementing caching for frequently accessed data (practitioners, templates)
- The API supports both email and SMS delivery for questionnaires
- Deleted records are retrievable for 10 days only
</summary>