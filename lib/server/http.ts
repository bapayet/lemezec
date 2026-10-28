import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const unauthorized = () => json({ error: "session requise" }, 401);
export const forbidden = () => json({ error: "réservé à l'admin" }, 403);
export const badRequest = (e: ZodError | string) =>
  json({ error: typeof e === "string" ? e : "entrée invalide", issues: typeof e === "string" ? undefined : e.issues.slice(0, 5) }, 400);
// on ne renvoie jamais le détail d'une erreur base au client
export const serverError = (where: string, e: unknown) => {
  console.error(`[${where}]`, e instanceof Error ? e.message : e);
  return json({ error: "erreur serveur" }, 500);
};
export const localMode = () => json({ error: "Supabase n'est pas configuré (mode local)" }, 503);
