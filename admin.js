/* =================================================================
   MITBRINGLISTE · Admin-Logik (Vanilla JS + Supabase)
   Hinweis: Der Passwortschutz ist nur ein EINFACHER Schutz im
   Browser, KEIN hochsicherer Schutz (siehe README).
   ================================================================= */
(function () {
  "use strict";

  var cfg = window.BRINGLIST_CONFIG || {};
  var EVENT_TYPE = cfg.EVENT_TYPE || "wedding";   // wedding / polterabend

  var loginView  = document.getElementById("loginView");
  var adminView  = document.getElementById("adminView");
  var loginForm  = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var passInput  = document.getElementById("adminPass");
  var logoutBtn  = document.getElementById("logoutBtn");
  var statusEl   = document.getElementById("adminStatus");
  var listEl     = document.getElementById("adminList");
  var newForm    = document.getElementById("newItemForm");
  var newError   = document.getElementById("newItemError");

  var SESSION_KEY = "bl_admin_ok";
  var sb = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function setStatus(t, isErr) {
    statusEl.textContent = t || "";
    statusEl.hidden = !t;
    statusEl.classList.toggle("bl-status--error", !!isErr);
  }
  function configured() {
    return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
           cfg.SUPABASE_URL.indexOf("DEIN-PROJEKT") === -1 &&
           cfg.SUPABASE_ANON_KEY.indexOf("DEIN-ANON") === -1;
  }

  /* ===============================================================
     Login
     =============================================================== */
  function showAdmin() {
    loginView.hidden = true;
    adminView.hidden = false;
    initSupabase();
    load();
    loadRsvp();
  }
  function initSupabase() {
    if (sb) return;
    if (!configured()) { setStatus("Supabase ist noch nicht konfiguriert (config.js).", true); return; }
    if (!window.supabase) { setStatus("Supabase-Bibliothek konnte nicht geladen werden.", true); return; }
    // URL säubern: nur die Projekt-URL, ohne /rest/v1 oder Schrägstrich am Ende
    var SB_URL = (cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
    sb = window.supabase.createClient(SB_URL, cfg.SUPABASE_ANON_KEY);
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var pw = passInput.value || "";
    if (pw && pw === cfg.ADMIN_PASSWORD) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (x) {}
      showAdmin();
    } else {
      loginError.textContent = "Falsches Passwort.";
      loginError.hidden = false;
      passInput.value = "";
      passInput.focus();
    }
  });

  logoutBtn.addEventListener("click", function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (x) {}
    adminView.hidden = true;
    loginView.hidden = false;
    passInput.value = "";
  });

  // bereits in dieser Sitzung eingeloggt?
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") showAdmin();
  } catch (x) {}

  /* ===============================================================
     Daten laden & rendern
     =============================================================== */
  function load() {
    if (!sb) return;
    setStatus("Lädt …");
    Promise.all([
      sb.from("bring_items").select("*").eq("event_type", EVENT_TYPE).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("bring_contributions").select("*").order("created_at", { ascending: true })
    ]).then(function (res) {
      if (res[0].error) throw res[0].error;
      if (res[1].error) throw res[1].error;
      renderAdmin(res[0].data || [], res[1].data || []);
      setStatus("");
    }).catch(function (err) {
      console.error(err);
      setStatus("Daten konnten nicht geladen werden: " + (err.message || err), true);
    });
  }

  function renderAdmin(items, contributions) {
    var byItem = {};
    contributions.forEach(function (c) { (byItem[c.item_id] = byItem[c.item_id] || []).push(c); });

    if (!items.length) { listEl.innerHTML = '<p style="color:var(--color-body)">Noch keine Punkte angelegt.</p>'; return; }

    listEl.innerHTML = items.map(function (it) {
      var cs = byItem[it.id] || [];
      var current = cs.reduce(function (s, c) { return s + (c.quantity || 0); }, 0);

      var contribHtml = cs.length
        ? cs.map(function (c) {
            return '<div class="admin-contrib">' +
              '<span>' + esc(c.guest_name) + ' · ' + c.quantity +
                (c.comment ? ' · „' + esc(c.comment) + '“' : '') + '</span>' +
              '<button class="admin-contrib__del" type="button" data-del-contrib="' + c.id + '">löschen</button>' +
            '</div>';
          }).join("")
        : '<p class="admin-row__small" style="margin-top:10px;">Noch keine Beiträge.</p>';

      return '' +
        '<div class="admin-row">' +
          '<div class="admin-row__head">' +
            '<span class="admin-row__title">' + esc(it.title) + '</span>' +
            '<span class="admin-row__small">' + current + '/' + it.required_quantity +
              ' · ' + (it.is_active ? 'aktiv' : 'inaktiv') + '</span>' +
          '</div>' +
          (it.description ? '<p class="admin-row__small">' + esc(it.description) + '</p>' : '') +
          contribHtml +
          '<div class="admin-actions">' +
            '<button class="btn btn--ghost btn--mini" type="button" data-toggle="' + it.id + '" data-active="' + it.is_active + '">' +
              (it.is_active ? 'Auf inaktiv setzen' : 'Aktiv setzen') + '</button>' +
            '<button class="btn btn--danger btn--mini" type="button" data-del-item="' + it.id + '">Punkt löschen</button>' +
          '</div>' +
        '</div>';
    }).join("");
  }

  /* ===============================================================
     Aktionen
     =============================================================== */
  // Neues Item anlegen
  newForm.addEventListener("submit", function (e) {
    e.preventDefault();
    newError.hidden = true;
    if (!sb) { setStatus("Nicht mit Supabase verbunden.", true); return; }

    var title = (document.getElementById("niTitle").value || "").trim();
    var desc  = (document.getElementById("niDesc").value || "").trim();
    var qty   = parseInt(document.getElementById("niQty").value, 10);
    var sort  = parseInt(document.getElementById("niSort").value, 10) || 0;
    var active = document.getElementById("niActive").checked;

    if (!title) { newError.textContent = "Bitte einen Titel angeben."; newError.hidden = false; return; }
    if (!qty || qty < 1) { newError.textContent = "Benötigte Anzahl muss mindestens 1 sein."; newError.hidden = false; return; }

    sb.from("bring_items").insert({
      title: title, description: desc || null,
      required_quantity: qty, sort_order: sort, is_active: active,
      event_type: EVENT_TYPE
    }).then(function (res) {
      if (res.error) throw res.error;
      newForm.reset();
      document.getElementById("niQty").value = "1";
      document.getElementById("niActive").checked = true;
      setStatus("Punkt hinzugefügt.");
      load();
    }).catch(function (err) {
      console.error(err);
      newError.textContent = "Konnte nicht gespeichert werden: " + (err.message || err);
      newError.hidden = false;
    });
  });

  // Klicks in der Liste (Toggle / Löschen)
  listEl.addEventListener("click", function (e) {
    var t = e.target;

    var toggle = t.closest("[data-toggle]");
    if (toggle) {
      var isActive = toggle.getAttribute("data-active") === "true";
      sb.from("bring_items").update({ is_active: !isActive }).eq("id", toggle.getAttribute("data-toggle"))
        .then(function (res) { if (res.error) throw res.error; load(); })
        .catch(function (err) { setStatus("Fehler: " + (err.message || err), true); });
      return;
    }

    var delItem = t.closest("[data-del-item]");
    if (delItem) {
      if (!confirm("Diesen Punkt wirklich löschen? Alle zugehörigen Beiträge werden ebenfalls entfernt.")) return;
      sb.from("bring_items").delete().eq("id", delItem.getAttribute("data-del-item"))
        .then(function (res) { if (res.error) throw res.error; setStatus("Punkt gelöscht."); load(); })
        .catch(function (err) { setStatus("Fehler: " + (err.message || err), true); });
      return;
    }

    var delC = t.closest("[data-del-contrib]");
    if (delC) {
      if (!confirm("Diesen Beitrag wirklich löschen?")) return;
      sb.from("bring_contributions").delete().eq("id", delC.getAttribute("data-del-contrib"))
        .then(function (res) { if (res.error) throw res.error; setStatus("Beitrag gelöscht."); load(); })
        .catch(function (err) { setStatus("Fehler: " + (err.message || err), true); });
      return;
    }
  });


  /* ===============================================================
     ANMELDUNGEN (RSVP)
     =============================================================== */
  var rsvpData = [];
  var rsvpFilter = "all";
  var rsvpList    = document.getElementById("rsvpList");
  var rsvpSummary = document.getElementById("rsvpSummary");

  function loadRsvp() {
    if (!sb || !rsvpList) return;
    sb.from("rsvp_responses").select("*").eq("event_type", EVENT_TYPE).order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        rsvpData = res.data || [];
        renderRsvp();
      })
      .catch(function (err) {
        console.error(err);
        rsvpList.innerHTML = '<p class="bl-status bl-status--error">Anmeldungen konnten nicht geladen werden: ' + esc(err.message || err) + '</p>';
      });
  }

  function renderRsvp() {
    var yes = rsvpData.filter(function (r) { return r.attending; });
    var no  = rsvpData.filter(function (r) { return !r.attending; });
    var adults   = yes.reduce(function (s, r) { return s + (r.adults || 0); }, 0);
    var children = yes.reduce(function (s, r) { return s + (r.children || 0); }, 0);

    rsvpSummary.innerHTML =
      '<span class="rsvp-stat"><strong>' + yes.length + '</strong> Zusagen</span>' +
      '<span class="rsvp-stat"><strong>' + no.length + '</strong> Absagen</span>' +
      '<span class="rsvp-stat"><strong>' + adults + '</strong> Erwachsene</span>' +
      '<span class="rsvp-stat"><strong>' + children + '</strong> Kinder</span>' +
      '<span class="rsvp-stat"><strong>' + (adults + children) + '</strong> Personen gesamt</span>';

    var rows = rsvpData;
    if (rsvpFilter === "yes") rows = yes;
    if (rsvpFilter === "no")  rows = no;

    if (!rows.length) {
      rsvpList.innerHTML = '<p style="color:var(--color-body)">Noch keine Anmeldungen in dieser Ansicht.</p>';
      return;
    }

    rsvpList.innerHTML = rows.map(function (r) {
      var when = "";
      try { when = new Date(r.created_at).toLocaleDateString("de-DE"); } catch (e) {}
      var details = "";
      if (r.attending) {
        details =
          '<p class="admin-row__small">Erwachsene: ' + (r.adults || 0) + ' · Kinder: ' + (r.children || 0) +
            (r.children_ages ? ' (' + esc(r.children_ages) + ')' : '') + '</p>' +
          (r.food_preferences ? '<p class="admin-row__small">Essen: ' + esc(r.food_preferences) + '</p>' : '') +
          (r.allergies ? '<p class="admin-row__small">Allergien: ' + esc(r.allergies) + '</p>' : '');
      }
      return '' +
        '<div class="admin-row">' +
          '<div class="admin-row__head">' +
            '<span class="admin-row__title">' + esc(r.first_name) + ' ' + esc(r.last_name) + '</span>' +
            '<span class="admin-row__small">' + (r.attending ? 'Zusage' : 'Absage') + ' · ' + when + '</span>' +
          '</div>' +
          details +
          (r.message ? '<p class="admin-row__small">„' + esc(r.message) + '“</p>' : '') +
          '<div class="admin-actions">' +
            '<button class="btn btn--danger btn--mini" type="button" data-del-rsvp="' + r.id + '">Löschen</button>' +
          '</div>' +
        '</div>';
    }).join("");
  }

  // Filter-Buttons
  var rsvpAdmin = document.getElementById("rsvpAdmin");
  if (rsvpAdmin) {
    rsvpAdmin.addEventListener("click", function (e) {
      var fb = e.target.closest("[data-filter]");
      if (fb) {
        rsvpFilter = fb.getAttribute("data-filter");
        rsvpAdmin.querySelectorAll("[data-filter]").forEach(function (b) { b.classList.remove("is-active"); });
        fb.classList.add("is-active");
        renderRsvp();
        return;
      }
      var del = e.target.closest("[data-del-rsvp]");
      if (del) {
        if (!confirm("Diese Anmeldung wirklich löschen?")) return;
        sb.from("rsvp_responses").delete().eq("id", del.getAttribute("data-del-rsvp"))
          .then(function (res) { if (res.error) throw res.error; setStatus("Anmeldung gelöscht."); loadRsvp(); })
          .catch(function (err) { setStatus("Fehler: " + (err.message || err), true); });
      }
    });
  }

  // CSV-Export
  var csvBtn = document.getElementById("rsvpCsvBtn");
  if (csvBtn) {
    csvBtn.addEventListener("click", function () {
      if (!rsvpData.length) { setStatus("Keine Anmeldungen zum Exportieren.", false); return; }
      var cols = ["first_name","last_name","attending","adults","children","children_ages","food_preferences","allergies","message","created_at"];
      var head = ["Vorname","Nachname","Teilnahme","Erwachsene","Kinder","Kinder-Alter","Essenswünsche","Allergien","Nachricht","Erstellt"];
      function cell(v) {
        if (v === null || v === undefined) v = "";
        if (typeof v === "boolean") v = v ? "Zusage" : "Absage";
        v = String(v).replace(/"/g, '""');
        return '"' + v + '"';
      }
      var lines = [head.map(cell).join(";")];
      rsvpData.forEach(function (r) {
        lines.push(cols.map(function (c) { return cell(r[c]); }).join(";"));
      });
      // BOM für korrekte Umlaute in Excel
      var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "anmeldungen.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

})();
