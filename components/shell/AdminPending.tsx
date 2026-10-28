import Link from "next/link";
import { ServerCog } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "@/components/ui/misc";

/** Écrans admin en attente du backend (/replica-backend) : connexion, import, relecture. */
export function AdminPending({ title, what }: { title: string; what: string }) {
  return (
    <>
      <PageHeader title={title} back="/settings" size="back" />
      <main id="contenu" className="mx-auto max-w-app px-4 pt-6">
        <div className="rounded-xl bg-surface shadow-card">
          <EmptyState
            icon={<ServerCog />}
            title="Bientôt disponible"
            action={<Link href="/settings" className="font-semibold text-accent underline underline-offset-2">Retour aux réglages</Link>}
          >
            {what} arrive avec le serveur (connexion admin et base Supabase).
          </EmptyState>
        </div>
      </main>
    </>
  );
}
