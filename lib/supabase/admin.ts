import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — SERVER ONLY.
 * Aa client RLS bypass kare che, etle ene KOI vaar client/browser ma
 * import na karta. Faqt server actions ma vaaparo.
 * SUPABASE_SERVICE_ROLE_KEY .env.local ma rakho (NEXT_PUBLIC_ vagar).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
