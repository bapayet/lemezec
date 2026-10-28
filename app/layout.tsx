import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/shell/AppProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Lemezec", template: "%s · Lemezec" },
  description: "Le jeu des mots rares, à plusieurs sur un seul téléphone.",
  applicationName: "Lemezec",
  appleWebApp: { capable: true, title: "Lemezec", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5a67d8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-accent">
          Aller au contenu
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
