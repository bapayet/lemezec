// Vérifie les règles d'accès des migrations dans un Postgres en mémoire (PGlite).
// Simule les rôles Supabase : anon, authenticated (session anonyme), un admin, un deuxième utilisateur.
// usage : node scripts/test-rls.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();
let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "  ok  " : "  FAIL"} ${label}`); if (!cond) failures++; };

// --- ce que Supabase fournit d'office ---
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`);
for (const f of readdirSync(resolve(root, "supabase/migrations")).sort()) {
  await db.exec(readFileSync(resolve(root, "supabase/migrations", f), "utf8").replace(/create extension[^;]*;/i, ""));
}
await db.exec(`
  grant usage on schema public to anon, authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
  grant execute on all functions in schema public to service_role;
`);

const A = "aaaaaaaa-0000-4000-8000-000000000001"; // session anonyme d'un appareil
const B = "bbbbbbbb-0000-4000-8000-000000000002"; // deuxième appareil
const ADMIN = "adadadad-0000-4000-8000-000000000003";
await db.exec(`
  insert into auth.users values ('${A}', true), ('${B}', true), ('${ADMIN}', false);
  insert into admins values ('${ADMIN}');
  insert into words (id, word, definition, difficulty, source, status) values
    ('11111111-0000-4000-8000-000000000001', 'bibliopole', 'Marchand de livres.', 'difficile', 'legacy', 'active'),
    ('11111111-0000-4000-8000-000000000002', 'abluer', 'Laver.', 'moyen', 'legacy', 'pending'),
    ('11111111-0000-4000-8000-000000000003', 'droit', 'Mot trop courant.', 'simple', 'legacy', 'hidden');
`);

async function as(role, uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
  try { return { rows: (await db.query(sql, params)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec("reset role;"); }
}

console.log("Mots");
let r = await as("anon", null, "select word, status from words order by word");
ok(r.rows?.map((w) => w.word).join() === "bibliopole,droit", "anon voit les mots actifs + masqués (pierres tombales), pas les « pending »");
r = await as("authenticated", A, "select count(*)::int n from words where status = 'pending'");
ok(r.rows?.[0].n === 0, "une session anonyme ne voit pas les mots en attente");
r = await as("authenticated", ADMIN, "select count(*)::int n from words where status = 'pending'");
ok(r.rows?.[0].n === 1, "l'admin voit les mots en attente");
r = await as("authenticated", A, "update words set definition = 'piraté' where word = 'bibliopole' returning id");
ok(!r.error && r.rows.length === 0, "une session anonyme ne peut pas modifier un mot (0 ligne)");
r = await as("authenticated", A, "insert into words (word, definition, difficulty, source) values ('nouveau', 'Essai.', 'moyen', 'manual')");
ok(Boolean(r.error), "une session anonyme ne peut pas ajouter de mot");
r = await as("authenticated", ADMIN, "update words set status = 'active' where word = 'abluer' returning status");
ok(r.rows?.[0]?.status === "active", "l'admin peut valider un mot");
r = await as("authenticated", ADMIN, "delete from words where word = 'droit' returning id");
ok(!r.error && r.rows.length === 0, "personne ne supprime un mot (on le masque)");

console.log("Évaluations");
const RID = "22222222-0000-4000-8000-000000000001";
r = await as("authenticated", A, `insert into word_ratings (id, word_id, rating, found, rated_at)
  values ('${RID}', '11111111-0000-4000-8000-000000000001', 'bien', true, now())`);
ok(!r.error, "A enregistre une évaluation (user_id rempli par défaut)");
r = await as("authenticated", A, `insert into word_ratings (id, word_id, rating, found, rated_at)
  values ('${RID}', '11111111-0000-4000-8000-000000000001', 'bien', true, now()) on conflict (id) do nothing`);
ok(!r.error, "renvoyer la même évaluation ne crée pas de doublon ni d'erreur"); if (r.error) console.log("        ", r.error);
r = await as("authenticated", B, `insert into word_ratings (id, word_id, user_id, rating, found, rated_at)
  values (gen_random_uuid(), '11111111-0000-4000-8000-000000000001', '${A}', 'impossible', false, now())`);
ok(Boolean(r.error), "B ne peut pas évaluer au nom de A");
r = await as("authenticated", B, "select * from word_ratings");
ok(r.rows?.length === 0, "B ne lit aucune évaluation");
r = await as("authenticated", A, "select user_id from word_ratings");
ok(r.rows?.length === 1 && r.rows[0].user_id === A, "A relit uniquement sa propre évaluation (nécessaire au renvoi idempotent)");
r = await as("authenticated", A, "select my_rating_count_24h() n");
ok(r.rows?.[0].n === 1, "A connaît seulement son propre compteur (1)");
r = await as("authenticated", B, "select my_rating_count_24h() n");
ok(r.rows?.[0].n === 0, "le compteur de B est à 0");
r = await as("authenticated", ADMIN, "select count(*)::int n from word_ratings");
ok(r.rows?.[0].n === 1, "l'admin lit les évaluations");

console.log("Signalements");
r = await as("authenticated", B, "insert into word_reports (word_id, reason) values ('11111111-0000-4000-8000-000000000001', 'not_a_word')");
ok(!r.error, "B signale un mot");
r = await as("authenticated", B, "insert into word_reports (word_id, reason) values ('11111111-0000-4000-8000-000000000001', 'other')");
ok(Boolean(r.error), "un seul signalement par appareil et par mot");
r = await as("authenticated", B, "insert into word_reports (word_id, reason) values ('11111111-0000-4000-8000-000000000001', 'other') on conflict (word_id, user_id) do nothing");
ok(!r.error, "re-signaler le même mot (renvoi de la file) passe sans erreur");
r = await as("authenticated", A, "select * from word_reports");
ok(r.rows?.length === 0, "A ne voit pas le signalement de B");
r = await as("authenticated", A, "update word_reports set resolved = true returning id");
ok(!r.error && r.rows.length === 0, "A ne peut pas résoudre un signalement");

console.log("Admin et lots d'import");
r = await as("authenticated", A, "select is_admin() v");
ok(r.rows?.[0].v === false, "is_admin() = false pour une session anonyme");
r = await as("authenticated", ADMIN, "select is_admin() v");
ok(r.rows?.[0].v === true, "is_admin() = true pour l'admin");
r = await as("authenticated", A, `insert into import_batches (source, created_by) values ('manual', '${A}')`);
ok(Boolean(r.error), "une session anonyme ne crée pas de lot d'import");
r = await as("authenticated", A, "insert into admins values (auth.uid())");
ok(Boolean(r.error), "personne ne se déclare admin soi-même");
r = await as("authenticated", A, "select recompute_difficulty()");
ok(Boolean(r.error), "recompute_difficulty() réservé au rôle service");
r = await as("service_role", null, "select recompute_difficulty() n");
ok(!r.error, "le cron (rôle service) recalcule la difficulté");

console.log("Suppression de compte");
await db.exec(`delete from auth.users where id = '${B}'`);
r = await as("authenticated", ADMIN, `select (select count(*) from word_reports)::int reports`);
ok(r.rows?.[0].reports === 0, "supprimer la session de B supprime ses signalements (cascade)");

console.log(failures ? `\n${failures} échec(s)` : "\nTout passe.");
process.exit(failures ? 1 : 0);
