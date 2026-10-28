// GET /api/admin/reports : signalements ouverts, regroupés par mot (S14)
import { forbidden, json, localMode, serverError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

type Row = { id: string; reason: string; created_at: string; words: { id: string; word: string; definition: string; status: string } | null };

export async function GET() {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const { data, error } = await c.sb
    .from("word_reports")
    .select("id, reason, created_at, words (id, word, definition, status)")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<Row[]>();
  if (error) return serverError("admin/reports", error);

  const byWord = new Map<string, { word: NonNullable<Row["words"]>; reportIds: string[]; reasons: Record<string, number>; last: string }>();
  for (const r of data) {
    if (!r.words) continue;
    const g = byWord.get(r.words.id) ?? { word: r.words, reportIds: [], reasons: {}, last: r.created_at };
    g.reportIds.push(r.id);
    g.reasons[r.reason] = (g.reasons[r.reason] ?? 0) + 1;
    byWord.set(r.words.id, g);
  }
  return json({ groups: [...byWord.values()].sort((a, b) => b.reportIds.length - a.reportIds.length) });
}
