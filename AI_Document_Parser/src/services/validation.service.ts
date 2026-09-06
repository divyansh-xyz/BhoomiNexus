export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationSummary {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class ValidationService {
  public validate(documentType: string, data: Record<string, any>): ValidationSummary {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Helper for nested value lookup
    const getVal = (pathStr: string) => {
      const parts = pathStr.split('.');
      let curr = data;
      for (const p of parts) {
        if (!curr || typeof curr !== 'object') return undefined;
        curr = curr[p];
      }
      return curr;
    };

    // 1. Numeric Range Checks
    const area = getVal('land_area') || getVal('property.area');
    if (area !== undefined && area !== null) {
      const numArea = Number(area);
      if (isNaN(numArea) || numArea <= 0) {
        errors.push({ field: 'land_area', message: 'Land area must be greater than zero.', severity: 'error' });
      }
    }

    const comp = getVal('compensation_amount') || getVal('transaction.sale_price');
    if (comp !== undefined && comp !== null) {
      const numComp = Number(comp);
      if (isNaN(numComp) || numComp <= 0) {
        errors.push({ field: 'compensation_amount', message: 'Financial amount must be greater than zero.', severity: 'error' });
      }
    }

    // 2. Date Chronology Checks
    const notifDate = getVal('notification_date');
    const awardDate = getVal('award_date');
    if (notifDate && awardDate) {
      if (new Date(String(notifDate)) > new Date(String(awardDate))) {
        errors.push({
          field: 'award_date',
          message: 'Award date cannot precede Notification date.',
          severity: 'error',
        });
      }
    }

    const execDate = getVal('execution_date');
    const txnDate = getVal('transaction.transaction_date');
    if (execDate && txnDate) {
      if (new Date(String(execDate)) > new Date(String(txnDate))) {
        warnings.push({
          field: 'transaction_date',
          message: 'Transaction date is after execution date.',
          severity: 'warning',
        });
      }
    }

    // 3. Survey Number Validation
    const surveyNo = getVal('survey_number') || getVal('property.survey_number');
    if (!surveyNo) {
      warnings.push({
        field: 'survey_number',
        message: 'Survey number is missing, required for parcel GIS matching.',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const validationService = new ValidationService();
