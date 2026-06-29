-- =================================================================
-- ERWEITERUNG: event_type  (Hochzeit & Polterabend in EINER Datenbank)
-- -----------------------------------------------------------------
-- Einmal im Supabase SQL-Editor ausführen (idempotent).
-- Danach unterscheiden bring_items und rsvp_responses zwischen
--   'wedding'      = Hochzeitsseite
--   'polterabend'  = Polterabend-Seite
-- =================================================================

-- Spalten ergänzen (bestehende Zeilen werden automatisch 'wedding')
alter table public.bring_items
  add column if not exists event_type text not null default 'wedding';

alter table public.rsvp_responses
  add column if not exists event_type text not null default 'wedding';

create index if not exists idx_items_event on public.bring_items(event_type);
create index if not exists idx_rsvp_event  on public.rsvp_responses(event_type);


-- =================================================================
-- Beispiel-Items für den Polterabend (nur, wenn noch keine da sind)
-- =================================================================
insert into public.bring_items (title, description, required_quantity, sort_order, event_type)
select * from (values
  ('Salat',      'Ein frischer Salat fürs Buffet',  3, 1, 'polterabend'),
  ('Kuchen',     'Kuchen oder süße Kleinigkeit',    3, 2, 'polterabend'),
  ('Fingerfood', 'Kleine herzhafte Snacks',         4, 3, 'polterabend')
) as v(title, description, required_quantity, sort_order, event_type)
where not exists (select 1 from public.bring_items where event_type = 'polterabend');
