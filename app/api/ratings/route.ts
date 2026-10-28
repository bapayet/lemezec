// POST /api/ratings : lot d'évaluations depuis la file d'envoi de l'appareil.
// Idempotent : l'id vient de l'appareil, un renvoi est ignoré (on conflict do nothing).
import { z } from "zod";
import { badRequest, json, serverError, unauthorized } from "@/lib/server/http";
import { caller } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { RATINGS } from "@/lib/types";

const DAILY_CAP = 2000;
const body = z
  .array(z.object({
    id: z.string().uuid(),
    wordId: z.string().uuid(),
    rating: z.enum(RATINGS),
    found: z.boolean(),
    ratedAt: z.string().datetime(),
  }))
  .min(1)
  .max(100);

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  // mode local : rien à enregistrer, on vide simplement la file de l'appareil
  if (!supabaseConfigured()) return json({ accepted: 0, dropped: parsed.data.length, mode: "local" });

  const c = await caller();
  if (!c) return unauthorized();

  const { data: used, error: capError } = await c.sb.rpc("my_rating_count_24h");
  if (capError) return serverError("ratings/cap", capError);
  if ((used as number) + parsed.data.length > DAILY_CAP) return json({ error: "trop d'évaluations aujourd'hui" }, 429);

  // un mot inconnu du serveur (retiré, ou venu du cache provisoire) ferait échouer tout le lot : on l'écarte
  const ids = [...new Set(parsed.data.map((r) => r.wordId))];
  const { data: known, error: kErr } = await c.sb.from("words").select("id").in("id", ids);
  if (kErr) return serverError("ratings/known", kErr);
  const knownIds = new Set(known.map((w) => w.id));
  const rows = parsed.data
    .filter((r) => knownIds.has(r.wordId))
    .map((r) => ({ id: r.id, word_id: r.wordId, rating: r.rating, found: r.found, rated_at: r.ratedAt }));

  if (rows.length) {
    const { error } = await c.sb.from("word_ratings").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) return serverError("ratings/insert", error);
  }
  return json({ accepted: rows.length, dropped: parsed.data.length - rows.length });
}
