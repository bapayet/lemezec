# Lemezec

Le jeu des mots rares : une tablée, un seul téléphone. Un joueur lit un mot oublié, les autres inventent sa définition, le lecteur révèle la vraie.

- **App** : Next.js 15 (App Router) + Tailwind 4, installable (PWA) et jouable hors ligne.
- **Parties** : entièrement sur l'appareil (IndexedDB via Dexie).
- **Base de mots, notes, signalements, admin** : Supabase (Postgres + RLS + auth anonyme / lien magique).
- Définitions issues du Wiktionnaire, sous licence CC BY-SA 4.0.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les clés Supabase (voir ../replica/backend.md)
npm run dev
```

Sans clés Supabase, l'app tourne en **mode local** : mots servis depuis `lib/server/seed-words.json`, rien n'est envoyé au serveur.

## Base de données

- Migrations : `supabase/migrations/` (appliquées automatiquement au déploiement, voir `.github/workflows/migrations.yml`).
- Charger la base de mots : `npm run db:import` (`db:import:dry` pour un essai à blanc).
- Diagnostic du projet branché, sans afficher les clés : `npm run db:check`.

## Tests

```bash
npm test               # unitaires + règles d'accès Supabase (PGlite)
npm run test:e2e       # parcours Playwright + accessibilité axe (serveur de dev isolé, mode local)
npm run test:offline   # hors ligne sur une compilation de production
```

Les tests e2e ne touchent jamais au vrai Supabase : le serveur de test est forcé en mode local, et `e2e/global-setup.ts` arrête tout sinon.

## Scripts utiles

| commande | rôle |
| --- | --- |
| `npm run seed` | régénère `lib/server/seed-words.json` depuis `../replica/data/mots_nettoyes.csv` |
| `python -I scripts/make-icons.py` | redessine les icônes depuis les tokens du design |
| `python -I ../replica/design/gen_tokens.py app/styles` | régénère `tokens.css` et `theme.css` |

Documentation du projet (recon, architecture, design, tests, déploiement) : `../replica/`.
