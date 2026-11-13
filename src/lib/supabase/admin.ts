import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

// Service-role client that bypasses RLS. Only for code paths with no logged-in
// user: the public client invoice view (/view/[id]), its PDF, and the cron job.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_KEY is not set");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
