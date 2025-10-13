export function getOppositeSite(site: string): string {
  const oppositePairs: Record<string, string> = {
    'Left Glute': 'Right Glute',
    'Right Glute': 'Left Glute',
    'Left Delt': 'Right Delt',
    'Right Delt': 'Left Delt',
    'Left Thigh': 'Right Thigh',
    'Right Thigh': 'Left Thigh',
    'Left Arm': 'Right Arm',
    'Right Arm': 'Left Arm',
    'Abdomen': 'Abdomen'
  };
  return oppositePairs[site] || site;
}

/**
 * Normalizes a number string to use period as decimal separator
 * Handles different regional formats (comma vs period)
 * @param value - The string value to normalize
 * @returns A normalized string with period as decimal separator
 */
export function normalizeNumberInput(value: string): string {
  if (!value || typeof value !== 'string') return value;
  
  // Remove spaces
  let normalized = value.trim();
  
  // If there are both comma and period, assume comma is thousands separator
  if (normalized.includes(',') && normalized.includes('.')) {
    // Remove commas (thousands separator)
    normalized = normalized.replace(/,/g, '');
  } 
  // If only comma exists, it's the decimal separator (European format)
  else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  
  return normalized;
}

/**
 * Parses a number from a string, handling different regional formats
 * @param value - The string value to parse
 * @returns The parsed number, or NaN if invalid
 */
export function parseLocalizedNumber(value: string): number {
  const normalized = normalizeNumberInput(value);
  return parseFloat(normalized);
}

// Default export to satisfy React component requirements
export default {
  getOppositeSite,
  normalizeNumberInput,
  parseLocalizedNumber,
}; 