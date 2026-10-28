import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/** Client lié à l'appelant (cookies) : toutes ses requêtes passent par la RLS. */
export async function serverSupabase() {
  if (!supabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // appelé depuis un composant serveur : le middleware rafraîchit les cookies
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/** Clé service : contourne la RLS. Réservé au cron et à la suppression de compte. Jamais côté client. */
export function adminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured() || !key) return null;
  admin ??= createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export type Caller = { sb: SupabaseClient; userId: string; anonymous: boolean };

/** L'appelant authentifié (anonyme ou admin), ou null. getUser() revalide le jeton auprès de Supabase. */
export async function caller(): Promise<Caller | null> {
  const sb = await serverSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  return { sb, userId: data.user.id, anonymous: Boolean(data.user.is_anonymous) };
}

export async function requireAdmin(): Promise<Caller | null> {
  const c = await caller();
  if (!c || c.anonymous) return null;
  const { data, error } = await c.sb.rpc("is_admin");
  return !error && data === true ? c : null;
}
