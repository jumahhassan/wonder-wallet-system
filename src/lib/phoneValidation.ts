export type MobileOperator = 'mtn' | 'digitel' | 'zain';

export const MOBILE_OPERATORS: { value: MobileOperator; label: string }[] = [
  { value: 'mtn', label: 'MTN' },
  { value: 'digitel', label: 'Digitel' },
  { value: 'zain', label: 'Zain' },
];

export const OPERATOR_PREFIXES: Record<MobileOperator, { local: string; international: string }> = {
  mtn: { local: '092', international: '+21192' },
  digitel: { local: '098', international: '+21198' },
  zain: { local: '091', international: '+21191' },
};

/**
 * Validates if a phone number matches the expected prefix for a mobile operator
 */
export function validatePhonePrefix(phone: string, operator: MobileOperator): { valid: boolean; error?: string } {
  if (!phone) return { valid: true }; // Allow empty while typing
  
  const { local, international } = OPERATOR_PREFIXES[operator];
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Check if starting with + (international format)
  if (cleanPhone.startsWith('+')) {
    if (!cleanPhone.startsWith(international)) {
      return {
        valid: false,
        error: `${MOBILE_OPERATORS.find(o => o.value === operator)?.label} numbers must start with ${local} or ${international}`,
      };
    }
    // Check length for international format (+211 + 9 digits = 13 chars)
    if (cleanPhone.length > 13) {
      return { valid: false, error: 'Phone number is too long' };
    }
  } else {
    // Local format
    if (!cleanPhone.startsWith(local.substring(0, Math.min(cleanPhone.length, local.length)))) {
      // Only show error if they've typed enough to know it's wrong
      if (cleanPhone.length >= 2) {
        return {
          valid: false,
          error: `${MOBILE_OPERATORS.find(o => o.value === operator)?.label} numbers must start with ${local} or ${international}`,
        };
      }
    }
    // Check length for local format (10 digits)
    if (cleanPhone.length > 10) {
      return { valid: false, error: 'Phone number is too long' };
    }
  }
  
  return { valid: true };
}

/**
 * Real-time validation that checks prefix progressively as user types
 */
export function validatePhonePrefixRealtime(phone: string, operator: MobileOperator): { valid: boolean; warning?: string } {
  if (!phone || !operator) return { valid: true };
  
  const { local, international } = OPERATOR_PREFIXES[operator];
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // If starting with +, check international prefix
  if (cleanPhone.startsWith('+')) {
    const expectedPrefix = international;
    const typedLength = cleanPhone.length;
    const expectedChars = expectedPrefix.substring(0, typedLength);
    
    if (!cleanPhone.startsWith(expectedChars) && typedLength <= expectedPrefix.length) {
      return {
        valid: false,
        warning: `Invalid prefix for ${MOBILE_OPERATORS.find(o => o.value === operator)?.label}. Expected: ${international}`,
      };
    }
  } else {
    // Check local prefix
    const expectedPrefix = local;
    const typedLength = cleanPhone.length;
    
    if (typedLength >= 1) {
      const expectedChars = expectedPrefix.substring(0, Math.min(typedLength, expectedPrefix.length));
      const typedChars = cleanPhone.substring(0, Math.min(typedLength, expectedPrefix.length));
      
      if (typedChars !== expectedChars) {
        return {
          valid: false,
          warning: `Invalid prefix for ${MOBILE_OPERATORS.find(o => o.value === operator)?.label}. Expected: ${local} or ${international}`,
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  if (cleanPhone.startsWith('+')) {
    // International: +211 92 XXX XXXX
    if (cleanPhone.length > 4) {
      return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4, 6)} ${cleanPhone.slice(6, 9)} ${cleanPhone.slice(9)}`.trim();
    }
    return cleanPhone;
  }
  
  // Local: 092 XXX XXXX
  if (cleanPhone.length > 3) {
    return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`.trim();
  }
  return cleanPhone;
}

/**
 * Check if phone number is complete and valid
 */
export function isPhoneComplete(phone: string, operator: MobileOperator): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const { local, international } = OPERATOR_PREFIXES[operator];
  
  if (cleanPhone.startsWith('+')) {
    return cleanPhone.length === 13 && cleanPhone.startsWith(international);
  }
  
  return cleanPhone.length === 10 && cleanPhone.startsWith(local);
}
