import { auth } from '@clerk/nextjs/server';

export async function getAuthOrg(): Promise<{ userId: string; orgId: string }> {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return { userId, orgId };
}
