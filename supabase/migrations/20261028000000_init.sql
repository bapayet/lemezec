-- Lemezec : schéma serveur (Postgres sur Supabase), première migration.
-- Seule la base de mots et les retours sur les mots vivent ici.
-- Les parties, joueurs, tours et l'historique restent sur l'appareil (IndexedDB) : voir architecture.md.
-- Accès : row level security (RLS) Supabase. Chaque appareil ouvre une session anonyme Supabase ;
-- le propriétaire se connecte par lien magique et figure dans `admins`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type word_difficulty as enum ('simple', 'moyen', 'difficile', 'tres_difficile');
create type word_status     as enum ('pending', 'active', 'hidden');          -- pending = importé, pas encore relu
create type word_source     as enum ('legacy', 'wiktionary', 'sheet', 'manual', 'sample');
create type word_rating     as enum ('trop_facile', 'bien', 'complique', 'impossible');

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- admins : qui peut importer, relire, masquer des mots
-- ---------------------------------------------------------------------------

create table admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- import_batches : un import (liste Wiktionnaire, Google Sheet, exemples, reprise de l'ancienne base)
-- ---------------------------------------------------------------------------

create table import_batches (
  id          uuid primary key default gen_random_uuid(),
  source      word_source not null,
  input       jsonb not null default '{}',          -- liste de mots demandés ou URL du Sheet
  status      text not null default 'preview'
    check (status in ('preview', 'committed', 'failed')),
  stats       jsonb not null default '{}',          -- {found, not_found, duplicates, inserted}
  errors      jsonb not null default '[]',
  created_by  uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on import_batches (created_by, created_at desc);
create trigger import_batches_updated before update on import_batches
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- words : la base de mots partagée par tous les appareils
-- ---------------------------------------------------------------------------

create table words (
  id                  uuid primary key default gen_random_uuid(),
  word                text not null check (length(trim(word)) between 2 and 60),
  -- clé de dédoublonnage : minuscules + NFC, accents CONSERVÉS (pécher ≠ pêcher)
  word_key            text generated always as (lower(normalize(trim(word), NFC))) stored,
  definition          text not null check (length(trim(definition)) between 3 and 600),
  labels              text[] not null default '{}',         -- étiquettes du dictionnaire : Médecine, Vieilli, Rare… (indices en jeu)
  difficulty          word_difficulty not null,             -- choisie à l'import ou par l'admin
  difficulty_computed word_difficulty,                      -- recalculée chaque nuit depuis les évaluations
  status              word_status not null default 'pending',
  source              word_source not null,
  source_url          text,                                 -- page Wiktionnaire, pour l'attribution
  license             text check (license in ('CC-BY-SA-4.0', 'own')),
  import_batch_id     uuid references import_batches(id) on delete set null,
  -- refuse les suffixes/préfixes (« -eraie ») et les entrées qui ne sont pas des mots
  constraint word_is_a_word check (word !~ '^[-'' ]|[-'' ]$' and word !~ '[0-9]'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index words_word_key_unique on words (word_key);
create index on words (updated_at);                         -- synchro incrémentale
create index on words (status, difficulty);
create index on words (import_batch_id);
create trigger words_updated before update on words
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- word_ratings : « Comment était ce mot ? » envoyé depuis la file d'attente de l'appareil
-- id fourni par le client => un renvoi est idempotent (on conflict do nothing)
-- ---------------------------------------------------------------------------

create table word_ratings (
  id         uuid primary key,                                -- généré sur l'appareil
  word_id    uuid not null references words(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating     word_rating not null,
  found      boolean not null,                                -- quelqu'un a-t-il trouvé le mot ?
  rated_at   timestamptz not null,                            -- heure sur l'appareil (peut être hors ligne)
  created_at timestamptz not null default now()
);
create index on word_ratings (word_id);
create index on word_ratings (user_id, created_at);

-- ---------------------------------------------------------------------------
-- word_reports : « Supprimer ce mot » en partie = masqué sur l'appareil + signalé ici
-- ---------------------------------------------------------------------------

create table word_reports (
  id         uuid primary key default gen_random_uuid(),
  word_id    uuid not null references words(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason     text not null default 'other'
    check (reason in ('not_french_definition', 'not_a_word', 'wrong_definition', 'offensive', 'other')),
  resolved   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (word_id, user_id)                                   -- un signalement par appareil et par mot
);
create index on word_reports (resolved, created_at);
create trigger word_reports_updated before update on word_reports
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Vue des stats par mot (admin + recalcul de difficulté)
-- ---------------------------------------------------------------------------

create view word_stats with (security_invoker = true) as
select
  w.id as word_id,
  count(r.*)                                              as ratings,
  count(*) filter (where r.rating = 'trop_facile')        as trop_facile,
  count(*) filter (where r.rating = 'bien')               as bien,
  count(*) filter (where r.rating = 'complique')          as complique,
  count(*) filter (where r.rating = 'impossible')         as impossible,
  avg(case r.rating when 'trop_facile' then 0 when 'bien' then 1
                    when 'complique' then 2 when 'impossible' then 3 end) as score,
  avg(case when r.found then 1.0 else 0.0 end)            as found_rate,
  (select count(*) from word_reports p where p.word_id = w.id and not p.resolved) as open_reports
from words w
left join word_ratings r on r.word_id = w.id
group by w.id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table admins         enable row level security;
alter table import_batches enable row level security;
alter table words          enable row level security;
alter table word_ratings   enable row level security;
alter table word_reports   enable row level security;

-- admins : chacun voit seulement s'il est admin ; l'ajout se fait à la main (SQL / dashboard)
create policy admins_self_read on admins for select using (user_id = auth.uid());

-- words : tout le monde (session anonyme comprise) lit les mots actifs ET masqués
-- (les masqués servent de « pierre tombale » pour la synchro). Les mots en attente : admin seulement.
create policy words_read on words for select
  using (status in ('active', 'hidden') or is_admin());
create policy words_admin_insert on words for insert with check (is_admin());
create policy words_admin_update on words for update using (is_admin()) with check (is_admin());
-- pas de delete : on masque (status = 'hidden') pour que les appareils l'apprennent à la synchro

-- import_batches : admin seulement
create policy import_admin_all on import_batches for all using (is_admin()) with check (is_admin());

-- word_ratings : chaque session insère les siennes, l'admin lit tout
create policy ratings_insert_own on word_ratings for insert
  with check (user_id = auth.uid());
create policy ratings_admin_read on word_ratings for select using (is_admin());

-- word_reports : chaque session insère les siens, l'admin lit et résout
create policy reports_insert_own on word_reports for insert
  with check (user_id = auth.uid());
create policy reports_admin_read on word_reports for select using (is_admin());
create policy reports_admin_update on word_reports for update using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Recalcul nocturne de la difficulté (appelé par le cron, rôle service)
-- Au moins 5 évaluations. Score moyen 0..3 => 4 niveaux.
-- ---------------------------------------------------------------------------

create or replace function recompute_difficulty() returns integer
language sql security definer set search_path = public as $$
  with s as (
    select word_id, score from word_stats where ratings >= 5
  ), upd as (
    update words w
       set difficulty_computed = case
             when s.score < 0.75 then 'simple'::word_difficulty
             when s.score < 1.50 then 'moyen'
             when s.score < 2.25 then 'difficile'
             else 'tres_difficile' end
      from s
     where w.id = s.word_id
       and w.difficulty_computed is distinct from case
             when s.score < 0.75 then 'simple'::word_difficulty
             when s.score < 1.50 then 'moyen'
             when s.score < 2.25 then 'difficile'
             else 'tres_difficile' end
    returning 1
  )
  select count(*)::int from upd;
$$;
revoke execute on function recompute_difficulty() from public, anon, authenticated;
