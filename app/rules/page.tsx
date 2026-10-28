import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Smartphone, Sparkles, ThumbsUp, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Comment jouer" };

const steps = [
  {
    icon: Users,
    title: "Formez la tablée",
    body: [
      "Entrez le prénom de chaque joueur (deux au minimum).",
      "Cochez les niveaux de mots qui vous tentent : simple, moyen, difficile, très difficile.",
    ],
  },
  {
    icon: Smartphone,
    title: "Un tour, un lecteur",
    body: [
      "À chaque tour, l'appli désigne le lecteur, chacun son tour, dans l'ordre de la tablée.",
      "Le lecteur lit le mot à voix haute. Les autres proposent leur définition, sérieuse ou farfelue.",
      "Quand tout le monde a parlé, le lecteur affiche la vraie définition.",
    ],
  },
  {
    icon: Sparkles,
    title: "Les points",
    body: [
      "Le lecteur coche tous ceux qui ont trouvé le sens : chacun marque un point.",
      "Le lecteur, lui, ne marque pas sur son propre mot.",
      "Un mot bancal (définition fausse, mot trop courant) ? Retirez-le de la pioche.",
    ],
  },
  {
    icon: ThumbsUp,
    title: "Notez le mot (si vous voulez)",
    body: [
      "Trop facile, bien dosé, corsé ou introuvable : vos avis ajustent peu à peu le niveau des mots pour tout le monde.",
      "Pressés ? « Mot suivant, sans noter » passe directement au tour d'après.",
    ],
  },
  {
    icon: Flag,
    title: "Fin de partie",
    body: [
      "Arrêtez quand vous voulez avec « Terminer ». Le plus de points l'emporte, les égalités sont permises.",
      "Chaque partie reste dans l'historique, avec les mots joués et qui les a trouvés.",
    ],
  },
];

// S02 Règles
export default function RulesPage() {
  return (
    <>
      <PageHeader title="Comment jouer" back size="back" />
      <main id="contenu" className="mx-auto grid max-w-app gap-4 px-4 pb-12 pt-6">
        <section className="rounded-xl bg-app-gradient p-5 text-on-gradient">
          <h2 className="text-xl">Le principe</h2>
          <p className="mt-2 text-base text-on-gradient-muted">
            Lemezec se joue à plusieurs autour d&apos;un seul téléphone. On découvre des mots rares, on invente leur sens, et on
            repart avec du vocabulaire en plus.
          </p>
        </section>

        <ol className="grid gap-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="grid gap-2 rounded-xl bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-3 text-lg text-text">
                <span aria-hidden className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent"><Icon className="size-5" /></span>
                <span><span className="sr-only">Étape {i + 1} : </span>{title}</span>
              </h2>
              <ul className="grid list-disc gap-1.5 pl-5 text-base text-text-muted marker:text-accent">
                {body.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </li>
          ))}
        </ol>

        <p className="text-center text-xs text-text-muted">
          Définitions issues du Wiktionnaire, sous licence CC BY-SA 4.0.{" "}
          <Link href="/setup" className="font-semibold text-accent underline underline-offset-2">Lancer une partie</Link>
        </p>
      </main>
    </>
  );
}
