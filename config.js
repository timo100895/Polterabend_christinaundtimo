/* =================================================================
   KONFIGURATION FÜR DIE MITBRINGLISTE
   -----------------------------------------------------------------
   Hier trägst du deine Supabase-Daten und das Admin-Passwort ein.
   (Diese Datei ersetzt die in der Aufgabe genannte assets/js/config.js –
    die Website liegt flach, daher liegt sie direkt im Hauptordner.)
   ================================================================= */

window.BRINGLIST_CONFIG = {

  /* 1) Supabase Project URL
        Supabase → Project Settings → Data API → "Project URL"
        Beispiel: https://abcdxyz.supabase.co */
  SUPABASE_URL: "https://qlnynlvrgojfylmcvpzx.supabase.co",

  /* 2) Supabase anon public Key
        Supabase → Project Settings → API Keys → "anon public"
        (Dieser Key darf öffentlich sein – er ist durch die
         Row-Level-Security-Regeln in supabase.sql abgesichert.) */
  SUPABASE_ANON_KEY: "sb_publishable_8-5XpXBw6RGwdqnAAt6kcw_ZJURdWX1",

  /* 3) Admin-Passwort für admin.html
        ACHTUNG: Dies ist nur ein einfacher Schutz im Browser,
        KEIN hochsicherer Schutz (siehe README). Bitte ändern! */
  ADMIN_PASSWORD: "Hochzeit2026"

};
