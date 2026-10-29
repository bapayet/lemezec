import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "./PageHeader";
import { LEGAL } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} back size="back" />
      <main id="contenu" className="mx-auto grid max-w-app gap-6 px-4 pb-16 pt-6 text-base text-text">
        {children}
        <p className="text-sm text-text-muted">Dernière mise à jour : {new Date(LEGAL.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        <nav aria-label="Pages légales" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/mentions-legales" className="text-accent underline underline-offset-2">Mentions légales</Link>
          <Link href="/confidentialite" className="text-accent underline underline-offset-2">Confidentialité</Link>
          <Link href="/conditions" className="text-accent underline underline-offset-2">Conditions d&apos;utilisation</Link>
        </nav>
      </main>
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg text-text">{title}</h2>
      <div className="grid gap-2 text-text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-text [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
