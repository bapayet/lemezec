// POST /api/admin/import/wiktionary {words[], difficulty} : aperçu d'un import depuis fr.wiktionary.org
import { z } from "zod";
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { createPreview } from "@/lib/server/importer";
import { fetchDefinitions, MAX_WORDS } from "@/lib/server/wiktionary";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { DIFFICULTIES } from "@/lib/types";

const body = z.object({
  words: z.array(z.string().trim().min(2).max(60)).min(1).max(MAX_WORDS),
  difficulty: z.enum(DIFFICULTIES),
});

export async function POST(req: Request) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const results = await fetchDefinitions([...new Set(parsed.data.words)]);
    const found = results.filter((r) => r.found);
    const notFound = results.filter((r) => !r.found).map((r) => r.word);
    const preview = await createPreview(
      c, "wiktionary", { words: parsed.data.words },
      found.map((r) => ({ word: r.word, definition: r.definition, labels: r.labels, sourceUrl: r.sourceUrl, license: "CC-BY-SA-4.0" as const })),
      parsed.data.difficulty, notFound,
    );
    return json(preview);
  } catch (e) {
    return serverError("import/wiktionary", e);
  }
}
