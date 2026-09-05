import { describe, it, expect } from 'vitest';
import { redactPii } from '../src/utils/piiRedaction.js';
import { cleanOcrText } from '../src/utils/textCleaning.js';
import { validationService } from '../src/services/validation.service.js';

describe('Document Intelligence Utilities & Services', () => {
  it('should redact Aadhaar, PAN, and Phone numbers accurately', () => {
    const raw = 'Seller Aadhaar: 4567 8901 2345, PAN: ABCDE1234F, Phone: 9876543210.';
    const result = redactPii(raw);

    expect(result.redactedText).toContain('[AADHAAR_REDACTED]');
    expect(result.redactedText).toContain('[PAN_REDACTED]');
    expect(result.redactedText).toContain('[PHONE_REDACTED]');
    expect(result.redactionCount).toBe(3);
  });

  it('should clean null bytes and extra whitespace from OCR text', () => {
    const noisy = 'DEED   OF   SALE\u0000\nNULL  NULL\n\nSurvey No: 42';
    const cleaned = cleanOcrText(noisy);

    expect(cleaned).not.toContain('\u0000');
    expect(cleaned).toContain('DEED OF SALE');
  });

  it('should validate land area and financial amounts', () => {
    const summary = validationService.validate('sale_deed', {
      land_area: -5,
      compensation_amount: 100000,
    });

    expect(summary.isValid).toBe(false);
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.errors[0].field).toBe('land_area');
  });
});
