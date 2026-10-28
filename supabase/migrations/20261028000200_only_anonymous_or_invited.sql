-- Supabase compte une connexion anonyme comme une inscription : « Allow new users to sign up » doit rester
-- activé pour que les appareils aient une session. Cette garde ferme la porte aux inscriptions par e-mail :
-- seuls les comptes anonymes et les comptes invités depuis le tableau de bord (invited_at renseigné) sont créés.
create or replace function public.only_anonymous_or_invited() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_anonymous, false) or new.invited_at is not null then
    return new;
  end if;
  raise exception 'Inscription fermée : seuls les comptes invités par l''admin sont acceptés.'
    using errcode = 'P0001';
end $$;

revoke execute on function public.only_anonymous_or_invited() from public, anon, authenticated;

drop trigger if exists only_anonymous_or_invited on auth.users;
create trigger only_anonymous_or_invited
  before insert on auth.users
  for each row execute function public.only_anonymous_or_invited();
