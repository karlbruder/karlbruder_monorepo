export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
}
