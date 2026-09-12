# AI Document Intelligence — Land Acquisition Document Parser

**SIH Hackathon Project: Real-Time National Land Acquisition & Management System**

Backend module that extracts structured data from land and land-acquisition documents using PDF text extraction/OCR and an LLM, with type-aware schemas and human officer review.

## What changed in this revision

Two gaps stood out against `PRD_SIH.md` and `API_Contract___Ownership_Document.md`:

1. **Real-time / async processing.** The PRD frames "real-time" as *"an
   authorized user updates a record and it becomes available without waiting
   for manual consolidation,"* and the API contract's document-processing
   module expects a job-style status endpoint (`OCR status / Gemini status /
   overall status / retry availability`). The previous `POST /process` was a
   single blocking call (10–30s) that held the HTTP connection open — fine
   for a demo, but not what the rest of the platform (and a mobile field
   officer on a weak connection) expects. `POST /process` now returns `202`
   immediately and runs the pipeline as a background task; `GET
   /{id}/processing` reports granular `ocr_status` / `llm_status` /
   `retry_available` so the frontend can show real progress instead of a
   frozen spinner, and failed runs can be retried up to 3 times.
2. **Data minimization for the LLM call.** PRD §34–35 require encryption and
   data minimization for sensitive landowner/financial data. Land documents
   routinely contain Aadhaar numbers, PAN, phone numbers, and bank account
   numbers — none of which any extraction schema actually asks for. Before
   text is sent to the external LLM (Google/OpenAI/Anthropic), it now passes
   through `app/utils/pii_redaction.py`, which masks those identifiers while
   leaving dates, survey numbers, and amounts intact for extraction. The
   original OCR text is unaffected — the officer review UI still sees
   everything.

Both changes are additive: existing endpoints, schemas, and the review
workflow are unchanged in shape.

## Architecture

```
PDF/Image Upload → PDF Detection → Page-level Text/OCR → Document Classification
    → Type-specific LLM Extraction → Zod Validation → Source Pages/Confidence
    → Human Officer Review → Approved Data
```

The AI **assists** the officer — it does NOT make legal or administrative decisions.

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js (v20+)
- npm

### 2. Setup

```bash
# Clone and enter directory
cd sih_ai_document_parser_fixed

# Install dependencies
npm install

# Copy environment config
copy .env.example .env         # Windows
# cp .env.example .env         # Linux/macOS

# Edit .env — set your GEMINI_API_KEY / DATABASE_URL
```

### 3. Run Database Migration & Start Server

```bash
# Generate Prisma client & push schema
npm run prisma:generate
npm run prisma:db-push

# Run development server
npm run dev
```

The API is now live at **http://localhost:8000**

### 4. Run Tests

```bash
npm test
```

---

## Docker Setup (with PostgreSQL)

```bash
# Set your LLM API key
set LLM_API_KEY=your-key       # Windows
# export LLM_API_KEY=your-key  # Linux/macOS

# Start services
docker-compose up --build
```

---

## Document-type-aware extraction

The parser does not force every document into the same flat acquisition schema. It first detects the document type and then validates the fields appropriate to that type.

Supported types include:
- `sale_deed`
- `land_acquisition_notification`
- `land_parcel_survey`
- `award_document`
- `compensation_document`
- `rr_document`
- `general_land_acquisition`
- `unknown`

For a Sale Deed, the extraction is grouped into seller, buyer, property, transaction, legal status, and notarization. Fields such as award number or affected family count are not reported as missing because they are not applicable to a Sale Deed.

The API also maps extracted field values back to a source page when the value can be found in the page text.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload a PDF/image file |
| `POST` | `/api/documents/{id}/process` | Start OCR → LLM → validation pipeline as a background task (returns `202` immediately) |
| `GET` | `/api/documents/{id}` | Get document metadata |
| `GET` | `/api/documents/{id}/extraction` | Get extraction result with confidence |
| `GET` | `/api/documents/{id}/status` | Get overall processing status |
| `GET` | `/api/documents/{id}/processing` | Get granular status: `ocr_status`, `llm_status`, `retry_count`, `retry_available` |
| `PUT` | `/api/documents/{id}/review` | Submit officer corrections + approval |
| `POST` | `/api/documents/{id}/reject` | Reject extraction |
| `GET` | `/api/documents/` | List documents (paginated) |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/workflows/types` | List workflow types |
| `POST` | `/api/workflows/{type}/check-completeness` | Check document completeness |

---

## Example API Usage (curl)

### 1. Upload a Document

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@land_notification.pdf"
```

**Response:**
```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "land_notification.pdf",
  "file_type": "pdf",
  "file_size": 245760,
  "status": "uploaded"
}
```

### 2. Process the Document

```bash
curl -X POST http://localhost:8000/api/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/process
```

**Response (202 Accepted, returned immediately):**
```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "message": "Processing started. Poll GET /{id}/processing for progress."
}
```

Poll for progress:

```bash
curl http://localhost:8000/api/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/processing
```

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ocr_status": "completed",
  "llm_status": "completed",
  "status": "needs_review",
  "error_message": null,
  "retry_count": 0,
  "retry_available": false
}
```

`status` moves `uploaded → processing → ocr_completed → extracting →
validation_completed → needs_review` (or `failed`, retryable up to 3 times
via `POST /process` again).

### 3. Get Extraction Results

```bash
curl http://localhost:8000/api/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/extraction
```

**Response:**
```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "document_type": "land_acquisition_notification",
  "extracted_data": {
    "notification_number": "LA/2026/1042",
    "village": "Rampur",
    "survey_number": "182/4",
    "land_area": 2.41,
    "land_area_unit": "acres",
    "district": "Pune",
    "state": "Maharashtra",
    "compensation_amount": 1250000.0,
    "project_name": "Highway Expansion NH-48",
    "notification_date": "2026-01-15",
    "authority_name": "District Collector, Pune"
  },
  "field_confidences": [
    {"field": "notification_number", "value": "LA/2026/1042", "confidence": "high", "source_page": null},
    {"field": "district", "value": "Pune", "confidence": "high", "source_page": null},
    {"field": "compensation_amount", "value": 1250000.0, "confidence": "medium", "source_page": null}
  ],
  "missing_fields": ["award_number", "award_date"],
  "uncertain_fields": ["compensation_amount", "project_type"],
  "source_pages": [1, 2, 3],
  "validation_status": "partial",
  "validation_issues": [
    "WARNING: notification_number is present but notification_date is missing"
  ]
}
```

### Sale Deed extraction example

A Sale Deed is returned with nested, document-specific fields, for example:

```json
{
  "document_type": "sale_deed",
  "extracted_data": {
    "seller": {"name": "John Doe Smith", "age": 45},
    "buyer": {"name": "Jane Miller Jones", "age": 38},
    "property": {
      "lot_number": "Lot 14",
      "block_number": "Block 5",
      "title_deed_number": "TD-998877-2021",
      "area": 5000,
      "area_unit": "square feet",
      "property_type": "vacant residential land"
    },
    "transaction": {"sale_price": 50000, "currency": "USD"}
  }
}
```

The exact response also includes field confidence and source-page metadata.

### 4. Officer Review & Approval

```bash
curl -X PUT http://localhost:8000/api/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/review \
  -H "Content-Type: application/json" \
  -d '{
    "review_status": "approved",
    "reviewer_name": "Officer Singh",
    "survey_number": "182/4",
    "village": "Rampur",
    "district": "Pune",
    "land_area": 2.41,
    "land_area_unit": "acres",
    "review_notes": "Verified against physical records"
  }'
```

### 5. Check Document Completeness

```bash
curl -X POST http://localhost:8000/api/workflows/land_acquisition/check-completeness \
  -H "Content-Type: application/json" \
  -d '{
    "submitted_document_types": ["land_acquisition_notification"]
  }'
```

**Response:**
```json
{
  "workflow_type": "land_acquisition",
  "complete": false,
  "missing_documents": ["Land Parcel / Survey Document", "Award Document"]
}
```

---

## Frontend Integration Guide

### For the Frontend Team

1. **Upload flow:** `POST /api/documents/upload` with `multipart/form-data`
2. **Trigger processing:** `POST /api/documents/{id}/process` (this is synchronous for the hackathon; may take 10-30s depending on document size and LLM response time)
3. **Poll status:** `GET /api/documents/{id}/status` to check if processing is done
4. **Display extraction:** `GET /api/documents/{id}/extraction` returns all extracted fields with confidence levels
5. **Show review UI:** Display extracted fields in an editable form. Highlight:
   - Fields with `"confidence": "low"` in yellow/orange
   - Fields listed in `missing_fields` as empty fields to fill
   - `validation_issues` as warnings
6. **Submit review:** `PUT /api/documents/{id}/review` with corrected fields + `review_status: "approved"` or `"rejected"`
7. **List documents:** `GET /api/documents/?page=1&page_size=20&status=needs_review` for the officer dashboard

### Processing States

```
uploaded → processing → needs_review → approved
                                     → rejected
         → failed (retry with POST /process)
```

### CORS

The API allows requests from `http://localhost:3000` and `http://localhost:5173` by default.
Add your frontend origin to `CORS_ORIGINS` in `.env`.

---

## Project Structure

```
app/
├── main.py                         # FastAPI app factory
├── config.py                       # pydantic-settings configuration
├── api/
│   ├── documents.py                # Document CRUD + processing endpoints
│   ├── health.py                   # Health check
│   └── document_checker.py         # Workflow completeness API
├── models/
│   ├── database.py                 # SQLAlchemy engine & session
│   └── document.py                 # ORM models (Document, Page, Extraction, Review)
├── schemas/
│   ├── document.py                 # Upload/metadata schemas
│   ├── extraction.py               # Extraction result schemas (22 fields)
│   └── review.py                   # Officer review schemas
├── services/
│   ├── pdf_service.py              # PDF text detection & extraction
│   ├── ocr_service.py              # PaddleOCR integration
│   ├── llm_provider.py             # LLM abstraction (Google/OpenAI/Anthropic)
│   ├── extraction_service.py       # Full extraction pipeline orchestrator
│   ├── validation_service.py       # 3-layer validation
│   ├── document_checker.py         # Workflow completeness checker
│   └── storage_service.py          # File storage abstraction
├── prompts/
│   └── land_document_extraction.txt  # LLM extraction prompt
└── utils/
    └── text_cleaning.py            # Safe OCR text cleanup

tests/
├── conftest.py                     # Shared fixtures & mock LLM
├── test_upload.py
├── test_extraction.py
├── test_validation.py
├── test_review.py
├── test_document_checker.py
└── test_text_cleaning.py

alembic/                            # Database migrations
├── env.py
├── script.py.mako
└── versions/

requirements.txt
.env.example
Dockerfile
docker-compose.yml
alembic.ini
```

---

## Supported LLM Providers

| Provider | `LLM_PROVIDER` | Default Model | Package |
|----------|----------------|---------------|---------|
| Google Gemini | `google` | `gemini-2.5-flash` | `google-genai` |
| OpenAI | `openai` | `gpt-4o-mini` | `openai` |
| Anthropic | `anthropic` | `claude-sonnet-4-20250514` | `anthropic` |

---

## Document Types

- `land_acquisition_notification` — Section 11(1) notifications
- `land_parcel_survey` — Survey/khasra documents
- `award_document` — Land acquisition awards
- `compensation_document` — Compensation records
- `rr_document` — Rehabilitation & Resettlement
- `general_land_acquisition` — Other land documents
- `unknown` — Unclassifiable documents

---

## Security Notes

- File type validation on upload
- File size limits (configurable)
- Filename sanitization (no path traversal)
- No API keys in database or logs
- Uploaded files are never executed
- Internal paths are never exposed to clients
