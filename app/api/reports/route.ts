// POST /api/reports : « Retirer ce mot » en partie devient un signalement (un par appareil et par mot).
import { z } from "zod";
import { badRequest, json, serverError, unauthorized } from "@/lib/server/http";
import { caller } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

const body = z.object({
  wordId: z.string().uuid(),
  reason: z.enum(["not_french_definition", "not_a_word", "wrong_definition", "offensive", "other"]).default("other"),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  if (!supabaseConfigured()) return json({ ok: true, mode: "local" });

  const c = await caller();
  if (!c) return unauthorized();
  const { error } = await c.sb
    .from("word_reports")
    .upsert({ word_id: parsed.data.wordId, reason: parsed.data.reason }, { onConflict: "word_id,user_id", ignoreDuplicates: true });
  // 23503 : le mot n'existe pas (ou plus) côté serveur ; rien à signaler, on vide la file
  if (error && error.code !== "23503") return serverError("reports", error);
  return json({ ok: true });
}
