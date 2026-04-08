'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import {
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AppShellContextValue = {
  closeMobileNav: () => void;
  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/subcontractors', label: 'Subcontractors', icon: Users, disabled: true },
  { href: '/certificates', label: 'Certificates', icon: ShieldCheck, disabled: true },
  { href: '/reminders', label: 'Reminders', icon: Bell, disabled: true },
  { href: '/billing', label: 'Billing', icon: CreditCard, disabled: true },
  { href: '/settings', label: 'Settings', icon: Settings, disabled: true },
];

function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error('useAppShell must be used within AppShell');
  }

  return context;
}

function AppSidebar({ organizationId }: { organizationId: string | null }) {
  const pathname = usePathname();
  const { closeMobileNav } = useAppShell();

  return (
    <aside className="flex h-full w-full max-w-[272px] flex-col border-r border-sidebar-border bg-[hsl(var(--sidebar-background))]">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link className="flex items-center gap-3" href="/dashboard" onClick={closeMobileNav}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight text-sidebar-foreground">
              CertShield
            </span>
            <span className="block text-sm text-muted-foreground">
              COI tracking workspace
            </span>
          </span>
        </Link>
      </div>

      <div className="border-b border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3 rounded-md border bg-white/70 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {organizationId ?? 'Select organization'}
            </p>
            <div className="mt-1">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    organizationSwitcherTrigger:
                      'min-h-0 min-w-0 p-0 text-xs text-muted-foreground shadow-none',
                  },
                }}
                hidePersonal
              />
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navigation.map(({ href, label, icon: Icon, disabled }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-disabled={disabled}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-white/80',
                disabled && 'pointer-events-none opacity-55',
              )}
              onClick={closeMobileNav}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              {disabled ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]',
                    active ? 'bg-white/20 text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 text-xs leading-5 text-muted-foreground">
        Shared shell primitives live here so dashboard and management pages can reuse the
        same structure.
      </div>
    </aside>
  );
}

function AppTopBar() {
  const { mobileNavOpen, toggleMobileNav } = useAppShell();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Button
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          className="md:hidden"
          size="sm"
          variant="outline"
          onClick={toggleMobileNav}
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        <div>
          <p className="text-sm font-medium text-foreground">Workspace</p>
          <p className="text-xs text-muted-foreground">
            Authenticated shell for operations pages
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden rounded-full border bg-white/80 px-3 py-1.5 text-xs text-muted-foreground sm:block">
          Next milestone: dashboard overview
        </div>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: 'h-9 w-9',
            },
          }}
          afterSignOutUrl="/"
        />
      </div>
    </header>
  );
}

export function AppShell({
  children,
  organizationId,
}: {
  children: ReactNode;
  organizationId: string | null;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const value = useMemo(
    () => ({
      mobileNavOpen,
      toggleMobileNav: () => setMobileNavOpen((open) => !open),
      closeMobileNav: () => setMobileNavOpen(false),
    }),
    [mobileNavOpen],
  );

  return (
    <AppShellContext.Provider value={value}>
      <div className="min-h-screen md:grid md:grid-cols-[272px_1fr]">
        <div className="hidden md:block">
          <AppSidebar organizationId={organizationId} />
        </div>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <button
              aria-label="Close navigation overlay"
              className="flex-1 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            />
            <div className="app-shell-shadow relative h-full">
              <AppSidebar organizationId={organizationId} />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-screen flex-col">
          <AppTopBar />
          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
