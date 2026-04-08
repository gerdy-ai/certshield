import { PublicUploadPageClient } from '@/components/upload/public-upload-page-client';

export default function PublicUploadPage({
  params,
}: {
  params: { token: string };
}) {
  return <PublicUploadPageClient token={params.token} />;
}
