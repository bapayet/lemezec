import type { MetadataRoute } from "next";

// Manifeste PWA : Lemezec s'installe sur l'écran d'accueil et s'ouvre en plein écran, hors ligne compris.
// Couleurs = tokens gradient-from / bg (un manifeste ne peut pas lire les variables CSS).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lemezec, le jeu des mots rares",
    short_name: "Lemezec",
    description: "Des mots oubliés, des définitions à deviner, un seul téléphone pour toute la tablée.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#5a67d8",
    theme_color: "#5a67d8",
    categories: ["games", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
