// Sans ces variables, l'app tourne en mode local : mots servis depuis lib/server/seed-words.json,
// évaluations et signalements acceptés puis jetés, espace admin indisponible.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
