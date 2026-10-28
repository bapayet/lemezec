// POST /api/admin/import/sheet {url, difficulty} : aperçu d'un import depuis un Google Sheet partagé par lien
import { z } from "zod";
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { createPreview, fetchCapped, parseWordCsv, sheetExportUrl } from "@/lib/server/importer";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { DIFFICULTIES } from "@/lib/types";

const body = z.object({ url: z.string().url().max(500), difficulty: z.enum(DIFFICULTIES) });

export async function POST(req: Request) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);

  const exportUrl = sheetExportUrl(parsed.data.url);
  if (!exportUrl) return badRequest("Ce n'est pas un lien de Google Sheet (https://docs.google.com/spreadsheets/d/…).");
  try {
    const { text, error } = await fetchCapped(exportUrl);
    if (error || text === undefined) return badRequest(error ?? "Sheet illisible");
    const { rows, error: csvError } = parseWordCsv(text);
    if (csvError) return badRequest(csvError);
    return json(await createPreview(c, "sheet", { url: parsed.data.url }, rows, parsed.data.difficulty));
  } catch (e) {
    return serverError("import/sheet", e);
  }
}
