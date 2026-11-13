// The only accounts allowed into the app. Keep in sync with the RLS policies
// in supabase/schema.sql (supabase/migrations/001_auth_lockdown.sql).
export const ALLOWED_EMAILS = ["aleks.renje@gmail.com", "sairaobeauty@gmail.com"];

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && ALLOWED_EMAILS.includes(email.toLowerCase());
}
