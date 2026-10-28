// PATCH /api/admin/reports/[id] {resolved: true} : clôt un signalement.
// Pour clore tous les signalements d'un mot : id = l'id du mot et ?word=1.
import { z } from "zod";
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

const body = z.object({ resolved: z.literal(true) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return badRequest("id invalide");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);

  const byWord = new URL(req.url).searchParams.get("word") === "1";
  const { data, error } = await c.sb
    .from("word_reports")
    .update({ resolved: true })
    .eq(byWord ? "word_id" : "id", id)
    .eq("resolved", false)
    .select("id");
  if (error) return serverError("admin/reports/patch", error);
  return json({ resolved: data.length });
}
