// Charge replica/data/mots_nettoyes.csv dans la table words de Supabase.
// Les ids sont dérivés du mot (comme build-seed.mjs) : les appareils qui ont déjà le cache provisoire
// ne se retrouvent pas avec des doublons.
//
//   node scripts/import-words.mjs --dry-run              charge dans un Postgres en mémoire avec les migrations
//   node --env-file=.env.local scripts/import-words.mjs  charge dans ton projet Supabase (clé service requise)
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const src = process.argv.find((a) => a.endsWith(".csv")) ?? resolve(root, "../replica/data/mots_nettoyes.csv");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function stableId(word) {
  const h = createHash("sha1").update(word.normalize("NFC").toLowerCase()).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const [head, ...data] = parseCsv(readFileSync(src, "utf8"));
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const rows = data
  .filter((r) => r.length >= head.length && r[col.word])
  .map((r) => ({
    id: stableId(r[col.word]),
    word: r[col.word],
    definition: r[col.definition],
    labels: r[col.labels] ? r[col.labels].split("; ") : [],
    difficulty: r[col.difficulty],
    status: r[col.status],
    source: "legacy",
    license: "CC-BY-SA-4.0",
    review_flags: r[col.flags] ? r[col.flags].split(" ") : [],
  }));

const count = (s) => rows.filter((r) => r.status === s).length;
console.log(`${rows.length} mots lus (${count("active")} actifs, ${count("pending")} à relire) depuis ${src}`);

if (dryRun) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create role anon; create role authenticated;`);
  for (const f of readdirSync(resolve(root, "supabase/migrations")).sort()) {
    await db.exec(readFileSync(resolve(root, "supabase/migrations", f), "utf8").replace(/create extension[^;]*;/i, ""));
  }
  let failed = 0;
  for (const r of rows) {
    try {
      await db.query(
        `insert into words (id, word, definition, labels, difficulty, status, source, license, review_flags)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do update set definition = excluded.definition`,
        [r.id, r.word, r.definition, r.labels, r.difficulty, r.status, r.source, r.license, r.review_flags],
      );
    } catch (e) {
      failed++;
      if (failed <= 5) console.log("  échec :", r.word, "-", e.message);
    }
  }
  const { rows: stats } = await db.query("select status, count(*)::int n from words group by 1 order by 1");
  console.log("à blanc :", stats.map((s) => `${s.status} ${s.n}`).join(", "), failed ? `· ${failed} échec(s)` : "· aucun échec");
  process.exit(failed ? 1 : 0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent (lancer avec --env-file=.env.local).");
  process.exit(2);
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key, { auth: { persistSession: false } });
let done = 0;
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  // upsert sur l'id : relancer le script met à jour sans dupliquer ; un mot déjà validé ou masqué garde son statut
  const { error } = await sb.from("words").upsert(chunk.map(({ status, ...rest }) => rest), { onConflict: "id", ignoreDuplicates: false });
  if (error) { console.error(`lot ${i / 500 + 1} :`, error.message); process.exit(1); }
  // le statut n'est posé que sur les mots nouveaux (encore sans statut validé côté serveur)
  for (const s of ["active", "pending"]) {
    const ids = chunk.filter((r) => r.status === s).map((r) => r.id);
    if (ids.length) {
      const { error: e2 } = await sb.from("words").update({ status: s }).in("id", ids).eq("status", "pending");
      if (e2) { console.error(e2.message); process.exit(1); }
    }
  }
  done += chunk.length;
  console.log(`  ${done} / ${rows.length}`);
}
console.log("Import terminé.");
