import type { ParsedCertFields } from '@certshield/shared/types';

export interface ParseCertificateInput {
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

export interface ParseCertificateResult {
  fields: ParsedCertFields;
  rawText: string;
}

export async function parseCertificatePdf(
  _input: ParseCertificateInput,
): Promise<ParseCertificateResult> {
  return {
    fields: {
      insurer_name: null,
      policy_number: null,
      policy_type: null,
      coverage_amount: null,
      effective_date: null,
      expiration_date: null,
      certificate_holder: null,
      additional_insured: null,
    },
    rawText: '',
  };
}

