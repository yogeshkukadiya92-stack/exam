import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — SERVER ONLY.
 * Aa client RLS bypass kare che, etle ene KOI vaar client/browser ma
 * import na karta. Faqt server actions ma vaaparo.
 * SUPABASE_SERVICE_ROLE_KEY .env.local ma rakho (NEXT_PUBLIC_ vagar).
 */
export function createAdminClient() {
  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing chhe. Supabase Project Settings > API mathi service_role key .env.local ma add karo."
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
