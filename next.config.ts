import { randomUUID } from "node:crypto";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// une révision par compilation : chaque déploiement remplace les pages précachées
const revision = randomUUID();

// pages de l'app, toutes statiques : précachées pour s'ouvrir sans réseau, même jamais visitées
// (le dossier public/, icônes comprises, est précaché automatiquement par Serwist)
const appPages = ["/manifest.webmanifest", "/", "/setup", "/game", "/game/results", "/history", "/history/partie", "/statistics", "/settings", "/rules"];

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // en dev, un service worker servirait d'anciennes versions des fichiers : désactivé
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: appPages.map((url) => ({ url, revision })),
  // la page d'admin n'a rien à faire hors ligne
  exclude: [/\/admin\//, /middleware-manifest\.json$/],
});

const nextConfig: NextConfig = {
  // les tests e2e ont leur propre dossier de build : ils tournent à côté du serveur de dev sans le casser
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // le bouton « N » des outils de dev recouvre l'onglet Accueil : masqué pendant les tests e2e
  devIndicators: process.env.NEXT_PUBLIC_FORCE_LOCAL === "1" ? false : undefined,
};

export default withSerwist(nextConfig);
