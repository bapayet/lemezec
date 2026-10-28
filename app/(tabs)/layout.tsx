import { TabBar } from "@/components/shell/TabBar";

/** Écrans avec la barre d'onglets : accueil, historique, stats, réglages. */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main id="contenu" className="pb-[calc(var(--lz-layout-tabbar)+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
      <TabBar />
    </>
  );
}
