import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // les tests e2e ont leur propre dossier de build : ils tournent à côté du serveur de dev sans le casser
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // le bouton « N » des outils de dev recouvre l'onglet Accueil : masqué pendant les tests e2e
  devIndicators: process.env.NEXT_PUBLIC_FORCE_LOCAL === "1" ? false : undefined,
};

export default nextConfig;
