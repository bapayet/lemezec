// File d'envoi : évaluations et signalements partent quand le réseau est là.
// L'id d'une évaluation est créé sur l'appareil, donc un renvoi ne crée pas de doublon côté serveur.
import { db, newId, now } from "./db";
import type { OutboxItem } from "./types";

type NewItem = Omit<Extract<OutboxItem, { kind: "rating" }>, "id" | "createdAt"> | Omit<Extract<OutboxItem, { kind: "report" }>, "id" | "createdAt">;

export async function enqueue(item: NewItem) {
  await db.outbox.add({ ...item, id: newId(), createdAt: now() } as OutboxItem);
}

let flushing = false;

export async function flushOutbox() {
  if (flushing || typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    const items = await db.outbox.orderBy("createdAt").limit(100).toArray();
    const ratings = items.filter((i) => i.kind === "rating");
    const reports = items.filter((i) => i.kind === "report");
    if (ratings.length) {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ratings.map((r) => r.payload)),
      });
      if (res.ok) await db.outbox.bulkDelete(ratings.map((r) => r.id));
    }
    for (const r of reports) {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(r.payload),
      });
      if (res.ok) await db.outbox.delete(r.id);
    }
  } catch {
    // hors ligne ou serveur indisponible : on réessaiera au prochain passage
  } finally {
    flushing = false;
  }
}
