// Retour du lien magique : échange le code contre une session (cookies), puis renvoie vers l'espace admin.
import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin/login";
  // redirection interne uniquement, et seulement vers l'espace admin
  const target = /^\/admin\/[a-z/-]*$/.test(next) ? next : "/admin/login";
  const sb = await serverSupabase();
  if (!sb || !code) return NextResponse.redirect(new URL("/admin/login?erreur=lien", url.origin));
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/admin/login?erreur=lien" : target, url.origin));
}
