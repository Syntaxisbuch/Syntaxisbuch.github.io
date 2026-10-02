# Syntaxis - Ein Projekt &uuml;ber kritisches Denken — Website

Die Projektseite zu **Syntaxis** von Gerald Glaser: vier Reihen über das Prüfen von Behauptungen, kostenfrei als PDF und EPUB, Landkarte und Autopsien auch als ODT zum Bearbeiten, unter Creative-Commons-Lizenz.

Live: <https://syntaxisbuch.github.io/>
Kontakt: <Syntaxis_Buch@pm.me>

---

## Die Grundidee

Die Seite **ist** die Stadt. Navigation ist Höhe.

Neocortex City ist eine terrassierte Hügelfestung, deren Ebenen realen Hirnregionen entsprechen. Die Website übernimmt dieses Raster: Links läuft ein Höhenmesser von +520 m bis −60 m, und jeder Bereich sitzt auf der Terrasse, deren Funktion zu ihm passt.

| Höhe | Terrasse | Hirnregion | Bereich |
|---:|---|---|---|
| 520 m | Turmspitze | Brodmann-Areal 10 | Startseite |
| 500 m | Oberste | Präfrontaler Kortex | Landkarte der Realität |
| 400 m | Obere-Mittlere | Parietallappen | Licht der Realität |
| 280 m | Mittlere | Verwaltung | Ausgabestelle (Downloads) |
| 180 m | Mittlere-Untere | Hippocampus | Kartographischer Atlas |
| 80 m | Untere | Limbisches System | Chroniken von Neocortex City |
| 20 m | Thalamus Central Station | Thalamus | Gegenfragen-Kartei |
| 0 m | Unterste | Hirnstamm | Das Rüstzeug |
| −60 m | Sub-Unterste | Sonderzugang | Autopsien der Schatten |

---

## Ein neues Werk eintragen

**Alles läuft über eine einzige Datei: `data/werke.json`.** Danach einmal neu bauen.

### Neuer Band einer bestehenden Reihe

In `data/werke.json` bei der passenden Reihe unter `baende` (oder bei den Autopsien unter `faelle`) einen Eintrag ergänzen:

```json
{
  "nr": "V",
  "titel": "Der Nullpunkt",
  "jahr": "2027",
  "kapitel": 40,
  "fall": "Worum es geht",
  "ort": "Sektoren, in denen der Band spielt",
  "text": "Klappentext.",
  "tags": ["Stichwort", "Stichwort"],
  "dateien": [
    { "format": "PDF",  "datei": "downloads/chroniken-5-der-nullpunkt.pdf" },
    { "format": "EPUB", "datei": "downloads/chroniken-5-der-nullpunkt.epub" }
  ]
}
```

Die Dateien kommen **nicht** ins Repo. Veröffentlicht wird aus der Syntaxis-Werkstatt (`~/Syntaxis`) mit

```bash
syntaxis freigeben chroniken 5 --ja              # nur nach Freigabe durch den Autor
syntaxis veroeffentlichen chroniken 5 --ausfuehren
syntaxis hochladen --ja
```

Das legt ein GitHub Release an (Tag `<dateiname>-v<fassung>`, z. B. `chroniken-1-schatten-ueber-dreamland-v0.9.3`), setzt `datei` in `werke.json` auf die Release-Adresse, baut und lädt hoch. Einträge mit `downloads/…` gelten als „Datei folgt“, solange dort keine Datei liegt. Alte Direktlinks auf `/downloads/<datei>` leitet die 404-Seite zur aktuellen Fassung weiter (Tabelle wird aus `werke.json` erzeugt).

Nur zum Ansehen lokal bauen:

```bash
python3 _build/build.py
```

Solange eine Datei fehlt, erscheint der Knopf ausgegraut mit einem Hinweis — die Seite bricht nicht. Sobald die Datei da ist, wird der Knopf beim nächsten Bauen automatisch aktiv.

### Sammelband einer Autopsien-Sektion

Bei den Autopsien unter `sammelbaende` einen Eintrag je Sektion anlegen:

```json
{
  "sektion": "B",
  "titel": "Sammelband Sektion B — …",
  "unter": "Alle Autopsien der Sektion B in einem Buch",
  "dateibasis": "autopsien-sektion-b-…",
  "cover": "assets/img/autopsien/…-klein.webp"
}
```

Die Dateien heißen dann `<dateibasis>.pdf`, `.epub` und `.odt` und liegen in `downloads/`. Der Sammelband erscheint automatisch oben auf der Autopsien-Seite, als erster Eintrag im Downloads-Reiter und in der Suche. Für Sektion A lauten die Namen `autopsien-sektion-a-kosmos-voller-luegen.*`.

### Ganz neue Reihe

Ein neues Objekt in `reihen` anlegen. Wichtig sind `id`, `kennung`, `titel`, `terrasse`, `z`, `lizenz` und `seite`. Dann:

1. Ein Fragment `_build/pages/<slug>.html` anlegen (am einfachsten `licht.html` kopieren).
2. In `_build/build.py` im Wörterbuch `SEITEN` eine Zeile mit Titel und Beschreibung ergänzen.
3. In `_build/build.py` die Seite in `NAV` unter „Werke“ eintragen, damit sie im Menü erscheint, und in `assets/js/core.js` in `EBENEN`, damit sie im Höhenmesser erscheint.
4. In `assets/css/syntaxis.css` einen Akzent unter `body[data-reihe="…"]` definieren.
5. Bauen.

---

## Navigation ändern

Das Menü steht an einer einzigen Stelle: der Liste `NAV` in `_build/build.py`. Jede Zeile ist ein Menüpunkt: `(slug, Titel, kurzer Hinweis, Reihenfarbe)`. Eine neue Seite braucht nur eine Zeile dort — Kopfleiste und Mobilmenü folgen automatisch. Der Fuß (`_build/layout.html`) bleibt bewusst klein: Lizenz, Impressum, Haftung, Datenschutz, RSS, GitHub.

---

## Aufbau

```
├── index.html … 404.html      erzeugte Seiten — nicht direkt bearbeiten
├── _build/
│   ├── build.py               Generator: python3 _build/build.py
│   ├── layout.html            Rahmen (Kopf, Fuß, Höhenmesser, Suche)
│   └── pages/*.html           Seiteninhalte — hier wird bearbeitet
├── assets/
│   ├── css/syntaxis.css       gesamtes Gestaltungssystem
│   ├── js/core.js             Menü, Sprungleiste, Höhenmesser, Suche
│   ├── js/atlas.js            Karte, Sektordetails, Wegzeitrechner
│   ├── js/werkzeuge.js        Red-Flag-Prüfung, Protokoll, Kartenkasten
│   └── js/gegenfragen.js      Kartei mit Suche und Filter
├── dojo/                      Testfassung der Trainings-App („Trainings-Dojo“): bewusst nicht verlinkt, nicht in Navigation und Sitemap, `noindex`; nicht von Hand ändern, die App entsteht in der Werkstatt (`app/`)
├── data/
│   ├── werke.json             ► Werkregister, steuert die ganze Seite
│   ├── stadt.json             Sektoren, Brücken, Turm, Geschwindigkeiten (Koordinatensystem v12)
│   ├── bildband.json          Bildarchiv: Akten, Positionen und die Verknüpfungen jedes Bildes
│   ├── werkzeuge.json         Red Flags, Autopsie-Protokoll, Kartenkasten
│   ├── autopsie-plan.json     die 105 geplanten Fälle in zehn Sektionen
│   └── gegenfragen.json       115 Karten aus den Quick-Reference-Tabellen
└── downloads/                 nur noch LIESMICH.md – Dateien liegen als GitHub Releases
```

Bearbeitet werden nur `_build/pages/`, `data/`, `assets/`. Die HTML-Dateien im Wurzelverzeichnis werden vom Generator überschrieben.

---

## Lokal ansehen

JSON-Dateien lädt kein Browser aus dem Dateisystem. Deshalb ein kleiner Server:

```bash
cd Syntaxis
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

## Veröffentlichen

GitHub Pages im Repository unter *Settings → Pages* auf Branch `main`, Ordner `/ (root)` stellen. Die Datei `.nojekyll` liegt bereits bei; sie verhindert, dass GitHub die Dateien durch Jekyll schickt.

---

## Domain

**Die Ausgangslage.** GitHub Pages liefert ein Repository nur dann direkt unter `<konto>.github.io/` aus, wenn das Repository exakt `<konto>.github.io` heißt. Jedes andere Repository — auch eines mit dem richtigen Konto davor — wird als *Projektseite* behandelt und bekommt einen Unterordner: `<konto>.github.io/<repo-name>/`. Ein Aufruf ohne diesen Unterordner liefert eine 404, weil dort schlicht nichts liegt. Das ist kein Fehler in der Konfiguration, sondern das dokumentierte Standardverhalten von GitHub Pages.

**Der eingeschlagene Weg — Repository umbenennen.** Kostenlos, ohne eigene Domain:

1. Auf GitHub: *Settings → General → Repository name*
2. Von `Syntaxis` zu `Syntaxisbuch.github.io` ändern
3. Fertig — die Seite ist danach unter `https://syntaxisbuch.github.io/` erreichbar, ohne Unterordner

GitHub legt für den alten Namen eine Weile eine automatische Weiterleitung an; feste Lesezeichen auf `/Syntaxis/`-Adressen sollten trotzdem aktualisiert werden, sobald möglich.

**Der Code ist bereits umgestellt.** `SITE_URL` in `_build/build.py` steht auf `https://syntaxisbuch.github.io` (ohne Unterordner, ohne abschließenden Schrägstrich). Daraus leiten sich beim Bauen automatisch ab:
- `sitemap.xml` und `robots.txt` — nicht mehr von Hand gepflegt, sondern bei jedem Lauf von `build.py` frisch geschrieben
- `<link rel="canonical">` und `og:url` auf jeder Seite
- `og:image` als vollständige Adresse (Open-Graph-Vorschauen brauchen absolute Bildpfade)

**Eine eigene Domain später.** Eine passende Domain lässt sich jederzeit nachrüsten, ohne den Rest anzufassen:

1. `SITE_URL` in `_build/build.py` auf `https://meine-domain.de` setzen
2. Eine Datei `CNAME` (ohne Dateiendung) mit genau der Domain als einziger Zeile ins Wurzelverzeichnis legen, z. B. `meine-domain.de` — ohne `https://`, ohne Pfad, ohne Zeilenumbruch danach
3. Beim Domain-Anbieter einen `CNAME`-Eintrag (bei einer Subdomain wie `www`) oder passende `A`-Einträge (bei der nackten Domain, auf GitHubs IP-Adressen) setzen — GitHubs aktuelle Anleitung dazu: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>
4. `python3 _build/build.py` laufen lassen, damit Sitemap, robots.txt und alle Seiten die neue Adresse tragen

Für dieses Projekt bewusst nicht verwendet: eine bereits vorhandene, aber inhaltlich nicht passende Domain. Der Name einer Domain ist für Besucher und Suchmaschinen Teil der Aussage der Seite — er sollte zum Inhalt passen, nicht nur verfügbar sein.

**Nach jeder Umstellung — kurz prüfen:**
```bash
grep -rn "github.io" *.html *.xml *.txt
```
Kommt dabei nichts zurück außer den erwarteten Zeilen in den Meta-Angaben, war die Umstellung vollständig.

---

## Was diese Seite kann

- **Eine Navigation** — Kopfleiste mit den Menüs *Werke*, *Mehrwert*, *Projekt* und dem Knopf *Downloads*; auf dem Telefon dieselbe Leiste als Tafel. Der Fuß enthält nur Rechtliches und Kontakt.
- **Sprungleiste** — lange Seiten zeigen unter dem Kopf ihre Abschnitte; jeder `<section>` mit `id` und `data-sprung="Name"` bekommt automatisch einen Eintrag
- **Aufklappen statt Textwand** — Zusatzwissen steht in `<details class="aufklapp">` (Abschnitte) bzw. `<details class="mehr">` (in Karten)
- **Höhenmesser** — die Ebenen der Stadt als Orientierung am linken Rand, mit Tastaturbedienung
- **Downloads mit Reitern** — ein Reiter je Reihe, Formatwahl PDF/EPUB/ODT, Sprung per Adresse `downloads.html#dl-au`
- **Autopsien als Fallkarten** — Filter nach Gefährdung, Details und Dateien je Fall zum Aufklappen, Sammelband je Sektion
- **Suche** — `/` oder `Strg`+`K`; findet Werke, Denkwerkzeuge und Signaturen wie `LR-I-1.2.3`, dazu Stadtsektoren aus dem Koordinatensystem wie `NK-01` (Die Naturkonstante)
- **Kartographischer Atlas** — Grundriss je Terrasse aus den echten X/Y-Koordinaten, Sektordetails mit neuroanatomischer Entsprechung, Wegbeschreibung mit Stationen, Richtungsgesetz und körperlichen Kosten
- **Red-Flag-Prüfung** — dreizehn Warnzeichen als Prüfliste mit Befund
- **Autopsie-Protokoll** — neunzehn Punkte als Arbeitsbogen, mit Textexport
- **Kartenkasten** — 32 Denkwerkzeuge mit Signatur, filterbar
- **Gegenfragen-Kartei** — 115 Karten, durchsuchbar und nach Fall filterbar
- **Detector-Kit** — die neun Fragen als Kurzform zum Mitnehmen
- **Landkarte des Werkes** — alle 105 geplanten Autopsien in zehn aufklappbaren Sektionen
- **Einstiegs-Assistent** — zwei Fragen, ein Lesevorschlag

Ohne Konten, ohne Werbung, ohne Analysewerkzeuge, ohne Cookies. Die Eingaben in den Werkzeugen bleiben im Browser (`localStorage`) und werden nicht übertragen.

### Schriften

Instrument Serif, Spectral und Azeret Mono liegen als `.woff2`-Dateien unter `assets/fonts/` und werden über `assets/css/fonts.css` per `@font-face` eingebunden — es findet keine Anfrage an Google oder einen anderen Schriftenanbieter statt. Alle drei stehen unter der SIL Open Font License.

Um eine Schrift zu aktualisieren oder zu ersetzen: neue `.woff2`-Datei nach `assets/fonts/` legen, `assets/css/fonts.css` entsprechend anpassen (Dateiname, `font-weight`, `font-style`) und neu bauen. Bezugsquelle für Aktualisierungen: [Google Fonts](https://fonts.google.com) — dort die gewünschten Schnitte auswählen, die CSS-Datei mit einem modernen Browser-User-Agent abrufen (liefert `.woff2`-Links) und daraus nur die `latin`-Subset-Blöcke übernehmen; für deutschen Text reicht dieses eine Subset.

---

## Lizenz

**Inhalte** (Texte, Werke, Daten): siehe [Lizenz und Nutzung](lizenz.html).
Landkarte der Realität und Autopsien der Schatten: CC BY-NC 4.0.
Chroniken von Neocortex City: CC BY-NC-ND 4.0.

**Quelltext dieser Website** (HTML, CSS, JavaScript, Generator): MIT, siehe `LICENSE`.

Neurale Assistenz bei Werken und Website: Anthropic Claude und Google Gemini. Cover und Stadtkarte: ChatGPT.

---

## Redaktionelle Festlegungen

Damit sie bei künftigen Änderungen nicht verloren gehen:

- **Traces persönlicher Riss bleibt auf der Website mysteriös.** Angedeutet wird nur, dass über die Bände I bis V ein zweiter Fall mitläuft, den er nie angenommen hat. Keine Namen, keine Vorgeschichte, kein Ausgang.
- **Was Janus ist, wird nicht verraten.** Er wird ausschließlich über seine Funktion beschrieben: Manifest, Asservate, Marginalien.
- **Die Chroniken bauen aufeinander auf.** Einzeln lesbar ja, aber der Hinweis auf die durchlaufende Linie gehört dazu.
- **Licht der Realität ist keine Experimentierreihe.** Ein Mythos ist der Türöffner, dahinter steht das Fachgebiet, ein Band je Gebiet.
- **Autopsien:** zehn fertig (Sektion A), 105 geplant. Die Titel in `data/autopsie-plan.json` sind Arbeitsstand.
- **In der Stadt wird nicht gewartet.** Keine Warteschlangen an den Aufzügen — das Gehirn puffert nicht. Teuer sind Umstiege.

---

## Die Wegbeschreibung im Atlas

Der Atlas rechnet keine Minuten aus, sondern beschreibt den Weg. Das ist eine bewusste Entscheidung und folgt der Funktion, der die Stadt nachgebaut ist.

**Es wird nicht gewartet.** Das Gehirn puffert nicht: Wer nicht durchkommt, wird nicht später zugestellt, sondern abgeschwächt oder verworfen. Der Balken zwischen den Hemisphären ist keine Leitung, sondern rund 200 Millionen gleichzeitig laufende Fasern — kein Schacht, sondern eine Wand aus Schächten. Und myelinisierte Bahnen springen von Knoten zu Knoten, statt auf jeder Etage zu halten. Deshalb gibt es in Neocortex City keine Wartezeit auf den Aufzug.

**Teuer ist der Umstieg.** Ein Aktionspotential läuft mit bis zu 120 Metern je Sekunde über den Fortsatz, aber jede Übergabe an der Synapse kostet eine halbe bis eine Millisekunde. Auf langen Strecken summieren sich die Übergaben, nicht die Strecke. Die Beschreibung zählt deshalb Umstiege und gewichtet sie schwer.

**Die Dauer ist ein Band, keine Zahl.** Von *„Ein kurzer Weg"* bis *„Der halbe Abend"*. Eine Sekundenangabe würde eine Genauigkeit behaupten, die die Quelle nicht hergibt.

**Bezahlt wird körperlich.** Die eigentliche Währung der Stadt sind die dokumentierten körperlichen Kosten eines Ortes — das Kratzen im Hals in der Registratur, der Druck hinter den Augen im Verwaltungsflügel. Die Beschreibung sammelt sie ein. Wo im Kanon noch keine festgelegt sind, sagt sie das ausdrücklich; das macht die weißen Flecken sichtbar, statt sie zu füllen.

**Tag- und Nachtbetrieb.** Der Thalamus schaltet zwischen zwei Betriebsarten um: wach gibt er einzeln und getreu weiter, im Schlaf feuert er in Salven. Dasselbe Signal, anderer Rhythmus. Der Schalter über der Beschreibung bildet das ab — nachts geht es schneller und es kommt mehr an, aber gröber. Trace kennt beide Betriebsarten (Band I, die Heimfahrt bei Nacht).

Alle Texte, Bänder und Gewichte stehen in `data/stadt.json` unter `reise`. Sie werden zur Laufzeit gelesen — ändern, Seite neu laden, fertig.

**Die Turmachse ist die Nabe.** Der lokale Nullpunkt jeder Terrasse ist der Punkt, an dem der Tower durch die Ebene stößt. Wege zwischen zwei Terrassen laufen deshalb waagerecht zur Achse, senkrecht durch den Turm — vorbei an den namentlich genannten Etagen und Terrassenkanten — und dann waagerecht zum Ziel. Das schließt die Lücke, dass X und Y pro Terrasse an einem eigenen Nullpunkt hängen.

---

## Atlas und Bildarchiv sind verknüpft

Jedes Bild in `data/bildband.json` kann auf einen Ort im Kanon zeigen. Die Felder entscheiden, welche Knöpfe im Leuchtkasten erscheinen und welche Bilder der Atlas bei einem Sektor zeigt:

| Feld | Bedeutung | Ergebnis |
|---|---|---|
| `sektor` | ID aus `stadt.json`, z. B. `CIN-01` | Knopf „Im Atlas“; das Bild erscheint im Sektor-Panel des Atlas |
| `lage` | Zusatz zum Sektor, z. B. „Etage 86“ | steht hinter dem Sektornamen |
| `bruecke` | Name einer Sky Bridge, oder `true` für „irgendeine“ | Knopf zur Brückentabelle; Bild-Link in der Tabelle |
| `ort` | Name aus `ohne_koordinate` in `stadt.json` | Knopf zur Liste „Orte ohne Koordinate“ |
| `band` | `I` bis `V` | Knopf „Zu Band …“ |
| `ziel` | `autopsien.html#au-N` | Knopf „Zur Autopsie“ |

Knöpfe entstehen nur für Ziele, die es gibt. Beim Bauen meldet `build.py` Verweise ins Leere als Warnung (in GitHub Actions als Annotation), etwa einen Sektor, der nicht in `stadt.json` steht.

**Zahlen im Text** (Sektoren, Sky Bridges, Bilder, Folgen, Gegenfragen, Werkzeuge, Autopsien) sind Platzhalter wie `{{N_SEKTOREN}}` und kommen beim Bauen aus den Daten. Sie müssen nie von Hand nachgezogen werden.

**Koordinatensystem aktualisieren:** neue Fassung nach `stadt.json` übertragen (Sektoren, `bruecken`, `turm`), `quelle` auf die neue Version setzen, bauen. Alles Weitere — Karte, Suche, Wegbeschreibung, Zahlen — folgt den Daten.

---

## Gemeinschaft (Discord)

Die Seite `gemeinschaft.html` ist der **einzige** Weg zum Discord-Server. Nirgends sonst steht ein Discord-Link, und die Seite lädt nichts von Discord (kein Widget, kein Skript). Vor dem Knopf steht ein Hinweis, was der Klick bedeutet; der Link sendet keinen Referrer.

Alles steht in **`data/gemeinschaft.json`**: Schalter, Einladungslink, Hausordnung, Kanäle, Einstellungen und Team-Leitfaden. Daraus entstehen die Website-Seite und `discord/VORLAGE.md` (zum Einfügen in Discord). Beide bleiben dadurch gleich.

**Vorbereitet (Standard):** `"live": false`. Die Seite trägt `noindex`, steht in keiner Navigation, Sitemap oder Suche, und der Datenschutz-Absatz zu Discord erscheint noch nicht. Den Einladungslink **nicht** vorher eintragen: Das Repository ist öffentlich, jeder könnte beitreten, bevor Regeln und Moderation stehen (der Bau warnt davor).

**Öffnen:**
1. Server nach `discord/VORLAGE.md` einrichten, Checkliste in Abschnitt 8 abarbeiten.
2. Einladungslink erstellen (läuft nie ab, unbegrenzte Nutzungen) und in `data/gemeinschaft.json` unter `einladung` eintragen.
3. `"live": true` setzen und hochladen. Der Bau bricht ab, wenn `live` ohne gültigen Discord-Link gesetzt ist.
4. Automatisch erscheinen dann: Menüpunkt unter „Projekt“, Höhenmesser-Stopp (Etage 50, 340 m), Suchtreffer, eine Option im Einstiegs-Assistenten und der Discord-Absatz im Datenschutz.
5. Eintrag „Gemeinschaft eröffnet“ in `data/neuigkeiten.json`.

**Neuigkeiten automatisch nach Discord (optional, ohne Bot):**
1. In Discord beim Kanal `#neuigkeiten`: Kanal bearbeiten → Integrationen → Webhooks → Neuer Webhook, URL kopieren.
2. Im GitHub-Repository: Settings → Secrets and variables → Actions → New repository secret, Name `DISCORD_WEBHOOK`, Wert die URL.
3. Fertig. Ab dem nächsten Push meldet Schritt 5 des Workflows neue Einträge aus `data/neuigkeiten.json` im Kanal, sofern `live` gesetzt ist. Mehr als drei neue Einträge auf einmal werden zu einer Sammelmeldung. Ein geänderter Titel zählt als neuer Eintrag. Der Schritt kann den Bau nie zum Scheitern bringen. Gesendet wird nur öffentlicher Seiteninhalt.

