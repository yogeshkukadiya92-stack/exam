import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createMissingBrowserClient();
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

function createMissingBrowserClient() {
  const missingError = new Error("Supabase env vars are missing.");
  const emptyQuery = {
    select() {
      return emptyQuery;
    },
    eq() {
      return emptyQuery;
    },
    upsert: async () => ({ data: null, error: missingError }),
    insert: async () => ({ data: null, error: missingError }),
    update() {
      return emptyQuery;
    },
    single: async () => ({ data: null, error: missingError }),
  };

  return {
    auth: {
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
      updateUser: async () => ({ data: null, error: missingError }),
    },
    from() {
      return emptyQuery;
    },
  } as any;
}
