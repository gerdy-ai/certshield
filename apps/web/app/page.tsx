import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="surface-card app-shell-shadow w-full max-w-4xl overflow-hidden">
        <div className="grid gap-10 p-8 lg:grid-cols-[1.3fr_0.7fr] lg:p-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Shield Teal workspace foundation
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              CertShield is ready for authenticated product pages.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              The frontend foundation now includes the production app shell, theme
              tokens, and shared providers. Feature pages can build on top of the
              protected dashboard layout at <span className="font-medium text-foreground">/dashboard</span>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">View app shell</Link>
              </Button>
            </div>
          </div>
          <div className="surface-subtle p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
              Included in F1/F2
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>Inter font and semantic Tailwind theme tokens</li>
              <li>8 / 12 / 20px radius system and base surface styles</li>
              <li>Clerk + React Query providers wired at the app root</li>
              <li>Reusable authenticated sidebar and top bar primitives</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
