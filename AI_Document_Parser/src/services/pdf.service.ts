import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

export class PdfService {
  public async extractText(filePath: string): Promise<PdfPageText[]> {
    const fileBuffer = await fs.promises.readFile(filePath);
    try {
      const data = await pdfParse(fileBuffer);
      // pdf-parse provides overall text and page count
      // Return single page or basic page splitting
      const rawText = data.text || '';
      
      // Simple page splitting if page markers are present or return as page 1
      const pagesText: PdfPageText[] = [
        {
          pageNumber: 1,
          text: rawText,
        },
      ];

      return pagesText;
    } catch (err) {
      console.warn('pdf-parse failed, returning raw fallback:', err);
      return [{ pageNumber: 1, text: '' }];
    }
  }
}

export const pdfService = new PdfService();
