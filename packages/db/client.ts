import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  }

  return value;
}

function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
  }

  return value;
}

function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  return value;
}

export function createUserSupabaseClient(): SupabaseClient {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions): void {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

export function createServiceRoleSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
