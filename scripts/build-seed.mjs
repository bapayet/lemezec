// Construit lib/server/seed-words.json depuis replica/data/mots_nettoyes.csv.
// Seuls les mots « active » partent dans le jeu ; les « pending » attendent la relecture admin.
// usage : node scripts/build-seed.mjs [chemin du csv]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] ?? resolve(root, "../replica/data/mots_nettoyes.csv");
const out = resolve(root, "lib/server/seed-words.json");

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

// id stable dérivé du mot : un nouvel export ne change pas les ids déjà en cache sur les appareils
function stableId(word) {
  const h = createHash("sha1").update(word.normalize("NFC").toLowerCase()).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const [head, ...rows] = parseCsv(readFileSync(src, "utf8"));
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const updatedAt = "2026-10-28T12:00:00.000Z";
const words = rows
  .filter((r) => r.length >= head.length && r[col.status] === "active")
  .map((r) => ({
    id: stableId(r[col.word]),
    word: r[col.word],
    definition: r[col.definition],
    labels: r[col.labels] ? r[col.labels].split("; ") : [],
    difficulty: r[col.difficulty],
    difficultyComputed: null,
    status: "active",
    updatedAt,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(words));
console.log(`${words.length} mots écrits dans ${out}`);
