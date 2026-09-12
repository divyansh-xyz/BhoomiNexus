import prisma from '../db/client.js';
import { memoryStore, extractionStore } from '../routes/documents.js';
import { ocrService } from '../services/ocr.service.js';
import { extractionService } from '../services/extraction.service.js';
import { validationService } from '../services/validation.service.js';

export async function processDocumentJob(documentId: string): Promise<void> {
  console.log(`[JobProcessor] Starting background processing for document: ${documentId}`);

  try {
    // 1. Fetch document (from DB or memory fallback)
    let doc: any = null;
    try {
      doc = await prisma.document.findUnique({ where: { id: documentId } });
    } catch (e) {
      doc = memoryStore.get(documentId);
    }

    if (!doc) {
      doc = memoryStore.get(documentId);
    }

    if (!doc) {
      console.error(`Document not found: ${documentId}`);
      return;
    }

    // Update status to PROCESSING
    doc.ocrStatus = 'PROCESSING';
    doc.llmStatus = 'PENDING';
    doc.overallStatus = 'PROCESSING';
    memoryStore.set(documentId, doc);

    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'PROCESSING', llmStatus: 'PENDING', overallStatus: 'PROCESSING' },
    }).catch(() => {});

    // 2. Execute OCR
    const ocrPages = await ocrService.processDocument(doc.storagePath, doc.mimeType);

    const fullTextList: string[] = [];
    for (const page of ocrPages) {
      fullTextList.push(page.cleanedText || page.rawText);
      await prisma.documentPage.create({
        data: {
          documentId,
          pageNumber: page.pageNumber,
          rawText: page.rawText,
          cleanedText: page.cleanedText,
          confidence: page.confidence,
        },
      }).catch(() => {});
    }

    const fullOcrText = fullTextList.join('\n\n');

    // Update OCR completed
    doc.ocrStatus = 'COMPLETED';
    doc.llmStatus = 'PROCESSING';
    memoryStore.set(documentId, doc);

    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'COMPLETED', llmStatus: 'PROCESSING' },
    }).catch(() => {});

    // 3. Structured Gemini LLM Extraction
    const extraction = await extractionService.extractStructuredData(fullOcrText);
    console.log("[JobProcessor] Gemini Extraction Result:", JSON.stringify(extraction).substring(0, 500));

    // 4. Validation logic
    const validation = validationService.validate(extraction.documentType, extraction.extractedData);

    const extractionData = {
      documentId,
      rawJson: extraction.extractedData,
      formattedJson: {
        document_type: extraction.documentType,
        extracted_data: extraction.extractedData,
        validation_summary: validation,
      },
      confidenceScores: extraction.fieldConfidence,
      missingFields: extraction.missingFields,
      piiRedactionCount: extraction.piiRedactionCount,
      schemaVersion: '2.0',
      createdAt: new Date(),
    };

    extractionStore.set(documentId, extractionData);

    await prisma.extractionResult.create({
      data: {
        documentId,
        rawJson: extraction.extractedData as any,
        formattedJson: extractionData.formattedJson as any,
        confidenceScores: extraction.fieldConfidence as any,
        missingFields: extraction.missingFields as any,
        piiRedactionCount: extraction.piiRedactionCount,
        schemaVersion: '2.0',
      },
    }).catch((err) => { console.error("Prisma insert extraction error:", err); });

    // 5. Update Final Status
    doc.documentType = extraction.documentType;
    doc.llmStatus = 'COMPLETED';
    doc.overallStatus = 'COMPLETED';
    memoryStore.set(documentId, doc);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        documentType: extraction.documentType,
        llmStatus: 'COMPLETED',
        overallStatus: 'COMPLETED',
      },
    }).catch(() => {});

    console.log(`[JobProcessor] Successfully finished processing document ${documentId}`);
  } catch (err: any) {
    console.error(`[JobProcessor] Processing error for ${documentId}:`, err);
  }
}
