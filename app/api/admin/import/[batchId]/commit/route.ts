// POST /api/admin/import/[batchId]/commit {wordIds[]} : les mots cochés passent « active ».
// Les autres restent « pending » et se retrouvent dans la relecture (S14).
import { z } from "zod";
import { badRequest, forbidden, json, localMode, serverError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

const body = z.object({ wordIds: z.array(z.string().uuid()).max(5000) });

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  if (!supabaseConfigured()) return localMode();
  const c = await requireAdmin();
  if (!c) return forbidden();
  const { batchId } = await params;
  if (!z.string().uuid().safeParse(batchId).success) return badRequest("lot invalide");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);

  let activated = 0;
  // par paquets : une liste d'ids trop longue dépasserait la taille d'URL de PostgREST
  for (let i = 0; i < parsed.data.wordIds.length; i += 200) {
    const { data, error } = await c.sb
      .from("words")
      .update({ status: "active" })
      .eq("import_batch_id", batchId)
      .eq("status", "pending")
      .in("id", parsed.data.wordIds.slice(i, i + 200))
      .select("id");
    if (error) return serverError("import/commit", error);
    activated += data.length;
  }
  const { error } = await c.sb.from("import_batches").update({ status: "committed" }).eq("id", batchId);
  if (error) return serverError("import/commit", error);
  return json({ activated });
}
