-- =================================================================
-- E-MAIL-BENACHRICHTIGUNGEN
-- Schickt automatisch eine E-Mail an timo_reith@t-online.de,
-- sobald jemand
--   * sich anmeldet (Tabelle rsvp_responses) oder
--   * etwas in der Mitbringliste auswählt (Tabelle bring_contributions).
--
-- Versand über den Dienst "Resend" (https://resend.com, Gratis-Tarif),
-- ausgelöst direkt aus der Supabase-Datenbank (pg_net).
--
-- VORBEREITUNG (einmalig):
--   1. Auf resend.com mit der Adresse  timo_reith@t-online.de  registrieren.
--   2. Unter "API Keys" einen Key erstellen (beginnt mit  re_… ).
--   3. Unten bei  v_api_key  diesen Key eintragen.
--   4. Diese komplette Datei im Supabase SQL-Editor ausführen (Run).
--
-- Hinweis: Mit dem Resend-Test-Absender (onboarding@resend.dev) kann ohne
-- eigene Domain genau an die Adresse gesendet werden, mit der du dich bei
-- Resend registriert hast – also an timo_reith@t-online.de. Perfekt für
-- diese Eigen-Benachrichtigung.
-- =================================================================

-- HTTP-Aufrufe aus der Datenbank ermöglichen
create extension if not exists pg_net;


-- =================================================================
-- 1 · Zentrale Versand-Funktion
-- =================================================================
create or replace function public.send_notice(p_subject text, p_html text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- >>> HIER DEINEN RESEND-API-KEY EINTRAGEN <<<
  v_api_key text := 'RESEND_API_KEY_HIER';

  -- Empfänger & Absender (bei Bedarf anpassen)
  v_to   text := 'timo_reith@t-online.de';
  v_from text := 'Hochzeit C&T <onboarding@resend.dev>';
begin
  -- Solange kein Key eingetragen ist: nichts tun (keine Fehler).
  if v_api_key is null or v_api_key = 'RESEND_API_KEY_HIER' then
    return;
  end if;

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_api_key
               ),
    body    := jsonb_build_object(
                 'from', v_from,
                 'to',   jsonb_build_array(v_to),
                 'subject', p_subject,
                 'html', p_html
               )
  );
end;
$$;


-- =================================================================
-- 2 · Trigger: neue Anmeldung (RSVP)
-- =================================================================
create or replace function public.notify_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_html   text;
begin
  begin
    v_status := case when new.attending then 'Zusage' else 'Absage' end;

    v_html := '<h2>Neue Anmeldung</h2>'
      || '<p><strong>' || coalesce(new.first_name,'') || ' '
      || coalesce(new.last_name,'') || '</strong> &middot; ' || v_status || '</p>';

    if new.attending then
      v_html := v_html
        || '<p>Erwachsene: ' || coalesce(new.adults,0)
        || ' &middot; Kinder: ' || coalesce(new.children,0)
        || coalesce(' (' || new.children_ages || ')', '') || '</p>'
        || coalesce('<p>Essenswünsche: ' || new.food_preferences || '</p>', '')
        || coalesce('<p>Allergien: ' || new.allergies || '</p>', '');
    end if;

    v_html := v_html || coalesce('<p>Nachricht: ' || new.message || '</p>', '');

    perform public.send_notice(
      'Neue Anmeldung: ' || coalesce(new.first_name,'') || ' '
        || coalesce(new.last_name,'') || ' (' || v_status || ')',
      v_html
    );
  exception when others then
    -- E-Mail-Probleme dürfen die Anmeldung NIE blockieren
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_rsvp on public.rsvp_responses;
create trigger trg_notify_rsvp
  after insert on public.rsvp_responses
  for each row execute function public.notify_rsvp();


-- =================================================================
-- 3 · Trigger: neuer Mitbring-Eintrag
-- =================================================================
create or replace function public.notify_bring()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_html  text;
begin
  begin
    select title into v_title from public.bring_items where id = new.item_id;

    v_html := '<h2>Neuer Eintrag in der Mitbringliste</h2>'
      || '<p><strong>' || coalesce(new.guest_name,'') || '</strong> bringt <strong>'
      || coalesce(v_title,'?') || '</strong> mit (Menge: ' || coalesce(new.quantity,1) || ')</p>'
      || coalesce('<p>Kommentar: ' || new.comment || '</p>', '');

    perform public.send_notice(
      'Mitbringliste: ' || coalesce(new.guest_name,'') || ' → ' || coalesce(v_title,'?'),
      v_html
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_bring on public.bring_contributions;
create trigger trg_notify_bring
  after insert on public.bring_contributions
  for each row execute function public.notify_bring();
