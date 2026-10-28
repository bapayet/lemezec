// Diagnostic du projet Supabase configuré dans .env.local. N'affiche jamais les clés.
// usage : node --env-file=.env.local scripts/check-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pub = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const sec = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const line = (ok, label, extra = "") => console.log(`${ok ? "  ok  " : "  ✗   "} ${label}${extra ? ` : ${extra}` : ""}`);

const kind = (k) => (k.startsWith("sb_publishable_") ? "publique" : k.startsWith("sb_secret_") ? "secrète" : k.startsWith("eyJ") ? "jwt" : "?");
line(kind(pub) !== "secrète", "la clé de NEXT_PUBLIC_SUPABASE_ANON_KEY n'est pas une clé secrète", kind(pub));
line(kind(sec) !== "publique", "la clé de SUPABASE_SERVICE_ROLE_KEY n'est pas la clé publique", kind(sec));

const admin = createClient(url, sec, { auth: { persistSession: false } });
const anon = createClient(url, pub, { auth: { persistSession: false } });

console.log("Migrations");
for (const t of ["words", "word_ratings", "word_reports", "import_batches", "admins"]) {
  const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
  line(!error, `table ${t}`, error ? error.message : `${count} ligne(s)`);
}
const { error: flagsErr } = await admin.from("words").select("review_flags").limit(1);
line(!flagsErr, "2e migration appliquée (colonne review_flags)", flagsErr?.message);
const { error: fnErr } = await admin.rpc("recompute_difficulty");
line(!fnErr, "fonction recompute_difficulty()", fnErr?.message);

console.log("Mots");
for (const s of ["active", "pending", "hidden"]) {
  const { count } = await admin.from("words").select("*", { count: "exact", head: true }).eq("status", s);
  console.log(`        ${s.padEnd(8)} ${count}`);
}

console.log("Auth");
const { data: anonSession, error: anonErr } = await anon.auth.signInAnonymously();
line(!anonErr, "connexion anonyme activée", anonErr?.message);
if (anonSession?.user) {
  const { count: seen } = await anon.from("words").select("*", { count: "exact", head: true });
  const { count: pendingSeen } = await anon.from("words").select("*", { count: "exact", head: true }).eq("status", "pending");
  line(pendingSeen === 0, "une session anonyme ne voit pas les mots en attente", `${seen} mots visibles, ${pendingSeen} en attente`);
  const { data: isAdm } = await anon.rpc("is_admin");
  line(isAdm === false, "une session anonyme n'est pas admin");
  // ménage : on supprime la session de test
  await admin.auth.admin.deleteUser(anonSession.user.id);
}
const { data: admins } = await admin.from("admins").select("user_id");
const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
const adminUsers = (users?.users ?? []).filter((u) => admins?.some((a) => a.user_id === u.id));
line(adminUsers.length > 0, "au moins un admin déclaré", adminUsers.map((u) => `${u.email}${u.email_confirmed_at || u.invited_at ? "" : " (invitation non envoyée ?)"}`).join(", "));
