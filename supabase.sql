-- =================================================================
-- MITBRINGLISTE · Supabase / PostgreSQL Setup
-- -----------------------------------------------------------------
-- Ausführen in:  Supabase → SQL Editor → New query → einfügen → Run
-- Das Skript ist idempotent (kann mehrfach ausgeführt werden).
-- =================================================================

-- gen_random_uuid() bereitstellen
create extension if not exists "pgcrypto";


-- =================================================================
-- 1 · TABELLEN
-- =================================================================
create table if not exists public.bring_items (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  required_quantity integer not null check (required_quantity > 0),
  is_active         boolean default true,
  sort_order        integer default 0,
  created_at        timestamptz default now()
);

create table if not exists public.bring_contributions (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references public.bring_items(id) on delete cascade,
  guest_name  text not null,
  quantity    integer not null check (quantity > 0),
  comment     text,
  created_at  timestamptz default now()
);

create index if not exists idx_contrib_item
  on public.bring_contributions(item_id);


-- =================================================================
-- 2 · VIEW MIT STATUS (current / remaining / progress)
--     Optional – das Frontend rechnet zusätzlich selbst.
-- =================================================================
create or replace view public.bring_items_status as
select
  i.id,
  i.title,
  i.description,
  i.required_quantity,
  i.is_active,
  i.sort_order,
  i.created_at,
  coalesce(sum(c.quantity), 0)::int as current_quantity,
  greatest(i.required_quantity - coalesce(sum(c.quantity), 0), 0)::int as remaining_quantity,
  least(
    floor((coalesce(sum(c.quantity), 0)::numeric / i.required_quantity) * 100),
    100
  )::int as progress_percent
from public.bring_items i
left join public.bring_contributions c on c.item_id = i.id
group by i.id;


-- =================================================================
-- 3 · RPC: claim_item()
--     Trägt einen Beitrag ATOMAR ein und verhindert Überbuchung.
--     - sperrt die Item-Zeile (FOR UPDATE) -> serialisiert gleichzeitige
--       Zugriffe, sodass zwei Gäste denselben Punkt nicht überbuchen
--     - prüft current + gewünschte Menge <= required_quantity
--     - gibt ein JSON mit success/message zurück
-- =================================================================
create or replace function public.claim_item(
  p_item_id    uuid,
  p_guest_name text,
  p_quantity   integer,
  p_comment    text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required int;
  v_active   boolean;
  v_current  int;
  v_name     text := nullif(btrim(p_guest_name), '');
  v_qty      int  := coalesce(p_quantity, 1);
begin
  -- Eingaben prüfen
  if v_name is null then
    return jsonb_build_object('success', false, 'message', 'Bitte gib deinen Namen an.');
  end if;
  if v_qty < 1 then
    return jsonb_build_object('success', false, 'message', 'Bitte gib eine Menge von mindestens 1 an.');
  end if;

  -- Item sperren (verhindert gleichzeitige Überbuchung)
  select required_quantity, is_active
    into v_required, v_active
  from public.bring_items
  where id = p_item_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Dieser Punkt existiert nicht mehr.');
  end if;
  if v_active is not true then
    return jsonb_build_object('success', false, 'message', 'Dieser Punkt ist aktuell nicht verfügbar.');
  end if;

  -- aktuelle Summe ermitteln
  select coalesce(sum(quantity), 0)
    into v_current
  from public.bring_contributions
  where item_id = p_item_id;

  -- Überbuchung verhindern
  if v_current + v_qty > v_required then
    return jsonb_build_object(
      'success', false,
      'message', 'Leider ist dieser Punkt inzwischen vollständig vergeben.',
      'remaining', greatest(v_required - v_current, 0)
    );
  end if;

  -- Beitrag speichern
  insert into public.bring_contributions(item_id, guest_name, quantity, comment)
  values (p_item_id, v_name, v_qty, nullif(btrim(p_comment), ''));

  return jsonb_build_object(
    'success', true,
    'message', 'Eintrag gespeichert.',
    'current_quantity', v_current + v_qty,
    'remaining', v_required - (v_current + v_qty)
  );
end;
$$;


-- =================================================================
-- 4 · ROW LEVEL SECURITY (RLS)
-- =================================================================
alter table public.bring_items         enable row level security;
alter table public.bring_contributions enable row level security;

-- aufräumen, falls Policies schon existieren (erneutes Ausführen)
drop policy if exists "items_select"        on public.bring_items;
drop policy if exists "items_admin_all"     on public.bring_items;
drop policy if exists "contrib_select"      on public.bring_contributions;
drop policy if exists "contrib_admin_delete" on public.bring_contributions;

-- Lesen: für alle erlaubt (Gäste sehen Liste & Namen)
create policy "items_select"   on public.bring_items         for select using (true);
create policy "contrib_select" on public.bring_contributions for select using (true);

-- Admin-Operationen laufen mit dem anon-Key (nur durch Frontend-Passwort
-- geschützt – siehe Sicherheitshinweis in der README):
--   * Items anlegen / ändern / löschen
create policy "items_admin_all" on public.bring_items
  for all to anon using (true) with check (true);
--   * einzelne Beiträge löschen (Korrektur durch Admin)
create policy "contrib_admin_delete" on public.bring_contributions
  for delete to anon using (true);

-- HINWEIS: Gäste fügen Beiträge ausschließlich über die Funktion
-- claim_item() hinzu (security definer). Es gibt bewusst KEINE
-- direkte INSERT-Policy für Beiträge -> die Überbuchungs-Prüfung
-- kann nicht umgangen werden.
grant execute on function public.claim_item(uuid, text, integer, text) to anon;


-- =================================================================
-- 5 · REALTIME (Live-Aktualisierung)
-- =================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.bring_items;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.bring_contributions;
  exception when duplicate_object then null; end;
end $$;


-- =================================================================
-- 5b · RSVP / ANMELDUNGEN
-- =================================================================
create table if not exists public.rsvp_responses (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null,
  last_name        text not null,
  attending        boolean not null,
  adults           integer default 0,
  children         integer default 0,
  children_ages    text,
  food_preferences text,
  allergies        text,
  message          text,
  created_at       timestamptz default now()
);

alter table public.rsvp_responses enable row level security;

drop policy if exists "rsvp_insert"       on public.rsvp_responses;
drop policy if exists "rsvp_admin_select" on public.rsvp_responses;
drop policy if exists "rsvp_admin_delete" on public.rsvp_responses;

-- Gäste dürfen ihre Anmeldung speichern (INSERT)
create policy "rsvp_insert" on public.rsvp_responses
  for insert to anon with check (true);

-- Admin (anon, nur durch Frontend-Passwort geschützt) darf lesen & löschen.
-- HINWEIS: Damit sind die Anmeldedaten technisch über die öffentliche API
-- lesbar (siehe Datenschutz-Hinweis in der README).
create policy "rsvp_admin_select" on public.rsvp_responses
  for select to anon using (true);
create policy "rsvp_admin_delete" on public.rsvp_responses
  for delete to anon using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.rsvp_responses;
  exception when duplicate_object then null; end;
end $$;


-- =================================================================
-- 6 · BEISPIEL-ITEMS (nur einfügen, wenn Tabelle leer ist)
-- =================================================================
insert into public.bring_items (title, description, required_quantity, sort_order)
select * from (values
  ('Grüner Salat', 'Frischer Salat als Beilage',        2, 1),
  ('Nudelsalat',   'Klassischer Salat für das Buffet',  2, 2),
  ('Kuchen',       'Kuchen oder süße Kleinigkeit',      3, 3),
  ('Fingerfood',   'Kleine herzhafte Snacks',           4, 4),
  ('Getränke',     'Alkoholfreie Getränke oder Sekt',   2, 5)
) as v(title, description, required_quantity, sort_order)
where not exists (select 1 from public.bring_items);
