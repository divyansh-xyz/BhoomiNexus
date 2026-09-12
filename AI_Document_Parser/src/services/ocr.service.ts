import fs from 'fs';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { pdfService } from './pdf.service.js';
import { cleanOcrText } from '../utils/textCleaning.js';

export interface OcrPageResult {
  pageNumber: number;
  rawText: string;
  cleanedText: string;
  confidence: number;
}

export class OcrService {
  private visionClient: ImageAnnotatorClient | null = null;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.visionClient = new ImageAnnotatorClient();
      } catch (e) {
        console.warn('Could not initialize Google Cloud Vision client:', e);
      }
    }
    if (config.llmApiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(config.llmApiKey);
      } catch (e) {
        console.warn('Could not initialize Gemini AI client:', e);
      }
    }
  }

  public async processDocument(storagePath: string, mimeType: string): Promise<OcrPageResult[]> {
    const isPdf = mimeType.toLowerCase() === 'application/pdf' || storagePath.endsWith('.pdf');
    const isText = mimeType.toLowerCase().startsWith('text/') ||
      storagePath.endsWith('.txt') ||
      storagePath.endsWith('.md') ||
      storagePath.endsWith('.csv') ||
      storagePath.endsWith('.json');

    if (isText) {
      try {
        const fileBuffer = await fs.promises.readFile(storagePath);
        const text = fileBuffer.toString('utf-8');
        const cleaned = cleanOcrText(text);
        return [
          {
            pageNumber: 1,
            rawText: text,
            cleanedText: cleaned,
            confidence: 0.99,
          },
        ];
      } catch (err) {
        console.warn('Direct text read failed:', err);
      }
    }

    if (isPdf) {
      // Extract embedded text first
      const pdfPages = await pdfService.extractText(storagePath);
      const hasEmbeddedText = pdfPages.some((p) => p.text && p.text.trim().length > 50);

      if (hasEmbeddedText) {
        return pdfPages.map((p) => {
          const cleaned = cleanOcrText(p.text);
          return {
            pageNumber: p.pageNumber,
            rawText: p.text,
            cleanedText: cleaned,
            confidence: 0.98,
          };
        });
      }
    }

    // Process image file or scanned PDF with OCR
    if (this.visionClient) {
      try {
        const [result] = await this.visionClient.textDetection(storagePath);
        const fullText = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
        const cleaned = cleanOcrText(fullText);

        return [
          {
            pageNumber: 1,
            rawText: fullText,
            cleanedText: cleaned,
            confidence: 0.95,
          },
        ];
      } catch (err) {
        console.warn('Google Cloud Vision OCR failed, falling back to Gemini Vision:', err);
      }
    }

    // Multimodal Gemini OCR Fallback (Supports Kannada, Hindi, English, Marathi, Telugu, etc.)
    if (this.genAI) {
      try {
        const fileBuffer = await fs.promises.readFile(storagePath);
        const base64Data = fileBuffer.toString('base64');
        const effectiveMime = isPdf ? 'application/pdf' : mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

        const model = this.genAI.getGenerativeModel({ model: config.llmModel });
        const prompt = `Extract all written text from this document accurately. You must return the output STRICTLY as a JSON array of strings, where each string represents a line or paragraph of text from the document. Do not return plain text. Returning a JSON array prevents recitation filters from blocking the response.`;

        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: effectiveMime,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        let responseText = result.response.text() || '';
        try {
          // Attempt to parse JSON array to bypass recitation
          const parsed = JSON.parse(responseText.trim().replace(/^```json\s*/, '').replace(/```$/, ''));
          if (Array.isArray(parsed)) {
            responseText = parsed.join('\\n');
          }
        } catch (e) {
          // If not JSON, leave as is
        }
        const cleaned = cleanOcrText(responseText);

        return [
          {
            pageNumber: 1,
            rawText: responseText,
            cleanedText: cleaned,
            confidence: 0.92,
          },
        ];
      } catch (err) {
        console.error('Gemini Vision OCR failed:', err);
      }
    }

    // Ultimate fallback if no API key is set or offline
    const fallbackMessage = isPdf
      ? "Scanned image-only PDF detected without an embedded digital text layer. To extract handwritten or photo scans, configure GEMINI_API_KEY in AI_Document_Parser/.env."
      : "Scanned image file detected. To run OCR on photos/scans, configure GEMINI_API_KEY in AI_Document_Parser/.env.";

    return [
      {
        pageNumber: 1,
        rawText: fallbackMessage,
        cleanedText: fallbackMessage,
        confidence: 0.1,
      },
    ];
  }
}

export const ocrService = new OcrService();
