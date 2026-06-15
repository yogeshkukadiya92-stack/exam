import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createMissingClient();
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore,
            // middleware refreshes the session.
          }
        },
      },
    }
  );
}

function createMissingClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error("Supabase env vars are missing."),
      }),
      signUp: async () => ({
        data: null,
        error: new Error("Supabase env vars are missing."),
      }),
      signOut: async () => ({ error: null }),
    },
    from() {
      const empty = {
        select() {
          return empty;
        },
        eq() {
          return empty;
        },
        single: async () => ({
          data: null,
          error: new Error("Supabase env vars are missing."),
        }),
        insert: async () => ({
          data: null,
          error: new Error("Supabase env vars are missing."),
        }),
        update() {
          return empty;
        },
        delete() {
          return empty;
        },
        order() {
          return empty;
        },
        limit() {
          return empty;
        },
        maybeSingle: async () => ({
          data: null,
          error: new Error("Supabase env vars are missing."),
        }),
      };

      return empty;
    },
    rpc: async () => ({
      data: null,
      error: new Error("Supabase env vars are missing."),
    }),
  } as any;
}
