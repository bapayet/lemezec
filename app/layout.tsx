import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppProviders } from "@/components/shell/AppProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// adresse publique : fixée par NEXT_PUBLIC_SITE_URL, sinon l'URL de production fournie par Vercel
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const description = "Des mots oubliés, des définitions à deviner, un seul téléphone pour toute la tablée.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Lemezec, le jeu des mots rares", template: "%s · Lemezec" },
  description,
  applicationName: "Lemezec",
  appleWebApp: { capable: true, title: "Lemezec", statusBarStyle: "default" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "Lemezec", title: "Lemezec, le jeu des mots rares", description },
  twitter: { card: "summary_large_image", title: "Lemezec, le jeu des mots rares", description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5a67d8", // token gradient-from (une balise meta ne lit pas les variables CSS)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-accent">
          Aller au contenu
        </a>
        <AppProviders>{children}</AppProviders>
        {/* mesure d'audience sans cookie. Son script n'existe que sur Vercel (et une fois Web Analytics activé
            dans le tableau de bord) : ailleurs, il produirait une 404 à chaque page */}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
