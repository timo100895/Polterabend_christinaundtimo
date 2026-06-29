/* =================================================================
   RSVP · eigenes Anmeldeformular (Vanilla JS + Supabase)
   Speichert Anmeldungen in der Tabelle rsvp_responses.
   ================================================================= */
(function () {
  "use strict";

  var cfg = window.BRINGLIST_CONFIG || {};

  var form      = document.getElementById("rsvpForm");
  if (!form) return; // RSVP-Formular nicht auf dieser Seite

  var statusEl  = document.getElementById("rsvpStatus");
  var yesFields = document.getElementById("rsvpYesFields");
  var errorEl   = document.getElementById("rsvpError");
  var submitBtn = document.getElementById("rsvpSubmit");
  var successEl = document.getElementById("rsvpSuccess");
  var successTxt= document.getElementById("rsvpSuccessText");

  function configured() {
    return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
           cfg.SUPABASE_URL.indexOf("DEIN-PROJEKT") === -1 &&
           cfg.SUPABASE_ANON_KEY.indexOf("DEIN-ANON") === -1;
  }
  function showStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
    statusEl.classList.toggle("bl-status--error", !!isError);
  }

  if (!configured()) {
    showStatus("Die Online-Anmeldung ist noch nicht eingerichtet. (Supabase-Daten in config.js eintragen.)", true);
    form.querySelectorAll("input, textarea, button").forEach(function (el) { el.disabled = true; });
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    showStatus("Verbindung zu Supabase konnte nicht geladen werden.", true);
    return;
  }

  // URL säubern: nur die Projekt-URL, ohne /rest/v1 oder Schrägstrich am Ende
  var SB_URL = (cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  var sb = window.supabase.createClient(SB_URL, cfg.SUPABASE_ANON_KEY);

  // Veranstaltung (wedding / polterabend)
  var EVENT_TYPE = cfg.EVENT_TYPE || "wedding";

  /* --- Zusage-Felder ein-/ausblenden --- */
  function getAttending() {
    var checked = form.querySelector('input[name="attending"]:checked');
    return checked ? checked.value : null;
  }
  form.querySelectorAll('input[name="attending"]').forEach(function (r) {
    r.addEventListener("change", function () {
      yesFields.hidden = getAttending() !== "yes";
    });
  });

  /* --- Hilfen --- */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function intVal(id) { var n = parseInt(val(id), 10); return isNaN(n) ? 0 : Math.max(n, 0); }
  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }

  /* --- Absenden --- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var first = val("rsvpFirst");
    var last  = val("rsvpLast");
    var att   = getAttending();
    var message = val("rsvpMessage");

    if (!first) { showError("Bitte gib deinen Vornamen an."); return; }
    if (!last)  { showError("Bitte gib deinen Nachnamen an."); return; }
    if (!att)   { showError("Bitte wähle aus, ob ihr dabei seid."); return; }

    var attending = att === "yes";

    var record = {
      event_type: EVENT_TYPE,
      first_name: first,
      last_name: last,
      attending: attending,
      adults:   attending ? intVal("rsvpAdults") : 0,
      children: attending ? intVal("rsvpChildren") : 0,
      children_ages:    attending ? (val("rsvpAges") || null) : null,
      food_preferences: attending ? (val("rsvpFood") || null) : null,
      allergies:        attending ? (val("rsvpAllergies") || null) : null,
      message: message || null
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Wird gesendet …";

    sb.from("rsvp_responses").insert(record).then(function (res) {
      if (res.error) throw res.error;
      // Erfolg: Formular ausblenden, Erfolgsmeldung zeigen
      form.hidden = true;
      successTxt.textContent = attending
        ? "Eure Zusage ist bei uns angekommen – wir freuen uns riesig auf euch!"
        : "Schade, dass ihr nicht dabei sein könnt. Danke für eure Rückmeldung!";
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }).catch(function (err) {
      console.error(err);
      showError("Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Anmeldung absenden";
    });
  });
})();
