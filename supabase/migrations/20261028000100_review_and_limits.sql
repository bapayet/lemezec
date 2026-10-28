-- Drapeaux de relecture issus du nettoyage (mot_courant, nom_propre, sensible…), affichés en S14.
alter table words add column review_flags text[] not null default '{}';
create index words_pending_idx on words (status) where status = 'pending';

-- Renvoi idempotent (insert … on conflict (id) do nothing) : sous RLS, Postgres exige que la ligne
-- déjà présente soit lisible par l'appelant. Chaque session relit donc ses propres évaluations, et seulement elles.
create policy ratings_select_own on word_ratings for select using (user_id = auth.uid());
create policy reports_select_own on word_reports for select using (user_id = auth.uid());

-- Plafond d'évaluations par session : l'appelant ne peut pas lire word_ratings (RLS),
-- donc on lui donne seulement son propre compteur.
create or replace function my_rating_count_24h() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from word_ratings
   where user_id = auth.uid() and created_at > now() - interval '24 hours';
$$;
revoke execute on function my_rating_count_24h() from public, anon;
grant execute on function my_rating_count_24h() to authenticated;
