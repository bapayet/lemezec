// Service worker de Lemezec : l'app se charge et se joue sans réseau.
// - précache : tous les fichiers de la compilation (_next/static, polices) + les pages statiques de l'app
// - les données (mots, parties) vivent déjà dans IndexedDB : rien à mettre en cache côté API
// - API, auth et Supabase passent toujours par le réseau, jamais par un cache (pas de session ni de mots périmés)
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const sameOrigin = (url: URL) => url.origin === self.location.origin;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // /game/results?id=… et /history/partie?id=… lisent l'id côté appareil : la même page précachée
    // sert pour toutes les parties. Sans ça, hors ligne, on retombait sur l'accueil (BUG-007).
    ignoreURLParametersMatching: [/^id$/, /^utm_/, /^fbclid$/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // jamais en cache : synchro des mots, évaluations, admin, retour du lien magique
    { matcher: ({ url }) => sameOrigin(url) && /^\/(api|auth)\//.test(url.pathname), handler: new NetworkOnly() },
    // jamais en cache : Supabase et tout autre domaine (auth, données)
    { matcher: ({ url }) => !sameOrigin(url), handler: new NetworkOnly() },
    // pages : réseau d'abord (version fraîche en ligne), cache si hors ligne ou trop lent
    {
      matcher: ({ request, url }) => sameOrigin(url) && request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 3 }),
    },
    // données RSC des pages (navigation interne) : réseau d'abord ; hors ligne, Next.js retombe sur la page entière
    {
      matcher: ({ request, url }) => sameOrigin(url) && request.headers.get("RSC") === "1",
      handler: new NetworkFirst({ cacheName: "pages-rsc", networkTimeoutSeconds: 3 }),
    },
    // le reste du même domaine (fichiers statiques, polices, images…) : règles par défaut de Serwist
    ...defaultCache.filter((rule) => {
      const name = (rule.handler as { cacheName?: string }).cacheName ?? "";
      return !/apis|cross-origin|others/.test(name);
    }),
  ],
  fallbacks: {
    // page jamais visitée et hors ligne : on renvoie l'accueil précaché, qui sait reprendre la partie
    entries: [{ url: "/", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
