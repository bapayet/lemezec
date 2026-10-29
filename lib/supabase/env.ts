// Sans ces variables, l'app tourne en mode local : mots servis depuis lib/server/seed-words.json,
// évaluations et signalements acceptés puis jetés, espace admin indisponible.
// NEXT_PUBLIC_FORCE_LOCAL=1 force ce mode même si .env.local contient des clés (tests e2e).
const FORCE_LOCAL = process.env.NEXT_PUBLIC_FORCE_LOCAL === "1";

export const SUPABASE_URL = FORCE_LOCAL ? "" : process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = FORCE_LOCAL ? "" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
