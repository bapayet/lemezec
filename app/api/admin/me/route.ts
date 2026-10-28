// GET /api/admin/me : l'appelant est-il admin ? (sert aux écrans S13, S06, S14)
import { json } from "@/lib/server/http";
import { caller } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!supabaseConfigured()) return json({ configured: false, admin: false });
  const c = await caller();
  if (!c || c.anonymous) return json({ configured: true, admin: false });
  const { data } = await c.sb.rpc("is_admin");
  const { data: u } = await c.sb.auth.getUser();
  return json({ configured: true, admin: data === true, email: u.user?.email ?? null });
}
