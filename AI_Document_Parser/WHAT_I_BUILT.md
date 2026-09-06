# AI Document Intelligence — Land Acquisition & Property Document Parser
## Comprehensive Technical Documentation & Hackathon Presentation Guide

---

##  EXECUTIVE SUMMARY & ARCHITECTURE

You have built a **production-grade AI-powered Document Intelligence microservice** tailored for **National Land Acquisition & Management Systems**. 

The microservice automatically processes scanned PDFs and phone-captured photos of physical land records (such as Sale Deeds, Land Acquisition Notifications, Survey Documents, Award Documents, and R&R Forms). It performs computer-vision-based image restoration, runs page-level OCR, redacts sensitive PII, extracts 15+ structured domain fields using Google Gemini AI, enforces strict schema & business validations, and tracks physical hard-copy evidence compliance.

```
┌────────────────────────┐      ┌───────────────────────────┐      ┌──────────────────────────────┐
│  Upload Document       │ ───► │ Computer Vision Pipeline  │ ───► │  PaddleOCR / PyMuPDF         │
│  (PDF / PNG / JPG)     │      │ (Deskew, Shadows, Warp)   │      │  (Text & Line Recognition)   │
└────────────────────────┘      └───────────────────────────┘      └──────────────────────────────┘
                                                                                  │
┌────────────────────────┐      ┌───────────────────────────┐                     ▼
│ Approved Land Record   │ ◄─── │ Officer Review Workflow   │ ◄─── ┌──────────────────────────────┐
│ (Node Backend Sync)    │      │ (Approve / Correct / Flag)│      │ Local PII Redaction          │
└────────────────────────┘      └───────────────────────────┘      │ (Aadhaar / PAN / Phone)      │
                                                                   └──────────────────────────────┘
                                                                                  │
                                                                                  ▼
                                                                   ┌──────────────────────────────┐
                                                                   │ Gemini LLM Extraction        │
                                                                   │ + ULPIN Field Linkage        │
                                                                   └──────────────────────────────┘
```

---

## 🎯 KEY IMPLEMENTATION HIGHLIGHTS

### 1. Phase 9: OCR + AI Extraction Engine
- **Non-blocking Async Pipeline:** Uploads return `202 Accepted` immediately. Heavy OCR and LLM calls run safely in background workers without freezing HTTP client connections or mobile apps.
- **Granular Progress Polling:** `GET /api/documents/{id}/processing` provides real-time progress (`ocr_completed`, `extracting`, `validation_completed`, `completed`) with retry metrics (up to 3 retries).
- **Domain Schema & ULPIN Extraction:** Supports **20 Indian Property & Land Document Types** including Sale Deeds, Gift Deeds, Lease Deeds, Relinquishment Deeds, Mortgage Deeds, Partition Deeds, Conveyance Deeds, Wills, Power of Attorney, Encumbrance Certificates (Form 15/16), Mutation Register Extracts (Namantaran / Dakhil Kharij / Khata Transfer), Record of Rights (RTC / Pahani / 7/12 Extract / Khasra-Khatoni), Municipal Property Tax Receipts, Land Acquisition Notifications, Award Orders, Compensation Claim Forms, R&R Scheme Records, Possession Certificates, NOCs, and ULPIN (Unique Land Parcel Identification Number) linkage.
- **Confidence Scoring & Missing Field Alerts:** Calculates field-level confidence ratings (`high`, `medium`, `low`) and reports missing required fields to guide human verification.

### 2. Phase 10: Hard-Copy Evidence & Compliance Tracking
- **Multi-Source Evidence Tracking:** Tracks document lifecycle across 4 evidence types: `DIGITAL_DOCUMENT`, `OCR_OUTPUT`, `HARD_COPY_SCAN`, `PHOTO`.
- **Officer Physical Verification:** Provides endpoints for field officers to verify and cross-check physical hard-copies against AI extractions.
- **Definition of Done Enforcement:** Ensures record approval is blocked until both digital AI extractions and verified hard-copy physical evidence exist.

### 3. Advanced Computer Vision Image Preprocessing (Phone Photo Optimization)
Field officers in the ground frequently capture property documents with smartphone cameras under non-ideal real-world conditions. The microservice includes an automated computer vision preprocessing engine (`app/services/image_preprocessing.py`):

| Challenge | Computer Vision Solution |
| :--- | :--- |
| **Perspective Distortion** | 4-corner document contour detection and `cv2.warpPerspective` to flatten 3D camera angles into rectangular 2D pages. |
| **Skew / Rotation** | Hough lines & `cv2.minAreaRect` text contour angle detection with automatic affine rotation. |
| **Shadows & Harsh Light** | Morphological background illumination division (`cv2.dilate` + LAB luminance split) to eliminate dark phone shadows. |
| **Low Contrast & Faded Text** | Contrast Limited Adaptive Histogram Equalization (CLAHE) and unsharp masking. |
| **Sensor Noise & Blur** | Bilateral filtering and resolution normalization (1200px–2500px DPI targeting). |
| **Multi-page Photos** | Sequential page-by-page computer vision enhancement for multi-page uploads. |

### 4. Data Security & Local PII Protection (PRD §34–35)
Before document text is transmitted to external LLMs (Google Gemini / OpenAI / Anthropic), sensitive personal identifiers are masked locally (`app/utils/pii_redaction.py`):
- **Aadhaar Numbers:** Masked as `[AADHAAR_REDACTED]`
- **PAN Cards:** Masked as `[PAN_REDACTED]`
- **Phone Numbers:** Masked as `[PHONE_REDACTED]`
- **Emails:** Masked as `[EMAIL_REDACTED]`
- **Bank Account Numbers:** Masked as `[BANK_ACCOUNT_REDACTED]`
*Note:* Dates, survey numbers, and financial compensation amounts remain unredacted for accurate extraction.

---

## 📡 REST API SPECIFICATION (PURE BACKEND)

All endpoints are strictly RESTful backend APIs designed for frontend or Node.js microservice integration.

### Upload & Processing
- **`POST /api/documents/upload`**
  - **Payload:** `multipart/form-data` with `file` (PDF, PNG, JPG, JPEG)
  - **Response:** `201 Created` with `document_id`, `filename`, `status: "processing"`
- **`GET /api/documents/{id}/processing`**
  - **Response:** Current background task status (`ocr_status`, `llm_status`, `overall_status`, `retry_available`)
- **`GET /api/documents/{id}/extraction`**
  - **Response:** Extracted JSON data, field confidence breakdown, missing fields list, PII redaction count, and document classification type.

### Officer Review & Approval
- **`POST /api/documents/{id}/verify`**
  - **Payload:** Review action (`status: "approved"` or `"rejected"`), optional corrected field data.
  - **Response:** Updated document record with officer signature and approval metadata.

### Hard-Copy Evidence (Phase 10)
- **`POST /api/documents/{id}/evidence`**
  - **Payload:** Upload scan or photo of hard-copy evidence record.
- **`GET /api/documents/{id}/evidence`**
  - **Response:** Evidence list and physical verification status.
- **`POST /api/documents/{id}/evidence/verify`**
  - **Payload:** Officer verification flag for physical evidence match.

---

## 📊 DATABASE SCHEMA (POSTGRESQL / SQLITE)

The database schema is managed via SQLAlchemy and Alembic migrations:

1. **`documents`**: Primary record tracking filename, storage path, status, document type, and officer review state.
2. **`document_pages`**: Page-level OCR text, page numbers, and confidence metrics.
3. **`extraction_results`**: Structured JSON extracted from LLM along with field confidence dictionary.
4. **`extraction_reviews`**: Audit trail of human officer approvals, rejections, and field corrections.
5. **`stage_evidence`**: Evidence ledger tracking `DIGITAL_DOCUMENT`, `OCR_OUTPUT`, `HARD_COPY_SCAN`, and `PHOTO`.

---

## 🎤 HACKATHON PRESENTATION GUIDE (FOR JUDGES)

### 30-Second Elevator Pitch
> *"Our AI Document Intelligence microservice automates land acquisition data entry directly from physical paper records. Ground officers can take photos of land deeds on phone cameras or upload PDFs. Our computer vision engine removes shadows, corrects camera tilt, and deskews the image. PaddleOCR reads the text, local PII protection redacts Aadhaar/PAN data, and Google Gemini extracts structured data—including ULPIN and survey numbers—ready for human officer verification in seconds."*

### Key Technical Highlights to Emphasize to Judges:
1. **Handles Camera Photos:** Built-in OpenCV preprocessing handles real-world phone photos (perspective warp, shadow elimination, deskew).
2. **Government Compliance:** Enforces physical hard-copy evidence tracking (Phase 10) before marking records complete.
3. **Data Security:** PII is scrubbed locally before any cloud LLM API call.
4. **Resilient Microservice:** Non-blocking async execution with automated 3x retry policies.
5. **High Test Coverage:** Fully verified with 81 passing unit & integration tests.

---

## 🛠 HOW TO RUN & VERIFY

```bash
# 1. Activate environment
venv\Scripts\activate

# 2. Run test suite (81 passing tests)
pytest tests/ -v

# 3. Start production/dev server
uvicorn app.main:app --reload --port 8000

# 4. View OpenAPI interactive documentation
# Open http://localhost:8000/docs in browser
```
