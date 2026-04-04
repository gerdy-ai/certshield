import { randomUUID } from 'crypto';
import { z } from 'zod';
import { inngest } from '@certshield/jobs';
import { error as errorResponse } from '@/lib/api-response';
import { formatZodError, handleRouteError } from '@/lib/api-route';
import { createServiceRoleClient } from '@/lib/supabase';

const paramsSchema = z.object({
  token: z.string().uuid(),
});

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const PDF_MAGIC_BYTES = Buffer.from('%PDF');
const uploadRateLimitStore = new Map<string, number[]>();

interface SubcontractorUploadRow {
  id: string;
  org_id: string;
}

function enforceRateLimit(token: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const attempts = uploadRateLimitStore.get(token) ?? [];
  const recentAttempts = attempts.filter((timestamp) => timestamp > windowStart);

  if (recentAttempts.length >= RATE_LIMIT_MAX_REQUESTS) {
    uploadRateLimitStore.set(token, recentAttempts);
    return false;
  }

  recentAttempts.push(now);
  uploadRateLimitStore.set(token, recentAttempts);
  return true;
}

function isPdfFile(file: File, bytes: Buffer): boolean {
  return file.type === 'application/pdf' && bytes.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
}

export async function POST(
  request: Request,
  context: { params: { token: string } },
): Promise<Response> {
  try {
    const parsedParams = paramsSchema.safeParse(context.params);

    if (!parsedParams.success) {
      return errorResponse(formatZodError(parsedParams.error), 'VALIDATION_ERROR', 400);
    }

    const token = parsedParams.data.token;
    const requestContentType = request.headers.get('content-type') ?? '';

    if (!requestContentType.toLowerCase().includes('multipart/form-data')) {
      return errorResponse('Content-Type must be multipart/form-data.', 'VALIDATION_ERROR', 400);
    }

    if (!enforceRateLimit(token)) {
      return errorResponse('Rate limit exceeded.', 'RATE_LIMITED', 429);
    }

    const formData = await request.formData().catch(() => null);
    const fileEntry = formData?.get('file');

    if (!(fileEntry instanceof File)) {
      return errorResponse('A PDF file is required.', 'VALIDATION_ERROR', 400);
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse('File size must be under 10MB.', 'VALIDATION_ERROR', 400);
    }

    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());

    if (!isPdfFile(fileEntry, fileBuffer)) {
      return errorResponse('File must be a valid PDF.', 'VALIDATION_ERROR', 400);
    }

    const supabase = createServiceRoleClient();
    const { data: subcontractor, error: subcontractorError } = await supabase
      .from('subcontractors')
      .select('id, org_id')
      .eq('upload_token', token)
      .is('deleted_at', null)
      .single();

    if (subcontractorError) {
      if (subcontractorError.code === 'PGRST116') {
        return errorResponse('Upload link is invalid.', 'NOT_FOUND', 404);
      }

      throw subcontractorError;
    }

    const subcontractorRow = subcontractor as SubcontractorUploadRow;
    const fileId = randomUUID();
    const filePath = `${subcontractorRow.org_id}/${subcontractorRow.id}/${fileId}.pdf`;
    const { error: storageError } = await supabase.storage
      .from('certs')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (storageError) {
      throw storageError;
    }

    const { data: certificate, error: insertError } = await supabase
      .from('certificates')
      .insert({
        subcontractor_id: subcontractorRow.id,
        org_id: subcontractorRow.org_id,
        file_path: filePath,
        file_name: fileEntry.name || `${fileId}.pdf`,
        file_size_bytes: fileEntry.size,
        parse_status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !certificate) {
      await supabase.storage.from('certs').remove([filePath]);
      throw insertError ?? new Error('Failed to create certificate.');
    }

    await inngest.send({
      name: 'cert/uploaded',
      data: {
        certificateId: certificate.id,
      },
    });

    return Response.json({ success: true, message: 'Certificate received' });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
