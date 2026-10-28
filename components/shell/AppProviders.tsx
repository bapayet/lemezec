"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { db, getMeta } from "@/lib/db";
import { flushOutbox } from "@/lib/outbox";
import { syncWords } from "@/lib/words/sync";
import { ToastProvider } from "@/components/ui/Toast";

const SYNC_EVERY_MS = 60 * 60 * 1000;

const OnlineContext = createContext(true);
export const useOnline = () => useContext(OnlineContext);

export function AppProviders({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => { setOnline(true); void background(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    // Safari efface le stockage d'un site non installé après 7 jours sans visite : on demande la persistance
    void navigator.storage?.persist?.();
    void background();
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  return (
    <OnlineContext.Provider value={online}>
      <ToastProvider>{children}</ToastProvider>
    </OnlineContext.Provider>
  );
}

async function background() {
  if (!navigator.onLine) return;
  const last = await getMeta<string>("lastSyncAt");
  const empty = (await db.words.count()) === 0;
  if (empty || !last || Date.now() - Date.parse(last) > SYNC_EVERY_MS) {
    await syncWords().catch(() => {});
  }
  await flushOutbox();
}

export function OfflineBanner({ wordCount }: { wordCount?: number }) {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="flex items-center justify-center gap-2 bg-surface-muted px-4 py-2 text-xs text-text-muted">
      <WifiOff aria-hidden className="size-4" />
      Hors ligne{wordCount !== undefined ? ` : ${wordCount.toLocaleString("fr-FR")} mots jouables sur cet appareil` : ""}
    </p>
  );
}
