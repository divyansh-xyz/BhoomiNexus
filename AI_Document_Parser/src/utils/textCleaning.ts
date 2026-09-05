/**
 * Utility functions for text cleaning and OCR artifact removal
 */

export function cleanOcrText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove null bytes and repeated NULL tokens
  cleaned = cleaned.replace(/\u0000/g, '');
  cleaned = cleaned.replace(/\b(NULL|null|None|N\/A)\b/gi, ' ');

  // Remove common OCR control characters
  cleaned = cleaned.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize Unicode spaces
  cleaned = cleaned.replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ');

  // Fix multiple spaces and blank lines
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

export function deduplicateParagraphs(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const uniqueLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && seen.has(trimmed)) {
      continue; // Skip exact duplicate longer sentences
    }
    if (trimmed.length > 10) {
      seen.add(trimmed);
    }
    uniqueLines.push(line);
  }

  return uniqueLines.join('\n');
}
