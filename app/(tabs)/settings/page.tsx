"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Database, Moon, RefreshCw, ShieldCheck, Trash, Trash2, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { OfflineBanner, useOnline } from "@/components/shell/AppProviders";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListRowButton, ListRowInfo, ListRowLink } from "@/components/ui/ListRow";
import { SectionLabel } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { db, getMeta } from "@/lib/db";
import { clearWordCache, syncWords } from "@/lib/words/sync";

function ago(iso?: string) {
  if (!iso) return "jamais synchronisé";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `il y a ${h} h` : new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// S05 Réglages
export default function SettingsPage() {
  const toast = useToast();
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const cache = useLiveQuery(async () => ({
    count: await db.words.where("status").equals("active").count(),
    last: await getMeta<string>("lastSyncAt"),
    pending: await db.outbox.count(),
  }));

  async function sync() {
    setSyncing(true);
    try {
      const r = await syncWords();
      toast.show({ message: `Base à jour : ${r.total.toLocaleString("fr-FR")} mots.` });
    } catch {
      toast.show({ message: "Synchronisation impossible. Réessayez quand le réseau revient.", tone: "error" });
    } finally {
      setSyncing(false);
    }
  }

  async function eraseAll() {
    await db.delete();
    // la base se recrée au rechargement, puis la synchro remet les mots
    location.assign("/");
  }

  return (
    <>
      <PageHeader title="Réglages" />
      <OfflineBanner wordCount={cache?.count} />
      <div className="mx-auto grid max-w-app gap-7 px-4 pt-6">
        <section aria-labelledby="mots" className="grid gap-2">
          <SectionLabel><span id="mots">Mots sur cet appareil</span></SectionLabel>
          <ListRowInfo icon={<Database className="text-accent" />} hint={ago(cache?.last)}>
            <span className="text-lg">{cache ? cache.count.toLocaleString("fr-FR") : "…"} mots</span>
            {cache && cache.pending > 0 && (
              <span className="block text-sm font-normal text-text-muted">{cache.pending} évaluation{cache.pending > 1 ? "s" : ""} en attente d&apos;envoi</span>
            )}
          </ListRowInfo>
          <ListRowButton icon={<RefreshCw className={syncing ? "animate-spin" : undefined} />} disabled={!online || syncing} onClick={sync} hint={!online ? "hors ligne" : undefined}>
            {syncing ? "Synchronisation…" : "Mettre à jour les mots"}
          </ListRowButton>
          <ConfirmDialog
            tone="danger"
            trigger={<ListRowButton tone="warning" icon={<Trash />}>Vider le cache des mots</ListRowButton>}
            title="Vider le cache des mots ?"
            description="Les mots seront retéléchargés à la prochaine synchronisation. Vos parties et vos joueurs sont conservés."
            confirmLabel="Vider"
            onConfirm={async () => { await clearWordCache(); toast.show({ message: "Cache vidé." }); if (online) void sync(); }}
          />
        </section>

        <section aria-labelledby="prefs" className="grid gap-2">
          <SectionLabel><span id="prefs">Préférences</span></SectionLabel>
          <ListRowButton icon={<Moon />} disabled hint="Bientôt">Thème sombre</ListRowButton>
          <ListRowButton icon={<Volume2 />} disabled hint="Bientôt">Sons</ListRowButton>
        </section>

        <section aria-labelledby="aide" className="grid gap-2">
          <SectionLabel><span id="aide">Aide</span></SectionLabel>
          <ListRowLink href="/rules" icon={<BookOpen />}>Comment jouer</ListRowLink>
          <ListRowLink href="/admin/login" icon={<ShieldCheck />}>Espace admin</ListRowLink>
        </section>

        <section aria-labelledby="donnees" className="grid gap-2">
          <SectionLabel><span id="donnees">Données</span></SectionLabel>
          <ConfirmDialog
            tone="danger"
            trigger={<ListRowButton tone="danger" icon={<Trash2 />}>Tout effacer sur cet appareil</ListRowButton>}
            title="Tout effacer ?"
            description="Parties, joueurs, statistiques et mots en cache seront supprimés de ce téléphone. C'est définitif."
            confirmLabel="Tout effacer"
            onConfirm={eraseAll}
          />
        </section>

        <footer className="grid gap-1 pb-4 text-center text-xs text-text-muted">
          <p>Lemezec 2.0</p>
          <p>Définitions issues du Wiktionnaire, sous licence CC BY-SA 4.0.</p>
        </footer>
      </div>
    </>
  );
}
