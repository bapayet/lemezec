// PATCH /api/admin/words/[id] : corriger, changer de niveau, valider ou masquer un mot.
// Le changement de updated_at (trigger) fait redescendre la correction sur tous les appareils à la synchro.
import { z } from "zod";
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { check } from "@/lib/words/validate";
import { DIFFICULTIES } from "@/lib/types";

const body = z
  .object({
    word: z.string().trim().min(2).max(60).optional(),
    definition: z.string().trim().min(3).max(600).optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    status: z.enum(["active", "hidden", "pending"]).optional(),
    clearFlags: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, "rien à modifier");

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return badRequest("id invalide");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const b = parsed.data;

  const patch: Record<string, unknown> = {};
  if (b.word !== undefined || b.definition !== undefined) {
    const { data: cur, error } = await c.sb.from("words").select("word, definition, difficulty").eq("id", id).single();
    if (error) return json({ error: "mot introuvable" }, 404);
    const r = check({ word: b.word ?? cur.word, definition: b.definition ?? cur.definition }, cur.difficulty);
    if (!r.ok) return badRequest(r.reason);
    patch.word = r.word;
    patch.definition = r.definition;
  }
  if (b.difficulty) patch.difficulty = b.difficulty;
  if (b.status) patch.status = b.status;
  if (b.clearFlags || b.status === "active") patch.review_flags = [];

  const { data, error } = await c.sb.from("words").update(patch).eq("id", id).select("id, word, definition, difficulty, status, review_flags").maybeSingle();
  if (error) return error.code === "23505" ? json({ error: "ce mot existe déjà" }, 409) : serverError("admin/words/patch", error);
  if (!data) return json({ error: "mot introuvable" }, 404);
  return json({ word: data });
}
