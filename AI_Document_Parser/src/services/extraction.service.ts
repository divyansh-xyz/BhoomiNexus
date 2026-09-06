import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { redactPii } from '../utils/piiRedaction.js';

export interface FieldConfidenceMap {
  [fieldPath: string]: 'high' | 'medium' | 'low';
}

export interface StructuredExtractionOutput {
  documentType: string;
  extractedData: Record<string, any>;
  fieldConfidence: FieldConfidenceMap;
  missingFields: string[];
  piiRedactionCount: number;
  piiTypesDetected: string[];
}

export class ExtractionService {
  private genAI: GoogleGenerativeAI | null = null;
  private promptTemplate: string = '';

  constructor() {
    if (config.llmApiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(config.llmApiKey);
      } catch (err) {
        console.warn('Could not initialize GoogleGenerativeAI client:', err);
      }
    }
    this.loadPromptTemplate();
  }

  private loadPromptTemplate() {
    const promptPath = path.join(process.cwd(), 'src', 'prompts', 'landDocumentExtraction.txt');
    try {
      if (fs.existsSync(promptPath)) {
        this.promptTemplate = fs.readFileSync(promptPath, 'utf-8');
      } else {
        console.warn(`Prompt template not found at ${promptPath}`);
      }
    } catch (e) {
      console.warn('Failed to load prompt template:', e);
    }
  }

  public async extractStructuredData(ocrText: string): Promise<StructuredExtractionOutput> {
    // 1. Perform Local PII Redaction
    const piiResult = redactPii(ocrText);
    const textForLlm = piiResult.redactedText;

    if (!this.genAI) {
      // Offline / Fallback extraction if no Gemini key
      return this.fallbackExtraction(ocrText, piiResult.redactionCount, piiResult.piiDetected);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: config.llmModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const fullPrompt = `${this.promptTemplate}\n\nDOCUMENT TEXT TO PROCESS:\n${textForLlm}`;
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();

      // Parse JSON output
      const parsedJson = JSON.parse(responseText.trim().replace(/^```json\s*/, '').replace(/```$/, ''));

      const documentType = parsedJson.document_type || parsedJson.documentType || 'unknown';
      const extractedData = parsedJson.extracted_data || parsedJson.extractedData || {};
      const fieldConfidence = parsedJson.field_confidence || parsedJson.fieldConfidence || {};

      const missingFields = this.calculateMissingFields(documentType, extractedData);

      return {
        documentType,
        extractedData,
        fieldConfidence,
        missingFields,
        piiRedactionCount: piiResult.redactionCount,
        piiTypesDetected: piiResult.piiDetected,
      };
    } catch (err) {
      console.error('Gemini extraction failed, using fallback parser:', err);
      return this.fallbackExtraction(ocrText, piiResult.redactionCount, piiResult.piiDetected);
    }
  }

  private calculateMissingFields(documentType: string, extractedData: Record<string, any>): string[] {
    const missing: string[] = [];

    const requiredByDocType: Record<string, string[]> = {
      sale_deed: ['execution_date', 'seller.name', 'buyer.name', 'property.survey_number', 'transaction.sale_price'],
      gift_deed: ['execution_date', 'seller.name', 'buyer.name', 'property.survey_number'],
      lease_deed: ['execution_date', 'seller.name', 'buyer.name', 'property.survey_number'],
      relinquishment_deed: ['execution_date', 'seller.name', 'buyer.name', 'property.survey_number'],
      mortgage_deed: ['execution_date', 'seller.name', 'buyer.name', 'property.survey_number'],
      partition_deed: ['execution_date', 'property.survey_number'],
      conveyance_deed: ['execution_date', 'seller.name', 'buyer.name', 'property.survey_number'],
      encumbrance_certificate: ['property.survey_number'],
      record_of_rights: ['village', 'survey_number'],
      property_tax_receipt: ['property.survey_number'],
      land_acquisition_notification: ['notification_number', 'village', 'survey_number'],
      award_document: ['award_number', 'compensation_amount', 'village'],
    };

    const requiredFields = requiredByDocType[documentType] || ['survey_number', 'village'];

    for (const fieldPath of requiredFields) {
      const value = this.getNestedValue(extractedData, fieldPath);
      if (value === null || value === undefined || value === '') {
        missing.push(fieldPath);
      }
    }

    return missing;
  }

  private getNestedValue(obj: any, pathStr: string): any {
    const parts = pathStr.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') {
        return null;
      }
      curr = curr[part];
    }
    return curr;
  }

  private fallbackExtraction(
    ocrText: string,
    redactionCount: number,
    piiTypes: string[]
  ): StructuredExtractionOutput {
    // Simple heuristic-based classifier for fallback
    let docType = 'unknown';
    const lowerText = ocrText.toLowerCase();

    if (lowerText.includes('sale deed') || lowerText.includes('absolute sale')) docType = 'sale_deed';
    else if (lowerText.includes('gift deed') || lowerText.includes('danapatra')) docType = 'gift_deed';
    else if (lowerText.includes('lease deed') || lowerText.includes('rent agreement')) docType = 'lease_deed';
    else if (lowerText.includes('relinquishment') || lowerText.includes('release deed')) docType = 'relinquishment_deed';
    else if (lowerText.includes('mortgage') || lowerText.includes('girvi')) docType = 'mortgage_deed';
    else if (lowerText.includes('partition') || lowerText.includes('vibhajan')) docType = 'partition_deed';
    else if (lowerText.includes('encumbrance') || lowerText.includes('form 15')) docType = 'encumbrance_certificate';
    else if (lowerText.includes('record of rights') || lowerText.includes('rtc') || lowerText.includes('7/12')) docType = 'record_of_rights';
    else if (lowerText.includes('tax receipt') || lowerText.includes('property tax')) docType = 'property_tax_receipt';
    else if (lowerText.includes('notification') || lowerText.includes('acquisition')) docType = 'land_acquisition_notification';
    else if (lowerText.includes('award')) docType = 'award_document';

    // Extract survey number regex heuristic
    const surveyMatch = ocrText.match(/\b(?:Survey\s*(?:No|Num|#)?\.?|S\.No\.?)\s*:?\s*(\d+[A-Za-z0-9\/-]*)/i);
    const surveyNumber = surveyMatch ? surveyMatch[1] : null;

    // Extract village heuristic
    const villageMatch = ocrText.match(/\b(?:Village|Mouza|Gram)\s*:?\s*([A-Za-z\s]+)\b/i);
    const village = villageMatch ? villageMatch[1].trim() : null;

    // Extract ULPIN heuristic
    const ulpinMatch = ocrText.match(/\b[A-Z0-9]{10,14}\b/);
    const ulpin = ulpinMatch ? ulpinMatch[0] : null;

    return {
      documentType: docType,
      extractedData: {
        survey_number: surveyNumber,
        village: village,
        ulpin: ulpin,
        raw_text_summary: ocrText.slice(0, 300),
      },
      fieldConfidence: {
        survey_number: surveyNumber ? 'medium' : 'low',
        village: village ? 'medium' : 'low',
      },
      missingFields: surveyNumber ? [] : ['survey_number'],
      piiRedactionCount: redactionCount,
      piiTypesDetected: piiTypes,
    };
  }
}

export const extractionService = new ExtractionService();
