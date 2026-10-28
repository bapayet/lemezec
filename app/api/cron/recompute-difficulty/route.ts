// GET /api/cron/recompute-difficulty : appelé chaque nuit par Vercel Cron (voir vercel.json).
// Vercel envoie « Authorization: Bearer $CRON_SECRET » ; sans ce secret, la route refuse.
import { timingSafeEqual } from "node:crypto";
import { json, serverError } from "@/lib/server/http";
import { adminSupabase } from "@/lib/supabase/server";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return Boolean(secret) && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!authorized(req)) return json({ error: "non autorisé" }, 401);
  const admin = adminSupabase();
  if (!admin) return serverError("cron", "Supabase non configuré");
  const { data, error } = await admin.rpc("recompute_difficulty");
  if (error) return serverError("cron", error);
  return json({ updated: data });
}
