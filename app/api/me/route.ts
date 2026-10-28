// DELETE /api/me : « Tout effacer » supprime aussi la session anonyme côté serveur,
// ce qui efface ses évaluations et signalements (on delete cascade).
import { json, serverError } from "@/lib/server/http";
import { adminSupabase, caller } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export async function DELETE() {
  if (!supabaseConfigured()) return new Response(null, { status: 204 });
  const c = await caller();
  if (!c) return new Response(null, { status: 204 }); // rien côté serveur
  // un compte admin ne se supprime pas depuis le jeu : ça passe par le tableau de bord Supabase
  if (!c.anonymous) return json({ error: "compte admin : à supprimer depuis Supabase" }, 409);
  const admin = adminSupabase();
  if (!admin) return serverError("me", "SUPABASE_SERVICE_ROLE_KEY manquante");
  const { error } = await admin.auth.admin.deleteUser(c.userId);
  if (error) return serverError("me", error);
  await c.sb.auth.signOut();
  return new Response(null, { status: 204 });
}
