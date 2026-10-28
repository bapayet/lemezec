"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

let client: SupabaseClient | null = null;

/** Client navigateur : la session vit dans des cookies, que les routes API relisent côté serveur. */
export function browserSupabase() {
  if (!supabaseConfigured()) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** Chaque appareil a une session anonyme : aucun compte pour jouer, mais un id pour limiter les abus. */
export async function ensureAnonymousSession() {
  const sb = browserSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return signed.session;
}
