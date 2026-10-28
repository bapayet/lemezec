// GET /api/admin/words?status=pending|active|hidden&q=&flag=&page= : liste pour la relecture (S14)
import { z } from "zod";
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

const PAGE = 30;
const query = z.object({
  status: z.enum(["pending", "active", "hidden"]).default("pending"),
  q: z.string().trim().max(60).optional(),
  flag: z.string().regex(/^[a-z_]{2,30}$/).optional(),
  page: z.coerce.number().int().min(0).max(1000).default(0),
});

export async function GET(req: Request) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);
  const { status, q, flag, page } = parsed.data;

  let sel = c.sb
    .from("words")
    .select("id, word, definition, labels, difficulty, difficulty_computed, status, review_flags, source, source_url, updated_at", { count: "exact" })
    .eq("status", status)
    .order("word_key")
    .range(page * PAGE, page * PAGE + PAGE - 1);
  // échappe les jokers LIKE saisis par l'admin
  if (q) sel = sel.ilike("word_key", `%${q.toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
  if (flag) sel = sel.contains("review_flags", [flag]);
  const { data, error, count } = await sel;
  if (error) return serverError("admin/words", error);
  return json({ words: data, total: count ?? 0, page, pageSize: PAGE });
}
