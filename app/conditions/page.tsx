import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/shell/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function Conditions() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <Section title="Le service">
        <p>Lemezec est un jeu gratuit, sans compte, proposé tel quel. Il peut évoluer, être interrompu ou s&apos;arrêter sans préavis.</p>
      </Section>
      <Section title="Les mots et leurs définitions">
        <p>
          Les définitions viennent du Wiktionnaire, sous licence CC BY-SA 4.0. Elles peuvent contenir des erreurs : le jeu sert à
          s&apos;amuser et à découvrir des mots, pas de référence. Un mot vous semble faux ou choquant ? Retirez-le pendant la partie :
          il nous est signalé.
        </p>
      </Section>
      <Section title="Bon usage">
        <p>
          N&apos;essayez pas de perturber le service (envois massifs, tentatives d&apos;accès à l&apos;administration). Les envois sont
          limités par appareil.
        </p>
      </Section>
      <Section title="Responsabilité">
        <p>
          L&apos;éditeur ne saurait être tenu responsable d&apos;une indisponibilité du service ni de la perte des données gardées
          sur votre appareil (parties, historique) : elles ne sont pas sauvegardées ailleurs.
        </p>
      </Section>
      <Section title="Contact et droit applicable">
        <p>
          Contact : <a href={`mailto:${LEGAL.publisher.email}`}>{LEGAL.publisher.email}</a>. Ces conditions relèvent du droit
          français.
        </p>
      </Section>
    </LegalPage>
  );
}
