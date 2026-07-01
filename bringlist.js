/* =================================================================
   MITBRINGLISTE · Gast-Logik (Vanilla JS + Supabase)
   ================================================================= */
(function () {
  "use strict";

  var cfg = window.BRINGLIST_CONFIG || {};
  var statusEl = document.getElementById("blStatus");
  var listEl   = document.getElementById("blList");

  /* --- Konfiguration prüfen --- */
  function isConfigured() {
    return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
           cfg.SUPABASE_URL.indexOf("DEIN-PROJEKT") === -1 &&
           cfg.SUPABASE_ANON_KEY.indexOf("DEIN-ANON") === -1;
  }
  if (!isConfigured()) {
    setStatus("Die Mitbringliste ist noch nicht eingerichtet. (Supabase-Daten in config.js eintragen.)", true);
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    setStatus("Verbindung zu Supabase konnte nicht geladen werden. Bitte später erneut versuchen.", true);
    return;
  }

  // URL säubern: nur die Projekt-URL, ohne /rest/v1 oder Schrägstrich am Ende
  var SB_URL = (cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  var sb = window.supabase.createClient(SB_URL, cfg.SUPABASE_ANON_KEY);

  /* --- Modal-Elemente --- */
  var modal       = document.getElementById("claimModal");
  var form        = document.getElementById("claimForm");
  var elTitle     = document.getElementById("claimTitle");
  var elSub       = document.getElementById("claimSub");
  var elName      = document.getElementById("cName");
  var elQty       = document.getElementById("cQty");
  var elComment   = document.getElementById("cComment");
  var elError     = document.getElementById("claimError");
  var elSuccess   = document.getElementById("claimSuccess");
  var elSubmit    = document.getElementById("claimSubmit");

  var activeItem = null;   // aktuell im Modal geöffnetes Item

  /* ===============================================================
     Hilfsfunktionen
     =============================================================== */
  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
    statusEl.classList.toggle("bl-status--error", !!isError);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ===============================================================
     Daten laden & rendern
     =============================================================== */
  function load() {
    return Promise.all([
      sb.from("bring_items").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("bring_contributions").select("*").order("created_at", { ascending: true })
    ]).then(function (res) {
      var itemsRes = res[0], contribRes = res[1];
      if (itemsRes.error) throw itemsRes.error;
      if (contribRes.error) throw contribRes.error;
      render(itemsRes.data || [], contribRes.data || []);
    }).catch(function (err) {
      console.error(err);
      setStatus("Die Liste konnte nicht geladen werden. Bitte später erneut versuchen.", true);
    });
  }

  function render(items, contributions) {
    // Beiträge je Item gruppieren
    var byItem = {};
    contributions.forEach(function (c) {
      (byItem[c.item_id] = byItem[c.item_id] || []).push(c);
    });

    if (!items.length) {
      setStatus("Aktuell sind keine Mitbringpunkte hinterlegt.", false);
      listEl.innerHTML = "";
      return;
    }
    setStatus("", false);

    listEl.innerHTML = items.map(function (item) {
      var contribs = byItem[item.id] || [];
      var current = contribs.reduce(function (s, c) { return s + (c.quantity || 0); }, 0);
      var required = item.required_quantity;
      var remaining = Math.max(required - current, 0);
      var pct = Math.min(Math.round((current / required) * 100), 100);
      var full = remaining <= 0;

      var names = contribs.length
        ? contribs.map(function (c) {
            var q = c.quantity > 1 ? " (" + c.quantity + ")" : "";
            return esc(c.guest_name) + q;
          }).join(" · ")
        : '<span class="nobody">Noch niemand eingetragen</span>';

      return '' +
        '<article class="bl-item' + (full ? ' is-complete' : '') + '">' +
          '<div class="bl-item__head">' +
            '<h3 class="bl-item__title">' + esc(item.title) + '</h3>' +
            '<span class="bl-item__status">' + (full ? "Vollständig" : "Offen") + '</span>' +
          '</div>' +
          (item.description ? '<p class="bl-item__desc">' + esc(item.description) + '</p>' : '') +
          '<div class="bl-item__meta">' +
            '<span>Benötigt: <strong>' + required + '</strong></span>' +
            '<span>Zugesagt: <strong>' + current + '</strong></span>' +
            '<span>' + current + '/' + required + '</span>' +
          '</div>' +
          '<div class="bl-progress"><div class="bl-progress__bar" style="width:' + pct + '%"></div></div>' +
          '<p class="bl-item__names">' + (contribs.length ? "Dabei: " : "") + names + '</p>' +
          '<button class="btn btn--primary" type="button" data-claim="' + item.id + '"' +
            (full ? ' disabled' : '') + '>' +
            (full ? "Vollständig vergeben" : "Ich bringe das mit") +
          '</button>' +
        '</article>';
    }).join("");

    // im Speicher halten, damit das Modal die Restmenge kennt
    listEl._items = {};
    items.forEach(function (item) {
      var contribs = byItem[item.id] || [];
      var current = contribs.reduce(function (s, c) { return s + (c.quantity || 0); }, 0);
      listEl._items[item.id] = { item: item, current: current, remaining: Math.max(item.required_quantity - current, 0) };
    });
  }

  /* ===============================================================
     Modal öffnen / schließen
     =============================================================== */
  function openModal(itemId) {
    var info = listEl._items && listEl._items[itemId];
    if (!info) return;
    activeItem = info;

    elTitle.textContent = info.item.title;
    elSub.textContent = "Noch offen: " + info.remaining + " von " + info.item.required_quantity;
    elName.value = "";
    elComment.value = "";
    elQty.value = "1";
    elQty.max = String(info.remaining);
    elQty.min = "1";
    hide(elError); hide(elSuccess);
    elSubmit.disabled = false;
    elSubmit.textContent = "Eintragen";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { elName.focus(); }, 30);
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    activeItem = null;
  }
  function hide(el) { el.hidden = true; el.textContent = ""; }
  function showError(el, msg) { el.textContent = msg; el.hidden = false; }

  /* ===============================================================
     Eintrag absenden (über RPC claim_item -> atomar)
     =============================================================== */
  function submitClaim(e) {
    e.preventDefault();
    if (!activeItem) return;
    hide(elError); hide(elSuccess);

    var name = (elName.value || "").trim();
    var qty = parseInt(elQty.value, 10);
    var comment = (elComment.value || "").trim();

    if (!name) { showError(elError, "Bitte gib deinen Namen an."); elName.focus(); return; }
    if (!qty || qty < 1) { showError(elError, "Bitte gib eine Menge von mindestens 1 an."); return; }
    if (qty > activeItem.remaining) {
      showError(elError, "So viel ist nicht mehr offen. Maximal möglich: " + activeItem.remaining + ".");
      return;
    }

    elSubmit.disabled = true;
    elSubmit.textContent = "Wird gespeichert …";

    sb.rpc("claim_item", {
      p_item_id: activeItem.item.id,
      p_guest_name: name,
      p_quantity: qty,
      p_comment: comment || null
    }).then(function (res) {
      if (res.error) throw res.error;
      var data = res.data || {};
      if (!data.success) {
        showError(elError, data.message || "Eintrag nicht möglich.");
        elSubmit.disabled = false;
        elSubmit.textContent = "Eintragen";
        load(); // Stand aktualisieren (evtl. inzwischen voll)
        return;
      }
      // Erfolg
      elSuccess.textContent = "Vielen Dank, " + name + "! Dein Eintrag wurde gespeichert.";
      elSuccess.hidden = false;
      elSubmit.textContent = "Gespeichert ✓";
      load();
      setTimeout(closeModal, 1400);
    }).catch(function (err) {
      console.error(err);
      showError(elError, "Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.");
      elSubmit.disabled = false;
      elSubmit.textContent = "Eintragen";
    });
  }

  /* ===============================================================
     Events
     =============================================================== */
  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-claim]");
    if (btn && !btn.disabled) openModal(btn.getAttribute("data-claim"));
  });
  modal.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
  form.addEventListener("submit", submitClaim);

  /* ===============================================================
     Realtime: bei Änderungen automatisch neu laden (live)
     =============================================================== */
  try {
    sb.channel("bringlist-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bring_contributions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bring_items" }, load)
      .subscribe();
  } catch (err) { /* Realtime optional – Fallback ist load() nach Aktion */ }

  /* Start */
  load();
})();
