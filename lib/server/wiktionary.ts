import "server-only";
// Lecture des définitions sur fr.wiktionary.org via l'API MediaWiki publique.
// Une seule requête pour 50 mots (action=query, prop=revisions), avec un User-Agent qui donne un contact,
// comme le demande la politique de Wikimedia. Contenu sous CC BY-SA 4.0 : on garde l'URL de la page.

const API = "https://fr.wiktionary.org/w/api.php";
export const MAX_WORDS = 50;

export type WikiResult =
  | { word: string; found: true; definition: string; labels: string[]; sourceUrl: string }
  | { word: string; found: false };

const LABEL_TEMPLATES: Record<string, string> = {
  rare: "Rare", "très rare": "Très rare", vieilli: "Vieilli", désuet: "Désuet", archaïsme: "Archaïsme",
  littéraire: "Littéraire", soutenu: "Soutenu", familier: "Familier", populaire: "Populaire", argot: "Argot",
  néologisme: "Néologisme", ironique: "Ironique", péjoratif: "Péjoratif", poétique: "Poétique", régionalisme: "Régionalisme",
  figuré: "Figuré", vulgaire: "Vulgaire", "peu usité": "Peu usité", didactique: "Didactique",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Extrait la première définition de la section française d'une page en wikitexte. */
export function parseWikitext(text: string): { definition: string; labels: string[] } | null {
  const start = text.search(/==\s*\{\{langue\|fr\}\}\s*==/);
  if (start === -1) return null;
  const rest = text.slice(start + 10);
  const end = rest.search(/\n==\s*\{\{langue\|/);
  const section = end === -1 ? rest : rest.slice(0, end);

  // première ligne de définition : « # … », pas « #* » (exemple) ni « #: »
  const line = section.split("\n").find((l) => /^#(?![*:#])\s*\S/.test(l));
  if (!line) return null;
  let body = line.replace(/^#\s*/, "");

  const labels: string[] = [];
  body = body.replace(/\{\{([^{}|]+)(\|[^{}]*)?\}\}/g, (_m, name: string, args = "") => {
    const n = name.trim().toLowerCase();
    const parts = args.split("|").slice(1).map((p: string) => p.trim());
    if (n === "lexique" || n === "term" || n === "terme") {
      for (const p of parts) if (p && p !== "fr" && !p.includes("=")) labels.push(cap(p));
      return "";
    }
    if (LABEL_TEMPLATES[n]) { labels.push(LABEL_TEMPLATES[n]); return ""; }
    if (n === "w" || n === "lien" || n === "l") return parts[0] ?? "";
    if (n === "siècle" || n === "date") return "";
    // modèle inconnu en tête de ligne = étiquette (« {{mycologie|fr}} ») ; ailleurs on le retire
    if (parts[parts.length - 1] === "fr" && parts.length <= 2) { labels.push(cap(n)); return ""; }
    return "";
  });

  const definition = body
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1") // [[cible|texte]] -> texte
    .replace(/'''?/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*[,;:.]\s*/, "")
    .trim();
  if (definition.length < 3) return null;
  return { definition: cap(definition), labels: [...new Set(labels)] };
}

export async function fetchDefinitions(words: string[]): Promise<WikiResult[]> {
  const titles = words.slice(0, MAX_WORDS);
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: "query", prop: "revisions", rvprop: "content", rvslots: "main",
    titles: titles.join("|"), format: "json", formatversion: "2", redirects: "1", origin: "*",
  }).toString();
  const contact = process.env.WIKTIONARY_CONTACT || "contact non renseigné";
  const res = await fetch(url, {
    headers: { "User-Agent": `Lemezec/2.0 (jeu de vocabulaire ; ${contact})`, "Api-User-Agent": `Lemezec/2.0 (${contact})` },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Wiktionnaire : HTTP ${res.status}`);
  const data = (await res.json()) as {
    query?: {
      normalized?: { from: string; to: string }[];
      redirects?: { from: string; to: string }[];
      pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[];
    };
  };
  const q = data.query ?? {};
  const alias = new Map<string, string>();
  for (const m of [...(q.normalized ?? []), ...(q.redirects ?? [])]) alias.set(m.from, m.to);
  const pages = new Map((q.pages ?? []).map((p) => [p.title, p]));

  return titles.map((word) => {
    let title = word;
    for (let i = 0; i < 3 && alias.has(title); i++) title = alias.get(title)!;
    const page = pages.get(title);
    const content = page && !page.missing ? page.revisions?.[0]?.slots.main.content : undefined;
    const parsed = content ? parseWikitext(content) : null;
    if (!parsed) return { word, found: false };
    return { word, found: true, ...parsed, sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(title)}` };
  });
}
