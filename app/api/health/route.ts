// GET /api/health : pour la surveillance de disponibilité (UptimeRobot, Better Stack…).
// 200 si l'app répond ET que Supabase sert des mots ; 503 sinon. Ne renvoie aucune donnée de joueur.
import { json } from "@/lib/server/http";
import { serverSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const sb = await serverSupabase();
  if (!sb) return json({ ok: true, mode: "local" });
  const { count, error } = await sb.from("words").select("id", { count: "exact", head: true }).eq("status", "active");
  const ms = Date.now() - started;
  if (error || !count) return json({ ok: false, database: "indisponible", ms }, 503);
  return json({ ok: true, words: count, ms });
}
