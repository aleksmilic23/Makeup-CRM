import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";

// Browser client for "use client" components. Reads the logged-in session from cookies.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
