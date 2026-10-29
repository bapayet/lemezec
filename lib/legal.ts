// Informations des pages légales. Tout est ici, rien dans les pages.
// Les valeurs « À_COMPLÉTER » bloquent le déploiement : scripts/check-legal.mjs échoue tant qu'il en reste.

export const LEGAL = {
  // éditeur : particulier (LCEN art. 6-III-2 : un éditeur non professionnel peut ne publier que ses nom et
  // contact, à condition d'avoir communiqué son adresse à l'hébergeur)
  publisher: {
    name: "Baptiste",
    email: "baptiste.payet@gmail.com",
  },
  updatedAt: "2026-10-29",
  // hébergeurs et sous-traitants (à revérifier sur leurs sites au moment de publier)
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    site: "https://vercel.com",
  },
  processors: [
    {
      name: "Supabase Inc.",
      role: "base de données, sessions de jeu anonymes, e-mail de connexion de l'administrateur",
      place: "serveurs dans la région choisie pour le projet (Union européenne)",
      site: "https://supabase.com/privacy",
    },
    {
      name: "Vercel Inc.",
      role: "hébergement de l'application, tâche nocturne, mesure d'audience sans cookie",
      place: "États-Unis et réseau mondial ; transferts encadrés par le Data Privacy Framework UE–États-Unis et des clauses contractuelles types",
      site: "https://vercel.com/legal/privacy-policy",
    },
  ],
} as const;
