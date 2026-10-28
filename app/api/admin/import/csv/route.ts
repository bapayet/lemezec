// POST /api/admin/import/csv (multipart : file, difficulty) : aperçu d'un import depuis un fichier CSV
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { createPreview, MAX_BYTES, parseWordCsv } from "@/lib/server/importer";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { DIFFICULTIES, type Difficulty } from "@/lib/types";

export async function POST(req: Request) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const difficulty = form?.get("difficulty");
  if (!(file instanceof File)) return badRequest("Fichier manquant.");
  if (file.size > MAX_BYTES) return badRequest("Fichier trop gros (2 Mo au maximum).");
  if (!/\.(csv|txt)$/i.test(file.name) && !/csv|text\/plain/.test(file.type)) return badRequest("Seuls les fichiers .csv sont acceptés.");
  if (typeof difficulty !== "string" || !(DIFFICULTIES as readonly string[]).includes(difficulty)) return badRequest("Niveau par défaut invalide.");

  try {
    const { rows, error } = parseWordCsv(await file.text());
    if (error) return badRequest(error);
    return json(await createPreview(c, "manual", { file: file.name.slice(0, 120) }, rows, difficulty as Difficulty));
  } catch (e) {
    return serverError("import/csv", e);
  }
}
