import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/shell/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales">
      <Section title="Éditeur">
        <p>
          Lemezec est édité à titre personnel et non professionnel par <strong>{LEGAL.publisher.name}</strong>.
          Contact : <a href={`mailto:${LEGAL.publisher.email}`}>{LEGAL.publisher.email}</a>.
        </p>
        <p>Directeur de la publication : {LEGAL.publisher.name}.</p>
        <p>Les coordonnées postales de l&apos;éditeur ont été communiquées à l&apos;hébergeur, conformément à l&apos;article 6-III-2 de la loi pour la confiance dans l&apos;économie numérique.</p>
      </Section>
      <Section title="Hébergement">
        <p>{LEGAL.host.name}, {LEGAL.host.address} — <a href={LEGAL.host.site}>{LEGAL.host.site.replace("https://", "")}</a></p>
        <p>Base de données : {LEGAL.processors[0].name} — <a href={LEGAL.processors[0].site}>{LEGAL.processors[0].site.replace("https://", "")}</a></p>
      </Section>
      <Section title="Contenus">
        <p>
          Les définitions proviennent du <a href="https://fr.wiktionary.org">Wiktionnaire</a> et sont publiées sous licence{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">Creative Commons BY-SA 4.0</a>. Elles ont parfois été
          remises en forme (espaces, étiquettes) ; elles restent sous la même licence.
        </p>
        <p>Le code, les textes de l&apos;interface et les icônes de Lemezec appartiennent à l&apos;éditeur.</p>
      </Section>
    </LegalPage>
  );
}
