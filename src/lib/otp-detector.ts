export interface DetectedCode {
  code: string;
  type: 'numeric' | 'alphanumeric';
  context: string;
}

const KEYWORDS = [
  'otp',
  'code',
  'verification',
  'verify',
  'pin',
  'passcode',
  'mã xác minh',
  'mã otp',
  'mã bảo mật',
  'xác thực',
  'mã xác nhận',
  'confirmation',
  'security code',
  'one-time',
  'one time',
  'login code',
  'access code',
  'token',
];

function extractContext(text: string, matchIndex: number, matchLength: number): string {
  const contextRadius = 50;
  const start = Math.max(0, matchIndex - contextRadius);
  const end = Math.min(text.length, matchIndex + matchLength + contextRadius);
  let context = text.slice(start, end).trim();
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  return context;
}

function hasKeywordNearby(text: string, matchIndex: number, matchLength: number): boolean {
  const searchRadius = 100;
  const start = Math.max(0, matchIndex - searchRadius);
  const end = Math.min(text.length, matchIndex + matchLength + searchRadius);
  const surroundingText = text.slice(start, end).toLowerCase();

  return KEYWORDS.some((keyword) => surroundingText.includes(keyword));
}

export function detectCodes(text: string): DetectedCode[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const results: DetectedCode[] = [];
  const seenCodes = new Set<string>();

  function addCode(code: string, type: DetectedCode['type'], matchIndex: number) {
    if (seenCodes.has(code)) return;
    seenCodes.add(code);
    results.push({
      code,
      type,
      context: extractContext(text, matchIndex, code.length),
    });
  }

  // Pattern 1: Standalone prominent codes like "Your code is: 123456" or "Code: ABC123"
  const prominentPattern =
    /(?:code|otp|pin|mã|verification|passcode)\s*(?:is|:|\s)\s*[:\-]?\s*([A-Z0-9]{4,10})/gi;
  let match: RegExpExecArray | null;

  while ((match = prominentPattern.exec(text)) !== null) {
    const code = match[1];
    if (/^\d{4,8}$/.test(code)) {
      addCode(code, 'numeric', match.index + match[0].indexOf(code));
    } else if (/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,10}$/.test(code)) {
      addCode(code, 'alphanumeric', match.index + match[0].indexOf(code));
    }
  }

  // Pattern 2: Numeric codes 4-8 digits near keywords
  const numericPattern = /\b(\d{4,8})\b/g;
  while ((match = numericPattern.exec(text)) !== null) {
    const code = match[1];
    // Skip codes that look like years (1900-2099), timestamps, or common numbers
    if (/^(19|20)\d{2}$/.test(code)) continue;

    if (hasKeywordNearby(text, match.index, code.length)) {
      addCode(code, 'numeric', match.index);
    }
  }

  // Pattern 3: Alphanumeric codes 4-10 chars (must have both letters and digits) near keywords
  const alphanumericPattern = /\b([A-Za-z0-9]{4,10})\b/g;
  while ((match = alphanumericPattern.exec(text)) !== null) {
    const code = match[1];
    // Must contain at least one letter AND at least one digit
    if (!/[A-Za-z]/.test(code) || !/\d/.test(code)) continue;

    if (hasKeywordNearby(text, match.index, code.length)) {
      addCode(code, 'alphanumeric', match.index);
    }
  }

  return results;
}
