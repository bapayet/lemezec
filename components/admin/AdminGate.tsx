"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, ServerCog } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useAdmin } from "./useAdmin";

/** N'affiche le contenu qu'à un admin connecté ; sinon renvoie vers la connexion. */
export function AdminGate({ children }: { children: ReactNode }) {
  const a = useAdmin();
  if (a.loading) return <Skeleton className="h-48 rounded-xl" />;
  if (!a.configured) {
    return (
      <div className="rounded-xl bg-surface shadow-card">
        <EmptyState icon={<ServerCog />} title="Serveur non configuré">
          Renseignez les clés Supabase dans .env.local (voir .env.example), puis relancez l&apos;app.
        </EmptyState>
      </div>
    );
  }
  if (!a.admin) {
    return (
      <div className="rounded-xl bg-surface shadow-card">
        <EmptyState
          icon={<Lock />}
          title="Réservé à l'admin"
          action={<Link href="/admin/login" className="inline-flex h-12 items-center rounded-lg bg-accent px-5 text-lg text-on-accent hover:bg-accent-hover">Se connecter</Link>}
        >
          Connectez-vous avec l&apos;adresse admin pour continuer.
        </EmptyState>
      </div>
    );
  }
  return <>{children}</>;
}
