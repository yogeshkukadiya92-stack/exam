import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client - SERVER ONLY.
 * This client bypasses RLS, so never import it in client/browser code.
 * Use it only from server actions.
 * Store SUPABASE_SERVICE_ROLE_KEY in .env.local without NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add the service_role key from Supabase Project Settings > API to .env.local."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}
