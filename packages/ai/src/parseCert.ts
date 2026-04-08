import type { ParsedCertFields } from '@certshield/shared/types';

export interface ParseCertificateInput {
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

export interface ParseCertificateResult {
  success: boolean;
  fields: ParsedCertFields;
  rawText: string;
  warnings: string[];
  error: string | null;
}

type ParsedFieldKey = keyof ParsedCertFields;

const emptyFields: ParsedCertFields = {
  insurer_name: null,
  policy_number: null,
  policy_type: null,
  coverage_amount: null,
  effective_date: null,
  expiration_date: null,
  certificate_holder: null,
  additional_insured: null,
};

const monthIndexByName = new Map<string, number>([
  ['jan', 0],
  ['january', 0],
  ['feb', 1],
  ['february', 1],
  ['mar', 2],
  ['march', 2],
  ['apr', 3],
  ['april', 3],
  ['may', 4],
  ['jun', 5],
  ['june', 5],
  ['jul', 6],
  ['july', 6],
  ['aug', 7],
  ['august', 7],
  ['sep', 8],
  ['sept', 8],
  ['september', 8],
  ['oct', 9],
  ['october', 9],
  ['nov', 10],
  ['november', 10],
  ['dec', 11],
  ['december', 11],
]);

function createFailure(error: string, rawText = '', warnings: string[] = []): ParseCertificateResult {
  return {
    success: false,
    fields: { ...emptyFields },
    rawText,
    warnings,
    error,
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeBytes(bytes: ArrayBuffer): string {
  const uint8 = new Uint8Array(bytes);

  try {
    return new TextDecoder('windows-1252').decode(uint8);
  } catch {
    return new TextDecoder().decode(uint8);
  }
}

function unescapePdfString(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_match, escaped: string) => {
      if (escaped === 'n') return '\n';
      if (escaped === 'r') return '\r';
      if (escaped === 't') return '\t';
      if (escaped === 'b') return '\b';
      if (escaped === 'f') return '\f';
      return escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function extractParenthesizedPdfText(decoded: string): string {
  const matches = decoded.match(/\((?:\\.|[^\\)])*\)/g) ?? [];
  const fragments = matches
    .map((match) => unescapePdfString(match.slice(1, -1)))
    .map(normalizeWhitespace)
    .filter((fragment) => /[A-Za-z0-9]/.test(fragment))
    .filter((fragment) => fragment.length > 1);

  return fragments.join('\n');
}

function extractLiteralText(decoded: string): string {
  const textLikeLines = decoded
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' '))
    .map(normalizeWhitespace)
    .filter((line) => line.length > 3)
    .filter((line) => /[A-Za-z]/.test(line))
    .filter((line) => !/^(endobj|stream|endstream|xref|trailer|startxref|\d+\s+\d+\s+obj)$/i.test(line));

  return textLikeLines.join('\n');
}

export function extractTextFromPdfBytes(bytes: ArrayBuffer): { rawText: string; warnings: string[] } {
  const decoded = decodeBytes(bytes);
  const warnings: string[] = [];

  if (!decoded.startsWith('%PDF')) {
    warnings.push('File does not start with a PDF header.');
  }

  const parenthesizedText = extractParenthesizedPdfText(decoded);
  const literalText = extractLiteralText(decoded);
  const rawText = normalizeMultilineText([parenthesizedText, literalText].filter(Boolean).join('\n'));

  if (!rawText) {
    warnings.push('No embedded text could be extracted. The PDF may be scanned, encrypted, or compressed.');
  }

  return {
    rawText,
    warnings,
  };
}

function pickFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1];

    if (value) {
      return normalizeWhitespace(value);
    }
  }

  return null;
}

function toIsoDate(month: number, day: number, year: number): string | null {
  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);

  if (numeric?.[1] && numeric[2] && numeric[3]) {
    return toIsoDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
  }

  const named = value.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  const monthName = named?.[1]?.toLowerCase();
  const monthIndex = monthName ? monthIndexByName.get(monthName) : undefined;

  if (monthIndex !== undefined && named?.[2] && named[3]) {
    return toIsoDate(monthIndex + 1, Number(named[2]), Number(named[3]));
  }

  return null;
}

function parseMoney(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const amount = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(amount) ? amount : null;
}

function detectPolicyType(text: string): string | null {
  const policyTypes = [
    'General Liability',
    'Workers Compensation',
    'Workers Comp',
    'Automobile Liability',
    'Auto Liability',
    'Umbrella Liability',
    'Excess Liability',
    'Professional Liability',
  ];
  const lowerText = text.toLowerCase();
  const match = policyTypes.find((policyType) => lowerText.includes(policyType.toLowerCase()));

  if (!match) {
    return null;
  }

  return match === 'Workers Comp' ? 'Workers Compensation' : match;
}

function detectAdditionalInsured(text: string): boolean | null {
  const lowerText = text.toLowerCase();

  if (/additional insured[^.\n]*(no|n\/a|not included|does not apply|not applicable)/i.test(text)) {
    return false;
  }

  if (/additional insured[^.\n]*(yes|y|x|included|applies)/i.test(text)) {
    return true;
  }

  return null;
}

function hasAnyParsedField(fields: ParsedCertFields): boolean {
  return (Object.keys(fields) as ParsedFieldKey[]).some((key) => fields[key] !== null);
}

export function parseCertificateText(text: string): ParsedCertFields {
  const insurerName = pickFirstMatch(text, [
    /(?:insurer(?:\s+[a-z])?|company|insurance company)\s*[:#-]\s*([^\n]{2,120})/i,
    /(?:insurer(?:\s+[a-z])?)\s*\n\s*([^\n]{2,120})/i,
  ]);
  const policyNumber = pickFirstMatch(text, [
    /(?:policy|pol)\s*(?:number|no|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{2,60})/i,
    /\bpolicy\s+([A-Z0-9][A-Z0-9-]{2,60})\b/i,
  ]);
  const effectiveDate = parseDate(
    pickFirstMatch(text, [
      /(?:effective|eff)\s*(?:date)?\s*[:#-]?\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ]),
  );
  const expirationDate = parseDate(
    pickFirstMatch(text, [
      /(?:expiration|expiry|exp)\s*(?:date)?\s*[:#-]?\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ]),
  );
  const coverageAmount = parseMoney(
    pickFirstMatch(text, [
      /(?:each occurrence|general aggregate|coverage amount|limit)\s*[:#-]?\s*(\$?\s?\d[\d,\s]*(?:\.\d{2})?)/i,
    ]),
  );
  const certificateHolder = pickFirstMatch(text, [
    /certificate holder\s*[:#-]\s*([^\n]{2,160})/i,
    /certificate holder\s*\n\s*([^\n]{2,160})/i,
  ]);

  return {
    insurer_name: insurerName,
    policy_number: policyNumber,
    policy_type: detectPolicyType(text),
    coverage_amount: coverageAmount,
    effective_date: effectiveDate,
    expiration_date: expirationDate,
    certificate_holder: certificateHolder,
    additional_insured: detectAdditionalInsured(text),
  };
}

export async function parseCertificatePdf(
  input: ParseCertificateInput,
): Promise<ParseCertificateResult> {
  if (input.mimeType !== 'application/pdf') {
    return createFailure(`Unsupported certificate MIME type: ${input.mimeType}.`);
  }

  if (input.bytes.byteLength === 0) {
    return createFailure('Certificate PDF is empty.');
  }

  const { rawText, warnings } = extractTextFromPdfBytes(input.bytes);

  if (!rawText) {
    return createFailure('Unable to extract text from certificate PDF.', rawText, warnings);
  }

  const fields = parseCertificateText(rawText);

  if (!hasAnyParsedField(fields)) {
    return createFailure('No certificate fields could be parsed from extracted text.', rawText, warnings);
  }

  return {
    success: true,
    fields,
    rawText,
    warnings,
    error: null,
  };
}
