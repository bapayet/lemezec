// GET /api/words/sync?after=<updatedAt>,<id>
// Mots actifs + masqués (pierres tombales) modifiés après le curseur, par pages de 1 000.
// Sans Supabase : sert lib/server/seed-words.json avec le même contrat.
import { z } from "zod";
import seed from "@/lib/server/seed-words.json";
import { badRequest, json, serverError } from "@/lib/server/http";
import { serverSupabase } from "@/lib/supabase/server";
import type { Word } from "@/lib/types";

const PAGE = 1000;
// le timestamp est renvoyé tel que Postgres l'a écrit (microsecondes) : on ne le convertit jamais en Date
const cursor = z.string().regex(/^[0-9T:.+\-Z ]{10,40},[0-9a-f-]{36}$/i);

type Row = {
  id: string; word: string; definition: string; labels: string[]; difficulty: Word["difficulty"];
  difficulty_computed: Word["difficulty"] | null; status: Word["status"]; updated_at: string;
};

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("after");
  if (raw !== null && !cursor.safeParse(raw).success) return badRequest("curseur invalide");
  const [after, afterId] = raw ? raw.split(",") : [null, null];

  const sb = await serverSupabase();
  if (!sb) return fromSeed(after, afterId);

  let q = sb
    .from("words")
    .select("id, word, definition, labels, difficulty, difficulty_computed, status, updated_at")
    .in("status", ["active", "hidden"])
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(PAGE);
  if (after && afterId) q = q.or(`updated_at.gt."${after}",and(updated_at.eq."${after}",id.gt.${afterId})`);
  const { data, error } = await q.returns<Row[]>();
  if (error) return serverError("words/sync", error);

  const words: Word[] = data.map((r) => ({
    id: r.id, word: r.word, definition: r.definition, labels: r.labels, difficulty: r.difficulty,
    difficultyComputed: r.difficulty_computed, status: r.status, updatedAt: r.updated_at,
  }));
  const last = words.at(-1);
  return json({ words, nextCursor: last ? { updatedAt: last.updatedAt, id: last.id } : null, done: words.length < PAGE });
}

const seedWords = (seed as Word[]).slice().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));

function fromSeed(after: string | null, afterId: string | null) {
  let start = 0;
  if (after && afterId) {
    start = seedWords.findIndex((w) => w.updatedAt > after || (w.updatedAt === after && w.id > afterId));
    if (start === -1) start = seedWords.length;
  }
  const page = seedWords.slice(start, start + PAGE);
  const last = page.at(-1);
  return json({ words: page, nextCursor: last ? { updatedAt: last.updatedAt, id: last.id } : null, done: start + PAGE >= seedWords.length });
}
