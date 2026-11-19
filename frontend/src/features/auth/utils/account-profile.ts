import type { User } from "@supabase/supabase-js";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function googlePhoto(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname.endsWith(".googleusercontent.com") && !url.username && !url.password && !url.port) {
      return url.href;
    }
  } catch {
    return;
  }
}

export function accountProfile(user: User) {
  const metadata = user.user_metadata ?? {};
  const google = user.identities?.find(identity => identity.provider === "google");
  const googleMetadata = google?.identity_data;
  const name = text(metadata.full_name) || text(metadata.name) ||
    [text(metadata.given_name), text(metadata.family_name)].filter(Boolean).join(" ");
  const words = name.normalize().split(/\s+/).filter(Boolean);
  const first = Array.from(words[0] ?? user.email ?? "")[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  const providers = user.app_metadata?.providers;
  const hasGoogle = google || user.app_metadata?.provider === "google" ||
    (Array.isArray(providers) && providers.includes("google"));
  const photo = hasGoogle
    ? googlePhoto(googleMetadata?.avatar_url) ?? googlePhoto(googleMetadata?.picture) ??
      googlePhoto(metadata.avatar_url) ?? googlePhoto(metadata.picture)
    : undefined;

  return { name, email: user.email, initials: first ? (first + last).toLocaleUpperCase() : "", photo };
}
