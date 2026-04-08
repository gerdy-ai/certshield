import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthenticatedAppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { orgId } = await auth();

  return <AppShell organizationId={orgId ?? null}>{children}</AppShell>;
}
