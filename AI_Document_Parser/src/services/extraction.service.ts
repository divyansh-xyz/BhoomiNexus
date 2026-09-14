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
    const candidatePaths = [
      path.join(process.cwd(), 'src', 'prompts', 'landDocumentExtraction.txt'),
      path.join(process.cwd(), 'AI_Document_Parser', 'src', 'prompts', 'landDocumentExtraction.txt'),
      path.join(__dirname, '../prompts/landDocumentExtraction.txt'),
      path.join(__dirname, '../../src/prompts/landDocumentExtraction.txt'),
      path.join(__dirname, '../../../src/prompts/landDocumentExtraction.txt'),
    ];
    for (const promptPath of candidatePaths) {
      try {
        if (fs.existsSync(promptPath)) {
          this.promptTemplate = fs.readFileSync(promptPath, 'utf-8');
          console.log(`[ExtractionService] Loaded prompt template from ${promptPath}`);
          return;
        }
      } catch (e) {}
    }
    console.warn('[ExtractionService] Prompt template not found in candidate paths');
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

  public async extractStructuredFromFile(filePath: string, mimeType: string): Promise<StructuredExtractionOutput> {
    if (!this.genAI) {
      return this.fallbackExtraction('', 0, []);
    }
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      const base64Data = fileBuffer.toString('base64');
      const isPdf = mimeType.toLowerCase() === 'application/pdf' || filePath.endsWith('.pdf');
      const effectiveMime = isPdf ? 'application/pdf' : mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

      const model = this.genAI.getGenerativeModel({
        model: config.llmModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `You are an expert land acquisition and statutory document intelligence AI.
Analyze the provided document (scanned image or PDF) and extract all factual land parameters, entities, and values into structured JSON.
Return JSON with the following schema:
{
  "document_type": string (e.g. "valuation_ledger", "gazette", "sale_deed", "land_record", "panchnama", etc.),
  "extracted_data": {
    "khasraNumber": string or null,
    "khatauniNumber": string or null,
    "villageName": string or null,
    "district": string or null,
    "state": string or null,
    "totalLandAreaAcres": string or number or null,
    "recordedOwner": string or null,
    "statutoryTenure": string or null,
    "valuationAmountInr": string or number or null,
    "gazetteNotificationNumber": string or null,
    "notificationDate": string or null,
    "remarks": string or null
  },
  "field_confidence": {
    "khasraNumber": "high" | "medium" | "low",
    "villageName": "high" | "medium" | "low",
    "recordedOwner": "high" | "medium" | "low"
  },
  "missing_fields": []
}
Extract only explicitly visible information. If any field is not found in the document, omit it or set it to null.`;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: effectiveMime,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      let responseText = '';
      try {
        responseText = result.response.text();
      } catch (err) {
        const candidateParts = result.response?.candidates?.[0]?.content?.parts || [];
        responseText = candidateParts.map((p: any) => p.text || '').filter(Boolean).join('\n');
      }

      const parsedJson = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/```$/, ''));
      const documentType = parsedJson.document_type || parsedJson.documentType || 'statutory_document';
      const extractedData = parsedJson.extracted_data || parsedJson.extractedData || parsedJson;
      delete extractedData.document_type;
      delete extractedData.documentType;

      const fieldConfidence: FieldConfidenceMap = parsedJson.field_confidence || parsedJson.fieldConfidence || {};
      for (const k of Object.keys(extractedData)) {
        if (!fieldConfidence[k]) fieldConfidence[k] = 'high';
      }

      return {
        documentType,
        extractedData,
        fieldConfidence,
        missingFields: parsedJson.missing_fields || [],
        piiRedactionCount: 0,
        piiTypesDetected: [],
      };
    } catch (err) {
      console.error('[ExtractionService] Direct multimodal extraction failed:', err);
      return this.fallbackExtraction('', 0, []);
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
    const surveyMatch = ocrText.match(/\b(?:Survey\s*(?:No|Num|Number|#)?\.?|S\.No\.?|Khasra\s*(?:No)?\.?)\s*[:\-]?\s*([A-Za-z0-9\/\-_]+)/i);
    const surveyNumber = surveyMatch ? surveyMatch[1].trim() : null;

    // Extract village heuristic
    const villageMatch = ocrText.match(/\b(?:Village|Mouza|Gram|Village\s*Name)\s*[:\-]?\s*([A-Za-z0-9\s,\-]+?)(?:,|\n|\r|District|Dist|Taluk|Tehsil|$)/i);
    const village = villageMatch ? villageMatch[1].trim() : null;

    // District heuristic
    const distMatch = ocrText.match(/\b(?:District|Dist\.?)\s*[:\-]?\s*([A-Za-z\s]+?)(?:,|\n|\r|State|$)/i);
    const district = distMatch ? distMatch[1].trim() : null;

    // State heuristic
    const stateMatch = ocrText.match(/\b(?:State\s*[:\-]?\s*([A-Za-z\s]+?)(?:,|\n|\r|$)|(Karnataka|Maharashtra|Gujarat|Tamil\s*Nadu|Uttar\s*Pradesh|Rajasthan|Kerala|Telangana|Andhra\s*Pradesh|Haryana|Punjab|Bihar|West\s*Bengal|Odisha|Madhya\s*Pradesh|Goa|Assam))\b/i);
    const state = stateMatch ? (stateMatch[1] || stateMatch[2] || '').trim() : null;

    // Area / Extent heuristic
    const areaMatch = ocrText.match(/\b(?:Area|Extent|Measurement)\s*[:\-]?\s*([0-9\.]+\s*(?:Acres?|Hectares?|Hec\.?|Sq\.?\s*(?:Meters?|Metres?|Yards?|Ft)|Guntas?))/i);
    const area = areaMatch ? areaMatch[1].trim() : null;

    // Land Classification heuristic
    const classMatch = ocrText.match(/\b(?:Land\s*Classification|Land\s*Type|Classification)\s*[:\-]?\s*([A-Za-z0-9\s\(\)\/\-]+?)(?:,|\n|\r|$)/i);
    const landClassification = classMatch ? classMatch[1].trim() : null;

    // Notification Number heuristic
    const notifMatch = ocrText.match(/\b(?:Notification\s*(?:No|Number|#)?\.?|Gazette\s*(?:Notification|Ref)?\.?|Order\s*(?:No)?\.?|Ref\s*(?:No)?\.?)\s*[:\-]?\s*([A-Za-z0-9\/\-_]+)/i);
    const notificationNo = notifMatch ? notifMatch[1].trim() : null;

    // Date heuristic
    const dateMatch = ocrText.match(/\b(?:Dated?|Date\s*of\s*(?:Notification|Issue|Execution)|Execution\s*Date)\s*[:\-]?\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
    const notificationDate = dateMatch ? dateMatch[1].trim() : null;

    // Khatedar Owner heuristic
    const ownerMatch = ocrText.match(/\b(?:Owner|Khatedar|Landowner|Land\s*Owner|Purchaser|In\s*favour\s*of|Vendor|Seller)\s*[:\-]?\s*([A-Za-z\s\.\&]+?)(?:,|\n|\r|Address|S\/o|W\/o|D\/o|$)/i);
    const khatedarOwner = ownerMatch ? ownerMatch[1].trim() : null;

    // Statutory Authority heuristic
    const authMatch = ocrText.match(/\b(Competent\s*Authority(?:\s*for\s*Land\s*Acquisition)?|Special\s*Land\s*Acquisition\s*Officer|SLAO|CALA|Revenue\s*Divisional\s*Officer|SDO|District\s*Collector|Tahsildar|Sub-Divisional\s*Magistrate)\b/i);
    const statutoryAuthority = authMatch ? authMatch[1].trim() : null;

    // Extract ULPIN heuristic
    const ulpinMatch = ocrText.match(/\b[A-Z0-9]{10,14}\b/);
    const ulpin = ulpinMatch ? ulpinMatch[0] : null;

    const extractedData: Record<string, any> = {
      ...(surveyNumber ? { surveyNumber, survey_number: surveyNumber } : {}),
      ...(village ? { village } : {}),
      ...(district ? { district } : {}),
      ...(state ? { state } : {}),
      ...(area ? { area } : {}),
      ...(landClassification ? { landClassification } : {}),
      ...(khatedarOwner ? { khatedarOwner } : {}),
      ...(notificationNo ? { notificationNo, notification_number: notificationNo } : {}),
      ...(notificationDate ? { notificationDate } : {}),
      ...(statutoryAuthority ? { statutoryAuthority } : {}),
      ...(ulpin ? { ulpin } : {}),
      raw_text_summary: ocrText.slice(0, 300),
    };

    const fieldConfidence: Record<string, any> = {};
    for (const key of Object.keys(extractedData)) {
      if (key !== 'raw_text_summary') {
        fieldConfidence[key] = 95;
      }
    }

    return {
      documentType: docType,
      extractedData,
      fieldConfidence,
      missingFields: surveyNumber ? [] : ['survey_number'],
      piiRedactionCount: redactionCount,
      piiTypesDetected: piiTypes,
    };
  }
}

export const extractionService = new ExtractionService();
