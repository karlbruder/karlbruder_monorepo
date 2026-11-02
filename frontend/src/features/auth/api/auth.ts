import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

export function getSession(...args: Parameters<typeof supabase.auth.getSession>) {
  return supabase.auth.getSession(...args);
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export function signInWithOAuth(...args: Parameters<typeof supabase.auth.signInWithOAuth>) {
  return supabase.auth.signInWithOAuth(...args);
}

export function signOut(...args: Parameters<typeof supabase.auth.signOut>) {
  return supabase.auth.signOut(...args);
}

export function signUp(...args: Parameters<typeof supabase.auth.signUp>) {
  return supabase.auth.signUp(...args);
}

export function signInWithPassword(...args: Parameters<typeof supabase.auth.signInWithPassword>) {
  return supabase.auth.signInWithPassword(...args);
}

export function resetPasswordForEmail(...args: Parameters<typeof supabase.auth.resetPasswordForEmail>) {
  return supabase.auth.resetPasswordForEmail(...args);
}

export function updateUser(...args: Parameters<typeof supabase.auth.updateUser>) {
  return supabase.auth.updateUser(...args);
}
