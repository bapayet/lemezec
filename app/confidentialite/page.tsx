import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/shell/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Confidentialité" };

export default function Confidentialite() {
  return (
    <LegalPage title="Confidentialité">
      <Section title="En bref">
        <p>
          Lemezec ne vous demande <strong>ni compte, ni nom, ni e-mail</strong> pour jouer. Les prénoms des joueurs, les parties,
          les scores et l&apos;historique restent <strong>sur votre téléphone</strong> et n&apos;en sortent jamais. Seuls les avis sur
          les mots (« trop facile », « introuvable »…) et les mots retirés sont envoyés, rattachés à un identifiant aléatoire,
          pour améliorer la base de mots pour tout le monde.
        </p>
      </Section>

      <Section title="Responsable du traitement">
        <p>{LEGAL.publisher.name} — <a href={`mailto:${LEGAL.publisher.email}`}>{LEGAL.publisher.email}</a></p>
      </Section>

      <Section title="Ce qui reste sur votre appareil">
        <ul>
          <li>les prénoms saisis, les parties, les scores, l&apos;historique et les statistiques ;</li>
          <li>une copie de la base de mots, pour jouer sans réseau.</li>
        </ul>
        <p>Ces données ne sont pas transmises. Vous les supprimez avec <strong>Réglages → Tout effacer sur cet appareil</strong>.</p>
      </Section>

      <Section title="Ce qui est envoyé au serveur">
        <ul>
          <li>un <strong>identifiant de session anonyme</strong>, créé au hasard au premier lancement, sans lien avec votre identité ;</li>
          <li>vos <strong>avis sur les mots</strong> : le mot, l&apos;avis, si quelqu&apos;un l&apos;a trouvé, la date ;</li>
          <li>les <strong>mots retirés</strong> pendant une partie : le mot et la date ;</li>
          <li>comme pour tout site, votre <strong>adresse IP</strong> est traitée techniquement par les hébergeurs (acheminement, sécurité, journaux).</li>
        </ul>
        <p>
          Finalité : faire fonctionner le jeu, corriger et ajuster la difficulté des mots, limiter les abus.
          Base légale : notre intérêt légitime à proposer un jeu de qualité, avec un minimum de données.
        </p>
        <p>
          Durée : ces données sont conservées jusqu&apos;à ce que vous utilisiez « Tout effacer » (la session et ses avis sont
          alors supprimés du serveur) ou que vous nous demandiez leur suppression.
        </p>
        <p>L&apos;administrateur du jeu, seul, se connecte avec son adresse e-mail pour gérer la base de mots.</p>
      </Section>

      <Section title="Cookies et mesure d'audience">
        <p>
          Lemezec n&apos;utilise <strong>aucun cookie publicitaire ni de pistage</strong>. Les seuls cookies sont ceux de la session
          anonyme, strictement nécessaires au fonctionnement : ils ne demandent pas de consentement. La mesure d&apos;audience
          (pages vues, sans cookie et sans identifiant personnel) est assurée par Vercel Web Analytics.
        </p>
      </Section>

      <Section title="Sous-traitants">
        <ul>
          {LEGAL.processors.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> : {p.role} ; {p.place}. <a href={p.site}>Politique de confidentialité</a>
            </li>
          ))}
        </ul>
        <p>
          Lors d&apos;un import de mots par l&apos;administrateur, le serveur interroge le Wiktionnaire (Wikimedia Foundation) : aucune
          donnée de joueur n&apos;est transmise.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les faire rectifier ou effacer, et vous opposer à leur traitement, en écrivant à{" "}
          <a href={`mailto:${LEGAL.publisher.email}`}>{LEGAL.publisher.email}</a>. Comme vos données serveur ne sont rattachées
          qu&apos;à un identifiant anonyme, le plus simple reste « Tout effacer » dans les réglages. Vous pouvez aussi adresser une
          réclamation à la <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
