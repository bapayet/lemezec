// Tests des fonctions pures du backend (pas de réseau, pas de base).
// usage : node --conditions=react-server --experimental-strip-types scripts/test-units.ts
import { check, parseDifficulty, looksEnglish } from "../lib/words/validate";
import { sheetExportUrl, parseWordCsv, stableId } from "../lib/server/importer";
import { parseWikitext } from "../lib/server/wiktionary";

let failures = 0;
const ok = (cond: boolean, label: string) => { console.log(`${cond ? "  ok  " : "  FAIL"} ${label}`); if (!cond) failures++; };

console.log("Validation des mots");
ok(check({ word: "-eraie", definition: "Suffixe." }, "moyen").ok === false, "refuse un affixe (-eraie)");
ok(check({ word: "15ne", definition: "Quinzaine." }, "moyen").ok === false, "refuse un mot avec chiffres");
ok(check({ word: "GLB", definition: "Sigle." }, "moyen").ok === false, "refuse un sigle");
ok(check({ word: "accroyez", definition: "Deuxième personne du pluriel de accroire." }, "moyen").ok === false, "refuse une forme fléchie");
ok(check({ word: "abŷme", definition: "Variante orthographique de abime." }, "moyen").ok === false, "refuse une variante");
const good = check({ word: "  bibliopole ", definition: "(Rare)(Désuet) Marchand de livres.[1]" }, "difficile");
ok(good.ok && good.word === "bibliopole" && good.definition === "Marchand de livres." && good.labels.join() === "Rare,Désuet", "nettoie espaces, étiquettes et notes");
const en = check({ word: "abêtifier", definition: "to make dumb, stupid, or foolish by the use of the" }, "moyen");
ok(en.ok && en.flags.includes("definition_anglaise"), "repère une définition en anglais (à relire)");
ok(looksEnglish("Rendre bête, abrutir.") === false, "une définition française n'est pas signalée");
ok(parseDifficulty("Très difficile") === "tres_difficile" && parseDifficulty("facile") === "simple" && parseDifficulty("3") === "difficile" && parseDifficulty("??") === null, "lit les niveaux en clair, en chiffres, ou rien");

console.log("Google Sheet (garde contre les URL arbitraires)");
ok(sheetExportUrl("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit#gid=42") ===
  "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/export?format=csv&gid=42", "construit l'URL d'export, onglet compris");
ok(sheetExportUrl("http://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345") === null, "refuse http");
ok(sheetExportUrl("https://docs.google.com.evil.example/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345") === null, "refuse un faux domaine");
ok(sheetExportUrl("https://169.254.169.254/latest/meta-data") === null, "refuse une adresse interne");
ok(sheetExportUrl("pas une url") === null, "refuse un texte quelconque");

console.log("CSV");
const csv = parseWordCsv("﻿Mot,Définition,Difficulté\nbibliopole,Marchand de livres.,difficile\n\"psithurisme\",\"Chuchotement du vent, dans les feuilles.\",\n");
ok(!csv.error && csv.rows.length === 2 && csv.rows[1].definition.includes(", dans") && csv.rows[0].difficulty === "difficile", "lit en-têtes français, BOM, guillemets et virgules");
ok(Boolean(parseWordCsv("nom,texte\na,b").error), "signale des colonnes manquantes");
ok(stableId("Bibliopole") === stableId(" bibliopole ") && stableId("pécher") !== stableId("pêcher"), "id stable : casse et espaces ignorés, accents conservés");

console.log("Wiktionnaire (wikitexte)");
const wt = `== {{langue|en}} ==\n# English thing.\n== {{langue|fr}} ==\n=== {{S|nom|fr}} ===\n'''bibliopole''' {{pron|bi.bljɔ.pɔl|fr}}\n# {{rare|fr}} {{désuet|fr}} [[marchand|Marchand]] de [[livre]]s.<ref>Littré</ref>\n#* ''Un exemple.''\n`;
const p = parseWikitext(wt);
ok(p?.definition === "Marchand de livres." && p.labels.join() === "Rare,Désuet", "prend la section française, pas l'anglaise, et ses étiquettes");
ok(parseWikitext("== {{langue|en}} ==\n# English only.") === null, "page sans section française : introuvable");
const lex = parseWikitext("== {{langue|fr}} ==\n# {{lexique|médecine|fr}} Douleur des [[articulation]]s.");
ok(lex?.labels.join() === "Médecine" && lex.definition === "Douleur des articulations.", "lit {{lexique|…}}");

console.log(failures ? `\n${failures} échec(s)` : "\nTout passe.");
process.exit(failures ? 1 : 0);
