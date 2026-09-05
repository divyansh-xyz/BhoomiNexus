/**
 * Local PII Redaction utility for Indian Identity documents
 * Scrub sensitive data (Aadhaar, PAN, Phone, Email, Bank Account) prior to LLM submission
 */

export interface PiiRedactionResult {
  redactedText: string;
  redactionCount: number;
  piiDetected: string[];
}

export function redactPii(text: string): PiiRedactionResult {
  if (!text) {
    return { redactedText: '', redactionCount: 0, piiDetected: [] };
  }

  let redactedText = text;
  let count = 0;
  const piiDetectedSet = new Set<string>();

  // 1. Indian Aadhaar Number (12 digits, often formatted as 4-4-4)
  const aadhaarRegex = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  redactedText = redactedText.replace(aadhaarRegex, (match) => {
    count++;
    piiDetectedSet.add('Aadhaar');
    return '[AADHAAR_REDACTED]';
  });

  // 2. Indian PAN Card (5 alpha, 4 numeric, 1 alpha e.g. ABCDE1234F)
  const panRegex = /\b[A-Z]{5}\d{4}[A-Z]\b/gi;
  redactedText = redactedText.replace(panRegex, (match) => {
    count++;
    piiDetectedSet.add('PAN');
    return '[PAN_REDACTED]';
  });

  // 3. Indian Phone Numbers (10 digits starting with 6-9, optional +91 or 0)
  const phoneRegex = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
  redactedText = redactedText.replace(phoneRegex, (match) => {
    count++;
    piiDetectedSet.add('Phone');
    return '[PHONE_REDACTED]';
  });

  // 4. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  redactedText = redactedText.replace(emailRegex, (match) => {
    count++;
    piiDetectedSet.add('Email');
    return '[EMAIL_REDACTED]';
  });

  // 5. Bank Account Numbers (9 to 18 digits with explicit context keyword)
  const bankAccountRegex = /\b(?:A\/C|Account|Acc|A\/c\s*No\.?)\s*:?\s*(\d{9,18})\b/gi;
  redactedText = redactedText.replace(bankAccountRegex, (match, accNum) => {
    count++;
    piiDetectedSet.add('Bank Account');
    return 'Account No: [BANK_ACCOUNT_REDACTED]';
  });

  return {
    redactedText,
    redactionCount: count,
    piiDetected: Array.from(piiDetectedSet),
  };
}
