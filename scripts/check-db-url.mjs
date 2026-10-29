// Vérifie le secret SUPABASE_DB_URL avant de lancer la CLI Supabase dans GitHub Actions.
// Affiche la cause probable en clair, sans jamais afficher le mot de passe.
const raw = process.env.SUPABASE_DB_URL ?? "";
const fail = (msg) => { console.error(`::error title=SUPABASE_DB_URL::${msg}`); process.exit(1); };

if (!raw.trim()) {
  fail("Secret vide ou introuvable. Il doit s'appeler exactement SUPABASE_DB_URL et être rangé dans Settings → Environments → production → Environment secrets (ou dans Settings → Secrets and variables → Actions → Repository secrets).");
}
if (raw !== raw.trim()) fail("Le secret commence ou finit par un espace ou un retour à la ligne : recolle-le sans.");
if (/\[YOUR-PASSWORD\]|YOUR-PASSWORD/i.test(raw)) fail("L'adresse contient encore [YOUR-PASSWORD] : remplace-le par le mot de passe de la base (crochets compris).");
if (!/^postgres(ql)?:\/\//.test(raw)) fail("L'adresse doit commencer par postgresql:// (copie-la depuis Supabase → Connect → Connection string).");

let url;
try {
  url = new URL(raw);
} catch {
  fail("Adresse illisible : le mot de passe contient sans doute un caractère spécial (@ # / ? : % espace). Le plus simple : Supabase → Project Settings → Database → Reset database password, choisir un mot de passe en lettres et chiffres seulement, puis refaire le secret.");
}
if (!url.password) fail("Pas de mot de passe dans l'adresse (format attendu : postgresql://postgres.REF:MOTDEPASSE@hôte:5432/postgres).");
if (/@/.test(decodeURIComponent(url.password)) && raw.split("@").length > 2) {
  fail("Le mot de passe contient « @ » : remplace-le par %40 dans l'adresse, ou change le mot de passe pour un mot de passe sans caractère spécial.");
}

const host = url.hostname;
// un « # » ou un « @ » de trop dans le mot de passe décale tout : l'hôte lu n'est plus celui de Supabase
if (url.hash || !/\.supabase\.(com|co)$/.test(host)) {
  fail("L'adresse est mal découpée (hôte lu : « " + host + " »). Le mot de passe contient sans doute un caractère spécial (@ # / ? :). Le plus simple : Supabase → Project Settings → Database → Reset database password, avec lettres et chiffres seulement, puis refaire le secret.");
}
console.log(`hôte : ${host} · port : ${url.port || "5432"} · utilisateur : ${decodeURIComponent(url.username)}`);
if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host)) {
  fail("C'est l'adresse « Direct connection » (db.xxxx.supabase.co), joignable seulement en IPv6 : les machines GitHub ne l'atteignent pas. Prends « Session pooler » dans Supabase → Connect (hôte en …pooler.supabase.com, port 5432).");
}
if (url.port === "6543") {
  fail("Port 6543 = « Transaction pooler », incompatible avec les migrations. Prends « Session pooler » (port 5432) dans Supabase → Connect.");
}
if (!/pooler\.supabase\.com$/.test(host)) console.log("::warning::hôte inattendu : vérifie que c'est bien l'adresse « Session pooler » de Supabase.");
if (!/^postgres\.[a-z0-9]+$/.test(decodeURIComponent(url.username))) {
  console.log("::warning::avec le Session pooler, l'utilisateur doit être de la forme postgres.REF-DU-PROJET.");
}
console.log("✓ secret SUPABASE_DB_URL bien formé");
