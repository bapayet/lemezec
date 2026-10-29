// Bloque une mise en PRODUCTION sur Vercel tant que les pages légales contiennent « À_COMPLÉTER ».
// Ailleurs (dev, tests, aperçus), simple avertissement.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../lib/legal.ts", import.meta.url), "utf8");
const missing = (src.match(/"À_COMPLÉTER"/g) ?? []).length;
const production = process.env.VERCEL_ENV === "production";

if (missing && production) {
  console.error(`✗ lib/legal.ts : ${missing} champ(s) « À_COMPLÉTER » (nom et e-mail de l'éditeur). Mise en production bloquée.`);
  process.exit(1);
}
if (missing) console.warn(`⚠ lib/legal.ts : ${missing} champ(s) « À_COMPLÉTER » à remplir avant la mise en production.`);
else console.log("✓ pages légales complètes");
