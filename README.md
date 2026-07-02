# Hochzeitswebsite · Christina & Timo

Eine statische Hochzeitswebsite im Fine-Art-/Editorial-Stil.
**Reines HTML, CSS und Vanilla JavaScript** – keine Frameworks, keine Build-Tools,
keine Datenbank. Einfach Dateien austauschen und über Cloudflare Pages veröffentlichen.

**Wichtig:** Alle Dateien liegen flach in **einem** Ordner – alle nebeneinander,
ohne Unterordner. So muss es auch bei GitHub aussehen, sonst wird das Design nicht
geladen.

```
Hochzeitwebsite/
├── index.html     ← Inhalte & Struktur (Texte hier ändern)
├── style.css      ← Design (Farben, Schriften, Layout)
├── main.js        ← Smooth Scroll, FAQ, Animationen
├── hero.jpg       ← Bilder (alle im selben Ordner)
├── welcome.jpg
├── location.jpg
├── moment-1.jpg
├── moment-2.jpg
├── footer.jpg
└── README.md      ← Diese Anleitung
```

> 💡 **Suchhilfe:** In `index.html` sind alle änderbaren Stellen mit Kommentaren markiert:
> `<!-- TEXT HIER ÄNDERN -->`, `<!-- BILD HIER AUSTAUSCHEN -->`,
> `<!-- MICROSOFT FORMS LINK HIER EINFÜGEN -->`.
> Öffne die Datei in einem Editor (z.B. VS Code) und nutze die Suche (Strg+F).

---

## 1. Bilder austauschen

Alle Bilder liegen direkt im Hauptordner (neben `index.html`). Verwende **genau
diese Dateinamen**, dann musst du im Code nichts anpassen:

| Datei | Wofür | Empfohlene Breite |
|-------|-------|-------------------|
| `hero.jpg`     | Großes Startbild ganz oben      | ca. **2000 px** |
| `welcome.jpg`  | Bild im Begrüßungsblock          | ca. **1200 px** |
| `location.jpg` | Foto der Location (Anreise)      | ca. **1200 px** |
| `moment-1.jpg` | Momentaufnahme 1 (Foto-Bereich)  | ca. **1200 px** |
| `moment-2.jpg` | Momentaufnahme 2 (Foto-Bereich)  | ca. **1200 px** |
| `footer.jpg`   | Großes Abschlussbild unten       | ca. **2000 px** |

**So geht's:**
1. Eigenes Foto so benennen wie oben (z.B. `hero.jpg`).
2. In den Hauptordner kopieren und das alte überschreiben.
3. Fertig – beim nächsten Laden erscheint das neue Bild.

> **Hero- und Footer-Bild** werden im CSS gesetzt (Hintergrundbilder).
> Falls du dort einen anderen Dateinamen nutzen willst, ändere die Zeile
> `background-image: url("hero.jpg");` in `style.css`.
> Die übrigen Bilder stehen direkt in `index.html` als `<img src="...">`.

**Wichtig – Bilder vor dem Hochladen komprimieren:**
- Tools: [squoosh.app](https://squoosh.app) oder [tinypng.com](https://tinypng.com)
- **WebP** wird empfohlen (gleiche Qualität, deutlich kleiner).
- Faustregel: Hero/Footer ≤ 500 KB, Contentbilder ≤ 250 KB.

> Solange ein Bild **fehlt**, zeigt die Seite automatisch eine neutrale,
> elegante Farbfläche – es sieht also nie „kaputt“ aus.

---

## 2. Texte ändern

Alle Texte stehen in **`index.html`**. Du brauchst keinerlei Programmierkenntnisse –
einfach den Text zwischen den Tags ersetzen.

**Beispiel:** Begrüßungstext ändern
```html
<!-- TEXT HIER ÄNDERN -->
<h2 class="section__title">Schön, dass ihr Teil<br />unseres besonderen Tages seid</h2>
```
Ersetze einfach den Text zwischen `>` und `</h2>`.

**Wo finde ich was?** Die Datei ist von oben nach unten in nummerierte Blöcke gegliedert:

| Block | Inhalt |
|-------|--------|
| 1  | Hero (Namen, Datum, Button) |
| 2  | Begrüßung |
| 3  | Info-Kacheln (Zeiten & Orte) |
| 4  | Tagesablauf / Timeline |
| 5  | Anreise (Adresse, Google-Maps-Link) |
| 6  | Übernachtung / Hotels |
| 7  | FAQ (Fragen & Antworten) |
| 8  | Anmeldung / RSVP-Formular (Supabase) |
| 9  | Aktuelle Informationen |
| 10 | Foto-/Moment-Bereich |
| 11 | Footer (Abschluss) |

**Häufig gepflegt – Block 9 „Aktuelle Informationen“:**
```html
<p class="updates__date">Letzte Aktualisierung: 06.06.2026</p>
<p class="updates__text">Aktuell gibt es keine Änderungen.</p>
```
Hier kannst du jederzeit kurzfristige Hinweise (Wetter, Parken, Zeiten) eintragen.

**Google-Maps-Link ändern (Block 5):** Suche nach
`<!-- GOOGLE MAPS LINK HIER EINFÜGEN -->` und tausche den `href`-Wert aus.

---

## 3. Anmeldung (RSVP) – eigenes Formular mit Supabase

Die Anmeldung läuft **nicht** mehr über Microsoft Forms, sondern über ein
**eigenes Formular** im Abschnitt „Anmeldung" auf `index.html`. Die Daten werden
in Supabase gespeichert (Tabelle `rsvp_responses`) und im Admin-Bereich
ausgewertet (inkl. **CSV-Export**).

- Gäste füllen Vorname, Nachname und Zu-/Absage aus. Bei **Zusage** erscheinen
  zusätzlich Erwachsene, Kinder, Alter der Kinder, Essenswünsche und Allergien.
- Nach dem Absenden erscheint eine elegante Erfolgsmeldung.
- Einrichtung: identisch zur Mitbringliste – es genügt, **einmal** Supabase
  einzurichten und `config.js` auszufüllen (siehe Abschnitt
  „Mitbringliste (digital, mit Supabase)" weiter unten). Das `supabase.sql`
  legt die RSVP-Tabelle gleich mit an.
- **Auswertung & Export:** in `admin.html` → Abschnitt „Anmeldungen"
  (Zusagen/Absagen filtern, Summen, CSV exportieren, einzelne Anmeldung löschen).

---

## 4. Seite bei GitHub hochladen

Du brauchst ein kostenloses Konto auf [github.com](https://github.com).

### Variante A – ohne Kommandozeile (am einfachsten)
1. Auf GitHub oben rechts **„+“ → „New repository“**.
2. Name z.B. `hochzeit-christina-timo`, **Public** oder **Private**, **Create repository**.
3. Auf der neuen Seite **„uploading an existing file“** anklicken.
4. **Alle Dateien** aus dem Projektordner markieren (index.html, style.css,
   main.js, alle `.jpg`-Bilder, README.md) und per Drag & Drop hochladen.
   **Wichtig:** alle Dateien gehören flach ins Repository – nebeneinander, ohne
   Unterordner. Genau so findet der Browser das Design und die Bilder.
5. Unten auf **„Commit changes“**.

### Variante B – mit Git (für Geübte)
```bash
cd Pfad/zum/Hochzeitwebsite
git init
git add .
git commit -m "Hochzeitswebsite"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/hochzeit-christina-timo.git
git push -u origin main
```

---

## 5. Cloudflare Pages verbinden

1. Konto erstellen/anmelden auf [dash.cloudflare.com](https://dash.cloudflare.com).
2. Links im Menü **„Workers & Pages“** → **„Create application“** → Reiter **„Pages“**
   → **„Connect to Git“**.
3. GitHub verbinden und das Repository `hochzeit-christina-timo` auswählen.
4. Build-Einstellungen (sehr wichtig, da **kein** Build nötig ist):
   - **Framework preset:** `None`
   - **Build command:** *(leer lassen)*
   - **Build output directory:** `/`  (Schrägstrich)
5. **„Save and Deploy“** klicken. Nach kurzer Zeit ist die Seite live unter einer
   Adresse wie `https://hochzeit-christina-timo.pages.dev`.

> **Updates:** Jede Änderung, die du auf GitHub hochlädst (neuer Commit / neuer
> Datei-Upload), wird von Cloudflare automatisch neu veröffentlicht – meist
> innerhalb einer Minute.

### Optional: eigene Domain
In Cloudflare Pages unter **„Custom domains“** kannst du eine eigene Domain
(z.B. `christina-und-timo.de`) verbinden und der Anleitung folgen.

---

## 6. QR-Code zur Website erstellen

Damit Gäste die Seite z.B. von der Einladung scannen können:

1. Finale URL kopieren (z.B. `https://hochzeit-christina-timo.pages.dev`
   oder deine eigene Domain).
2. Einen kostenlosen QR-Generator öffnen, z.B.
   [qr-code-generator.com](https://www.qr-code-generator.com) oder
   [qrcode-monkey.com](https://www.qrcode-monkey.com).
3. URL einfügen, QR-Code als **PNG oder SVG** (am besten SVG für den Druck)
   herunterladen.
4. In Einladung / Tischkarten einbauen.

> **Tipp:** Erstelle den QR-Code **erst mit der endgültigen URL**. Verwendest du
> später eine eigene Domain, muss der QR-Code mit dieser neu erstellt werden,
> sonst zeigt er noch auf die alte `.pages.dev`-Adresse.

---

## ✅ Checkliste vor dem Versand

- [ ] **Bilder ersetzen** – alle 6 Bilder im Hauptordner (komprimiert)
- [ ] **Texte prüfen** – Namen, Datum, Zeiten, Adresse, FAQ, Update-Datum
- [ ] **Google-Maps-Link** in Block 5 kontrollieren
- [ ] **Supabase einrichten** (`supabase.sql`) & `config.js` ausfüllen → RSVP + Mitbringliste testen
- [ ] **GitHub Repository erstellen** und Dateien hochladen
- [ ] **Cloudflare Pages verbinden** (Output-Verzeichnis `/`, kein Build)
- [ ] Seite auf dem **Handy** testen (Smooth Scroll, FAQ, Formular)
- [ ] **QR-Code mit finaler URL erstellen** und in Einladung einbauen

---

## Anpassen für Fortgeschrittene

- **Farben & Schriften** zentral in `style.css` unter
  `:root { … }` (Abschnitt „1 · DESIGN-TOKENS“).
- **Animationsstärke / Abstände** ebenfalls dort über die CSS-Variablen.
- Die Seite kommt **ohne externe Abhängigkeiten** aus – außer Google Fonts
  (Cormorant Garamond & Inter), die im `<head>` von `index.html` geladen werden.

---

## Mitbringliste (digital, mit Supabase)

Die Seiten `bringlist.html` (für Gäste) und `admin.html` (zum Verwalten) bilden
eine echte Mitbringliste mit Live-Speicherung. Gäste tragen sich mit Namen ein;
ist ein Punkt vollständig vergeben, schließt er automatisch.

**Zugehörige Dateien** (alle flach im Hauptordner):
`bringlist.html`, `admin.html`, `bringlist.css`, `bringlist.js`, `admin.js`,
`config.js`, `supabase.sql`.

### Schritt 1 · Supabase-Projekt erstellen
1. Auf [supabase.com](https://supabase.com) kostenlos registrieren.
2. **New project** anlegen (Name frei, Region z. B. Frankfurt, Passwort vergeben).
3. Kurz warten, bis das Projekt bereit ist.

### Schritt 2 · Datenbank einrichten (SQL ausführen)
1. Im Projekt links auf **SQL Editor** → **New query**.
2. Den **kompletten Inhalt** von `supabase.sql` hineinkopieren.
3. **Run** klicken. Damit werden Tabellen, Sicherheitsregeln, die
   Überbuchungs-Funktion `claim_item` und Beispiel-Items angelegt.

### Schritt 3 · Zugangsdaten kopieren
In Supabase unter **Project Settings → API**:
- **Project URL** (z. B. `https://abcdxyz.supabase.co`)
- **anon public** Key (langer Schlüssel)

> Der `anon`-Key darf öffentlich sein – die Sicherheit kommt aus den
> Row-Level-Security-Regeln und der Funktion `claim_item` in `supabase.sql`.

### Schritt 4 · Werte in `config.js` eintragen
Öffne `config.js` und trage ein:
```js
SUPABASE_URL:      "https://DEIN-PROJEKT.supabase.co",
SUPABASE_ANON_KEY: "DEIN-ANON-PUBLIC-KEY",
ADMIN_PASSWORD:    "Hochzeit2026"
```

### Schritt 5 · Admin-Passwort ändern
In `config.js` den Wert `ADMIN_PASSWORD` auf ein eigenes Passwort setzen.

> ⚠️ **Sicherheitshinweis:** Dieser Passwortschutz ist nur ein **einfacher Schutz
> im Browser**, KEIN hochsicherer Schutz. Das Passwort steht in einer öffentlich
> abrufbaren Datei und schützt nur vor zufälligem Zugriff. Teile die
> `admin.html`-Adresse nicht öffentlich und nutze ein Passwort, das du sonst
> nirgends verwendest.
>
> **Datenschutz-Hinweis:** Damit der Admin-Bereich die Anmeldungen mit dem
> öffentlichen `anon`-Key lesen kann, sind die RSVP-Daten technisch über die
> Supabase-API abrufbar. Für eine private Hochzeitsseite ist das in der Regel
> vertretbar – die Seite/Repo aber bitte nicht öffentlich bewerben.

### Schritt 6 · Hochladen & veröffentlichen
1. Die geänderte `config.js` und die neuen Dateien zu **GitHub** hochladen
   (siehe Abschnitt 4 oben).
2. **Cloudflare Pages** deployt automatisch neu (siehe Abschnitt 5).
3. Aufruf der Liste live unter `…pages.dev/bringlist.html`,
   Verwaltung unter `…pages.dev/admin.html`.

### Schritt 7 · QR-Code
Den QR-Code wie in Abschnitt 6 beschrieben erstellen – entweder für die
Startseite oder direkt für `…/bringlist.html`.

### Bedienung
- **Gäste:** sehen die Mitbringliste **direkt auf der Startseite** (Abschnitt
  „Mitbringliste") – alternativ auch unter `bringlist.html`. Punkt wählen, Name +
  Menge eintragen. Volle Punkte sind deaktiviert und dezent ausgegraut.
- **Admin:** öffnet `admin.html`, gibt das Passwort ein, kann Punkte anlegen,
  aktiv/inaktiv schalten, löschen (mit Bestätigung) und einzelne Beiträge
  entfernen.

---

## E-Mail-Benachrichtigung bei Anmeldung / Mitbringen

Du möchtest automatisch eine E-Mail an `timo100895@gmail.com` bekommen, sobald
sich jemand anmeldet **oder** etwas in der Mitbringliste auswählt? Das übernimmt
Supabase per Datenbank-Trigger und versendet die Mail über den kostenlosen Dienst
**Resend**. (Eine statische Seite kann selbst keine Mails verschicken – die
Server-Zugangsdaten dürfen nie ins Frontend.)

### Schritt 1 · Bei Resend registrieren
1. Auf [resend.com](https://resend.com) registrieren – **mit der Adresse
   `timo100895@gmail.com`** (wichtig, damit der Versand ohne eigene Domain an
   genau diese Adresse erlaubt ist).
2. Postfach bestätigen.

### Schritt 2 · API-Key holen
In Resend unter **API Keys → Create API Key** einen Schlüssel erstellen
(beginnt mit `re_…`) und kopieren.

### Schritt 3 · Key eintragen & SQL ausführen
1. Datei `email-notifications.sql` öffnen.
2. Bei `v_api_key` den `re_…`-Key eintragen (statt `RESEND_API_KEY_HIER`).
3. Die **komplette Datei** im Supabase **SQL-Editor** ausführen (Run).

Das war's. Ab sofort kommt bei jeder neuen Anmeldung und jedem Mitbring-Eintrag
automatisch eine E-Mail.

> **Hinweise:**
> - Die erste Mail landet evtl. im **Spam** – einmal als „kein Spam" markieren
>   bzw. Absender freigeben.
> - Der Resend-Gratis-Tarif erlaubt reichlich Mails für eine Hochzeit
>   (100/Tag, 3000/Monat).
> - Der API-Key steht nur in der Datenbank (server-seitig), **nicht** im
>   Frontend – das ist sicher.
> - E-Mail-Fehler blockieren niemals eine Anmeldung; im Zweifel siehst du alles
>   weiterhin im Admin-Bereich.

---

Viel Freude – und herzlichen Glückwunsch! 🥂
