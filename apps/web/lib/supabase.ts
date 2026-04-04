import { auth } from '@clerk/nextjs/server';
import { createUserClient as createDbUserClient } from '@certshield/db/client';

export async function createUserClient() {
  const { userId, getToken } = await auth();

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const token = await getToken();

  if (!token) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return createDbUserClient(token);
}
