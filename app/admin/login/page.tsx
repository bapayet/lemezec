"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, FileUp, LogOut, MailCheck, ServerCog } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { ListRowButton, ListRowLink } from "@/components/ui/ListRow";
import { EmptyState, Skeleton, TextField } from "@/components/ui/misc";
import { useAdmin } from "@/components/admin/useAdmin";
import { browserSupabase } from "@/lib/supabase/browser";

// S13 Espace admin : connexion par lien magique, puis accès à l'import et à la relecture
function AdminHome() {
  const a = useAdmin();
  const linkError = useSearchParams().get("erreur") === "lien";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const sb = browserSupabase();
    if (!sb) return;
    setState("sending");
    setError(undefined);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      // pas de création de compte depuis l'app : l'admin est créé dans le tableau de bord Supabase
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback?next=/admin/review` },
    });
    if (error) {
      setState("idle");
      // même message que l'adresse existe ou non : on ne révèle pas qui est admin
      setError(error.status === 429 ? "Trop de demandes : réessayez dans quelques minutes." : "Envoi impossible. Vérifiez l'adresse.");
      return;
    }
    setState("sent");
  }

  async function signOut() {
    await browserSupabase()?.auth.signOut();
    location.assign("/settings");
  }

  if (a.loading) return <Skeleton className="h-48 rounded-xl" />;
  if (!a.configured) {
    return (
      <div className="rounded-xl bg-surface shadow-card">
        <EmptyState icon={<ServerCog />} title="Serveur non configuré">
          L&apos;app tourne en mode local. Renseignez les clés Supabase dans .env.local (voir .env.example) pour activer l&apos;espace admin.
        </EmptyState>
      </div>
    );
  }
  if (a.admin) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-text-muted">Connecté : {a.email}</p>
        <ListRowLink href="/admin/review" icon={<ClipboardCheck />}>Relire les mots</ListRowLink>
        <ListRowLink href="/admin/import" icon={<FileUp />}>Importer des mots</ListRowLink>
        <ListRowButton icon={<LogOut />} onClick={signOut}>Se déconnecter</ListRowButton>
      </div>
    );
  }
  if (state === "sent") {
    return (
      <div className="rounded-xl bg-surface shadow-card">
        <EmptyState icon={<MailCheck />} title="Vérifiez votre boîte mail">
          Si cette adresse est celle d&apos;un admin, un lien de connexion vient de partir. Ouvrez-le sur cet appareil.
        </EmptyState>
      </div>
    );
  }
  return (
    <form onSubmit={send} className="grid gap-3 rounded-xl bg-surface p-5 shadow-card">
      <h2 className="text-lg text-text">Connexion admin</h2>
      <p className="text-sm text-text-muted">Recevez un lien de connexion par e-mail. Aucun mot de passe.</p>
      {linkError && <p className="text-sm text-danger">Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.</p>}
      <label htmlFor="email" className="text-sm font-semibold text-text">Adresse e-mail</label>
      <TextField id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} errorId="email-err" />
      {error && <p id="email-err" className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={state === "sending"} disabled={!email.includes("@")}>Recevoir le lien</Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <>
      <PageHeader title="Espace admin" back="/settings" size="back" />
      <main id="contenu" className="mx-auto grid max-w-app gap-4 px-4 pb-12 pt-6">
        <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
          <AdminHome />
        </Suspense>
        <p className="text-center text-xs text-text-muted">
          <Link href="/" className="underline underline-offset-2">Retour au jeu</Link>
        </p>
      </main>
    </>
  );
}
