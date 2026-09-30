#!/usr/bin/env python3
"""
Syntaxis - Ein Projekt &uuml;ber kritisches Denken — Seitengenerator.

Setzt die fertigen HTML-Dateien im Wurzelverzeichnis aus
_build/layout.html und den Fragmenten in _build/pages/ zusammen.

Aufruf:  python3 _build/build.py
"""
import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
LAYOUT = (WURZEL / "_build" / "layout.html").read_text(encoding="utf-8")
PAGES = WURZEL / "_build" / "pages"
WERKE = json.loads((WURZEL / "data" / "werke.json").read_text(encoding="utf-8"))
STADT = json.loads((WURZEL / "data" / "stadt.json").read_text(encoding="utf-8"))
BILDER = json.loads((WURZEL / "data" / "bildband.json").read_text(encoding="utf-8"))
FOLGEN = json.loads((WURZEL / "data" / "frequenz404.json").read_text(encoding="utf-8"))["folgen"]
GEGENFRAGEN = json.loads((WURZEL / "data" / "gegenfragen.json").read_text(encoding="utf-8"))
WERKZEUGE = json.loads((WURZEL / "data" / "werkzeuge.json").read_text(encoding="utf-8"))
GEMEINSCHAFT = json.loads((WURZEL / "data" / "gemeinschaft.json").read_text(encoding="utf-8"))
GEMEINSCHAFT_LIVE = bool(GEMEINSCHAFT.get("live"))
# Seiten, die (noch) nicht in Navigation, Sitemap und Suche auftauchen dürfen
NICHT_INDEXIEREN = set() if GEMEINSCHAFT_LIVE else {"gemeinschaft"}

# ---------------------------------------------------------------------------
# EINZIGE STELLE FÜR DIE DOMAIN.
# Ändert sich der Hosting-Ort — Repository-Umzug, eigene Domain — genügt eine
# Änderung hier. Sitemap, robots.txt und die og:url/canonical-Angaben
# jeder Seite werden daraus abgeleitet.
#
# Aktuell: das Repository heißt "Syntaxisbuch.github.io" (umbenannt von
# "Syntaxis"), GitHub Pages liefert es deshalb an der Wurzel aus, ohne
# Unterordner. Für eine eigene Domain später: SITE_URL hier ändern und eine
# Datei "CNAME" mit genau der Domain (ohne https://, ohne Pfad) ins
# Wurzelverzeichnis legen — siehe README, Abschnitt "Domain".
# ---------------------------------------------------------------------------
SITE_URL = "https://syntaxisbuch.github.io"

ROEM = {"1": "I", "2": "II", "3": "III", "4": "IV"}


def reihe(rid):
    return next(r for r in WERKE["reihen"] if r["id"] == rid)


def datei_da(d):
    """Liegt die Datei im Repository (oder ist es ein externer Link)?"""
    return d["datei"].startswith(("http://", "https://")) or (WURZEL / d["datei"]).exists()


def slug(s):
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.lower().replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def au_dateien(r, f):
    """Jede Autopsie ist ein eigenes Buch. Dateiname: autopsien-<nr>-<kurzname>, Kurzname aus dem Coverdateinamen."""
    basis = f.get("dateibasis")
    if not basis:
        stamm = Path(f["cover"]).stem if f.get("cover") else f'{f["nr"]:02d}-{slug(f["titel"])}'
        basis = "autopsien-" + re.sub(r"^au-", "", stamm)
    formate = {"PDF": "empfohlen", "EPUB": "Testversion", "ODT": "zum Bearbeiten"}
    return [{"format": fm, "datei": f"downloads/{basis}.{fm.lower()}", "label": "", "zusatz": formate[fm]}
            for fm in r.get("dateiformate", ["PDF", "EPUB", "ODT"])]


def ausgaben_von(r):
    """Alle einzeln herunterladbaren Ausgaben einer Reihe — Grundlage für Downloads-Seite und LIESMICH.md."""
    if r["id"] == "nc":
        return [{"titel": f'Band {b["nr"]} — {b["titel"]}', "unter": b["fall"], "stand": b.get("stand"),
                 "cover": b.get("cover"), "dateien": b.get("dateien")} for b in r["baende"]]
    if r["id"] == "lr":
        return r["ausgaben"]
    if r["id"] == "au":
        sammel = [{"titel": s["titel"], "unter": s["unter"], "stand": s.get("stand"), "sammel": True,
                   "cover": s.get("cover"), "dateien": au_dateien(r, s)} for s in r.get("sammelbaende", [])]
        return sammel + [{"titel": f'{f["nr"]:02d} — {f["titel"]}', "unter": f["unter"], "stand": None,
                 "cover": f.get("cover_klein") or f.get("cover"), "dateien": au_dateien(r, f)} for f in r["faelle"]]
    return [{"titel": r["titel"], "unter": r["claim"], "stand": None, "cover": r.get("cover"), "dateien": r.get("dateien")}]


def status_von(b):
    """Ausdrücklicher Status gewinnt; sonst „verfügbar“ nur, wenn wirklich eine Datei liegt."""
    if b.get("status"):
        return b["status"]
    return "verfügbar" if any(datei_da(x) for x in (b.get("dateien") or [])) else "Datei folgt"


def dateiliste(dateien, prefix=""):
    """Downloadknöpfe. Fehlende Dateien werden sichtbar, aber inaktiv gesetzt."""
    if not dateien:
        return '<p class="dateihinweis">Noch keine Datei hinterlegt — dieser Band ist in Arbeit.</p>'
    teile = []
    for d in dateien:
        label = d.get("label", "")
        if label.strip().upper() == d["format"].upper():
            label = ""
        zusatz = f'<span class="z">{d["zusatz"]}</span>' if d.get("zusatz") else ""
        aus = "" if datei_da(d) else ' aria-disabled="true"'
        name = f'{prefix}, {d["format"]}' if prefix else d["format"]   # Screenreader: „Buch 1 — Die Reise, PDF“
        teile.append(f'<a href="{d["datei"]}" data-f="{d["format"].lower()}"{aus} aria-label="{name}" download><span class="f">{d["format"]}</span>{label}{zusatz}</a>')
    versteckt = " hidden" if all(datei_da(d) for d in dateien) else ""
    hinweis = f'<p class="dateihinweis"{versteckt}>Grau hinterlegte Formate sind noch nicht abgelegt.</p>'
    return f'<div class="dl">{"".join(teile)}</div>{hinweis}'


def rendere_baende_ld():
    r = reihe("ld")
    zeilen = []
    for b in r["baende"]:
        zeilen.append(f'''<div class="werk">
        <span class="band">BAND {b["nr"]}</span>
        <div><h3>{b["titel"]}</h3><p>{b["inhalt"]}</p></div>
        <span class="status">geplant</span>
      </div>''')
    return '<div class="werkliste">' + "".join(zeilen) + "</div>"


def rendere_au_plan():
    plan = json.loads((WURZEL / "data" / "autopsie-plan.json").read_text(encoding="utf-8"))
    blöcke = []
    for s in plan["sektionen"]:
        fertig = s.get("status") == "abgeschlossen"
        eintraege = []
        for f in s["faelle"]:
            u = '<span class="u">— ' + f["unter"] + "</span>" if f["unter"] else ""
            h = '<span class="hw">' + f["notiz"] + "</span>" if f["notiz"] else ""
            eintraege.append(
                '<li><span class="n">%03d</span><span class="t">%s %s%s</span></li>'
                % (f["nr"], f["titel"], u, h))
        offen = " open" if fertig else ""
        stand = "abgeschlossen" if fertig else "geplant"
        blöcke.append(
            '<details class="sektion"%s><summary>'
            '<span class="mark">SEKTION %s</span><span class="nm">%s</span>'
            '<span class="zz">%d Fälle · %s</span></summary>'
            '<p class="unter-s">%s</p><ol class="planliste">%s</ol></details>'
            % (offen, s["id"], s["name"], len(s["faelle"]), stand,
               s.get("unter", ""), "".join(eintraege)))
    return "".join(blöcke)


def rendere_baende_lr():
    r = reihe("lr")
    zeilen = []
    for b in r["baende"]:
        zeilen.append(f'''<div class="werk">
        <span class="band">BAND {b["nr"]}</span>
        <div><h3>{b["titel"]}</h3><p>{b["inhalt"]}</p></div>
        <span class="status">LR-{b["nr"]}</span>
      </div>''')
    return '<div class="werkliste">' + "".join(zeilen) + "</div>"


def rendere_lr_buch2():
    r = reihe("lr")
    b2 = r["buch2"]
    zeilen = []
    for t in b2["teile"]:
        marke = f'TEIL {t["teil"]}' if t["teil"] else "—"
        hinweis = f'<p class="kennung" style="margin-top:.3rem">{t["hinweis"]}</p>' if t.get("hinweis") else ""
        zeilen.append(f'''<div class="werk">
        <span class="band">{marke}</span>
        <div><h3 style="font-size:1.3rem">{t["titel"]}</h3>{hinweis}</div>
      </div>''')
    return '<div class="werkliste">' + "".join(zeilen) + "</div>"


def klappentext(text):
    """Erster Satz sichtbar, der Rest zum Aufklappen. Kurze Texte bleiben ganz stehen."""
    teile = re.split(r"(?<=[.!?…])\s+(?=[A-ZÄÖÜ„])", text, maxsplit=1)
    if len(teile) < 2 or len(text) < 260:
        return f"<p>{text}</p>"
    return (f'<p>{teile[0]}</p><details class="mehr"><summary>Weiterlesen</summary>'
            f'<p>{teile[1]}</p></details>')


def rendere_baende_nc():
    r = reihe("nc")
    zeilen = []

    for b in r["baende"]:
        tags = " · ".join(b.get("tags", []))
        st = status_von(b)

        cover = ""
        if b.get("cover"):
            cover = f'''<figure class="chroniken-bandcover">
            <img src="{b["cover"]}"
                 alt="Band {b["nr"]} – {b["titel"]}"
                 loading="lazy">
          </figure>'''

        verfuegbar = "verfuegbar" if (st == "verfügbar" or st.startswith("Fassung")) else ""
        kap = f'{b["kapitel"]} Kapitel' + (f' {b["kapitel_zusatz"]}' if b.get("kapitel_zusatz") else "") if b.get("kapitel", 0) > 0 else ""
        meta = " · ".join(x for x in [kap, tags] if x)

        zeilen.append(f'''<article class="werk" id="nc-{b["nr"].lower()}">
        <span class="band">BAND {b["nr"]}<br>{b["jahr"]}</span>
        {cover}
        <div>
          <h3>{b["titel"]}</h3>
          <p style="color:var(--bone);margin-bottom:.6rem"><strong>{b["fall"]}</strong> — {b["ort"]}</p>
          {klappentext(b["text"])}
          {f'<p class="kennung" style="margin-top:.7rem">{meta}</p>' if meta else ""}
          {dateiliste(b.get("dateien"), b["titel"])}
        </div>
        <span class="status" data-s="{verfuegbar}"{" data-auto" if not b.get("status") else ""}>{st}</span>
      </article>''')

    return '<div class="werkliste">' + "".join(zeilen) + "</div>"

def rendere_figuren():
    r = reihe("nc")
    zellen = "".join(
        f'<div class="zelle"><span class="kennung">{f["ort"]}</span>'
        f'<h4>{f["name"]}</h4><p style="color:var(--bone);margin-bottom:.4rem">{f["rolle"]}</p>'
        f'<p>{f["notiz"]}</p></div>' for f in r["figuren"])
    return f'<div class="raster drei">{zellen}</div>'


def rendere_faelle():
    """Autopsien als kompakte Karten: Cover, Titel, Kernsatz, Stufe sichtbar — Details und Dateien zum Aufklappen."""
    r = reihe("au")
    karten = []
    for f in r["faelle"]:
        balken = "".join(f'<i class="{"an" if i < f["level"] else ""}"></i>' for i in range(5))
        stufe = next(s for s in r["gefahrenskala"] if s["level"] == f["level"])
        bild = ""
        if f.get("cover"):
            bild = (f'<a class="fk-cover" href="{f["cover"]}" target="_blank" rel="noopener" aria-label="Cover vergrößern: {f["titel"]}">'
                    f'<img src="{f.get("cover_klein", f["cover"])}" alt="" loading="lazy" decoding="async">'
                    f'<span class="ki-hinweis">KI-generiert</span></a>')
        karten.append(f'''<article class="fallkarte" id="au-{f["nr"]}" data-l="{f["level"]}">
        {bild}
        <div class="fk-text">
          <p class="fk-kopf"><span class="nr">AU-A-{f["nr"]:02d}</span>
            <span class="stufe" data-l="{f["level"]}" title="{stufe["text"]}"><span class="balken">{balken}</span> {stufe["name"]}</span></p>
          <h3>{f["titel"]}</h3>
          <p class="unter">{f["unter"]}</p>
          <details class="mehr">
            <summary>Worum es geht und herunterladen</summary>
            <p class="kern">{f["kern"]}</p>
            <dl class="fk-daten"><dt>Ursprung</dt><dd>{f["ursprung"]}</dd><dt>Ton der Akte</dt><dd>{f["ton"]}</dd><dt>Gefährdung</dt><dd>Stufe {f["level"]}: {stufe["text"]}</dd></dl>
            {dateiliste(au_dateien(r, f), f["titel"])}
          </details>
        </div>
      </article>''')
    return '<div class="fallraster" id="fallraster">' + "".join(karten) + "</div>"


def rendere_au_sammelband():
    """Sammelbände je Sektion, oben über den Einzelfällen."""
    r = reihe("au")
    bloecke = []
    for s in r.get("sammelbaende", []):
        cover = f'<img src="{s["cover"]}" alt="" loading="lazy" decoding="async">' if s.get("cover") else ""
        bloecke.append(f'''<div class="sammelband">
        {cover}
        <div>
          <p class="kennung">Sektion {s["sektion"]} komplett</p>
          <h3>{s["titel"]}</h3>
          <p>{s["unter"]}. Wer die ganze Sektion lesen will, lädt nur eine Datei.</p>
          {dateiliste(au_dateien(r, s), s["titel"])}
        </div>
      </div>''')
    return "".join(bloecke)


def rendere_neuigkeiten():
    D = json.loads((WURZEL / "data" / "neuigkeiten.json").read_text(encoding="utf-8"))
    zeilen = []
    for e in D["eintraege"]:
        datum = e["datum"]
        anzeige = f"{datum[8:10]}.{datum[5:7]}.{datum[0:4]}"
        zeilen.append(f'''<article class="neuigkeit">
          <span class="kennung">{anzeige}</span>
          <div><h3><a href="{e["link"]}">{e["titel"]}</a></h3><p>{e["text"]}</p></div>
        </article>''')
    return "".join(zeilen)


def rendere_quellen():
    D = json.loads((WURZEL / "data" / "quellen.json").read_text(encoding="utf-8"))
    bloecke = []
    for g in D["gruppen"]:
        eintraege = []
        for e in g["eintraege"]:
            kopf = e["name"]
            if e.get("url"):
                kopf = f'<a href="{e["url"]}" target="_blank" rel="noopener">{e["name"]} <span class="ext">↗</span></a>'
            unter = e.get("autor", "")
            eintraege.append(f'''<div class="gleintrag quelle">
              <dt>{kopf}{f'<span class="autor">{unter}</span>' if unter else ""}
                  <span class="kurz">{e["kurz"]}</span></dt>
              <dd>{e["text"]}</dd>
            </div>''')
        bloecke.append(f'''<section class="glgruppe">
          <h3 class="glgruppe-kopf">{g["name"]}<span class="kennung">{len(g["eintraege"])}</span></h3>
          <dl class="glossar">{"".join(eintraege)}</dl>
        </section>''')
    return "".join(bloecke)


def rendere_gefahrenskala():
    r = reihe("au")
    zeilen = "".join(
        f'<tr><td class="zahl">L{s["level"]}</td><td><strong>{s["name"]}</strong></td>'
        f'<td class="leise">{s["text"]}</td></tr>' for s in r["gefahrenskala"])
    return (f'<table class="daten"><thead><tr><th>Stufe</th><th>Bezeichnung</th>'
            f'<th>Bedeutung</th></tr></thead><tbody>{zeilen}</tbody></table>')


def rendere_downloads():
    """Downloads als Reiter, ein Reiter je Reihe. Ohne JavaScript stehen alle Reihen untereinander."""
    reiter, bloecke = [], []
    for r in WERKE["reihen"]:
        liz = WERKE["lizenzen"][r["lizenz"]]
        ausgaben = ausgaben_von(r)
        zeilen = []
        for a in ausgaben:
            cover = a.get("cover")
            bild = f'<img class="dz-cover" src="{cover}" alt="" loading="lazy" decoding="async">' if cover else '<span class="dz-cover leer" aria-hidden="true"></span>'
            stand = f' <span class="kennung">{a["stand"]}</span>' if a.get("stand") else ""
            zeilen.append(f'''<li class="dzeile{" sammel" if a.get("sammel") else ""}">
              {bild}
              <div class="dz-text"><h3>{a["titel"]}</h3><p>{a["unter"]}{stand}</p></div>
              {dateiliste(a.get("dateien"), a["titel"])}
            </li>''')
        n = sum(1 for a in ausgaben if a.get("dateien"))
        anzahl = f"{n} Ausgabe" + ("" if n == 1 else "n") if n else "in Vorbereitung"
        reiter.append(f'<button type="button" role="tab" id="tab-{r["id"]}" aria-controls="dl-{r["id"]}" data-reihe="{r["id"]}">'
                      f'<span class="pkt"></span>{r["titel"]}<small>{anzahl}</small></button>')
        hinweis = f'<p class="leise dl-hinweis">{r["downloadhinweis"]}</p>' if r.get("downloadhinweis") else ""
        bloecke.append(f'''<section class="dl-reihe reihenblock" id="dl-{r["id"]}" role="tabpanel" aria-labelledby="tab-{r["id"]}"
                data-reihe="{r["id"]}">
              <header class="dl-kopf"><h2>{r["titel"]}</h2>
                <a class="lizenzmarke" href="lizenz.html">{liz["kurz"]}</a>
                <a class="leise" href="{r["seite"]}">Zur Reihe</a></header>
              {hinweis}
              <ul class="dliste">{"".join(zeilen) if zeilen else '<li class="dzeile"><p class="leise">Noch keine Dateien. Die Reihe ist in Vorbereitung.</p></li>'}</ul>
            </section>''')
    return (f'<div class="dl-reiter" role="tablist" aria-label="Reihen">{"".join(reiter)}</div>'
            f'<div class="dl-bloecke">{"".join(bloecke)}</div>')


def rendere_f404_stimmen():
    D = json.loads((WURZEL / "data" / "frequenz404.json").read_text(encoding="utf-8"))
    z = "".join(
        f'<div class="zelle"><span class="kennung">{s["rolle"].upper()}</span>'
        f'<h4>{s["name"]}</h4><p>{s["notiz"]}</p></div>' for s in D["reihe"]["stimmen"])
    return f'<div class="raster drei">{z}</div>'


def rendere_f404_baende():
    D = json.loads((WURZEL / "data" / "frequenz404.json").read_text(encoding="utf-8"))
    z = "".join(
        f'<div class="werk"><span class="band">BAND {e["band"]}</span>'
        f'<div><h3 style="font-size:1.2rem">{e["titel"]}</h3><p>{e["notiz"]}</p></div></div>'
        for e in D["aus_den_baenden"])
    return f'<div class="werkliste">{z}</div>'



def rendere_gemeinschaft_tor():
    """Der Hinweis vor dem Klick. Discord wird nur von dem einen Knopf hier aus geöffnet — nie direkt von einer anderen Seite."""
    G = GEMEINSCHAFT
    punkte = "".join(f"<li>{x}</li>" for x in G["vorab"])
    kontakt = f'<a class="knopf still" href="mailto:{G["server"]["kontakt"]}?subject=Syntaxis%20%E2%80%94%20Gemeinschaft">Lieber per E-Mail</a>'
    if not GEMEINSCHAFT_LIVE:
        return ('''<div class="hinweisbox tor">
          <p><strong>Der Server ist noch nicht geöffnet.</strong> Regeln und Moderation werden vorbereitet, bevor jemand eingeladen wird — ein leerer, ungeregelter Ort wäre der schlechteste erste Eindruck.</p>
          <p class="leise">Bis dahin erreichst du uns per E-Mail: <a href="mailto:%s">%s</a>.</p>
        </div>''' % (G["server"]["kontakt"], G["server"]["kontakt"]))
    link = G["einladung"]
    return f'''<div class="hinweisbox tor">
      <h2 style="font-size:1.5rem;margin:0 0 .8rem">Bevor du gehst</h2>
      <p>Der Server liegt nicht auf dieser Website, sondern bei einem Fremdanbieter. Vier Dinge vorab:</p>
      <ol class="vorab">{punkte}</ol>
      <div class="knopfreihe">
        <a class="knopf voll" href="{link}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Verstanden — zum Discord-Server</a>
        {kontakt}
      </div>
      <p class="kennung" style="margin:.9rem 0 0">Öffnet sich in einem neuen Tab · mit dem Beitritt gilt die Hausordnung unten</p>
    </div>'''


def rendere_gemeinschaft_regeln():
    zeilen = "".join(
        f'<li><strong>{r["titel"]}</strong><span>{r["text"]}</span></li>' for r in GEMEINSCHAFT["regeln"])
    return f'<ol class="hausordnung">{zeilen}</ol>'


def rendere_gemeinschaft_kanaele():
    bloecke = []
    for g in GEMEINSCHAFT["gruppen"]:
        zeilen = "".join(
            f'''<div class="gleintrag kanal">
              <dt><span class="raute">#</span>{k["name"]}<span class="kurz">{"Team schreibt" if k["schreiben"] != "alle" else "alle schreiben"}</span></dt>
              <dd>{k["beschreibung"]}</dd>
            </div>''' for k in g["kanaele"])
        bloecke.append(f'<section class="glgruppe"><h3 class="glgruppe-kopf">{g["name"]}<span class="kennung">{len(g["kanaele"])}</span></h3><dl class="glossar">{zeilen}</dl></section>')
    return "".join(bloecke)


def rendere_discord_datenschutz():
    """Absatz für impressum.html — nur, wenn der Link tatsächlich existiert."""
    if not GEMEINSCHAFT_LIVE:
        return ""
    return ('<p><strong>Discord.</strong> Auf der Seite <a href="gemeinschaft.html">Gemeinschaft</a> führt ein Knopf zu einem Discord-Server (Discord Inc., USA). '
            'Erst mit dem Klick verlässt du diese Website; ab dann gilt die Datenschutzerklärung von Discord. Diese Website bindet nichts von Discord ein — kein Widget, kein Skript, '
            'keine Schrift — und der Link übermittelt keine Herkunftsangabe (Referrer). Für den Server brauchst du ein Discord-Konto; welche Angaben Discord dafür verlangt, regelt Discord. '
            'Auf dem Server sehen wir als Betreiber, was Discord Serverbetreibern anzeigt (Beiträge, Anzeigename, Beitrittsdatum), und nutzen es ausschließlich zur Moderation. '
            'Der Server ist ein zusätzliches Angebot: Alles, was dort möglich ist, geht auch per E-Mail.</p>')


def stadt_version():
    m = re.search(r"\bv\d+\b", STADT.get("quelle", ""))
    return m.group(0) if m else "?"


def zahlen_platzhalter():
    """Zahlen aus den Daten, damit sie in Texten nie wieder von den Daten abweichen."""
    ebenen = [x for x in STADT["terrassen"] if x["id"] != "grenzlage"]
    hoehen = [e["z"] for e in STADT["turm"]] + [x["z"] for x in ebenen]
    return {
        "{{N_SEKTOREN}}": lambda: str(len(STADT["sektoren"])),
        "{{N_EBENEN}}": lambda: str(len(ebenen)),
        "{{N_BRUECKEN}}": lambda: str(len(STADT["bruecken"])),
        "{{N_VERKEHR}}": lambda: str(len([v for v in STADT["verkehr"] if v["id"] != "fussweg"])),
        "{{SPANNWEITE}}": lambda: str(max(hoehen) - min(hoehen)),
        "{{STADT_VERSION}}": stadt_version,
        "{{N_BILDER}}": lambda: str(sum(len(a["bilder"]) for a in BILDER["akten"])),
        "{{N_FOLGEN}}": lambda: str(len(FOLGEN)),
        "{{N_GEGENFRAGEN}}": lambda: str(len(GEGENFRAGEN)),
        "{{N_WERKZEUGE}}": lambda: str(len(WERKZEUGE["ruestzeug"])),
        "{{N_AUTOPSIEN}}": lambda: str(len(reihe("au")["faelle"])),
    }

def rendere_download_umleitungen():
    """Alte Download-Adressen weiterleiten (für die 404-Seite).

    Veröffentlichte Dateien liegen als GitHub Release, nicht mehr unter /downloads/.
    Wer einen alten Direktlink wie /downloads/chroniken-1-….pdf aufruft, landet auf
    der 404-Seite; dieses Skript schickt ihn zur aktuellen Fassung derselben Datei
    oder, wenn es sie (noch) nicht gibt, zur Ausgabestelle. Die Tabelle entsteht bei
    jedem Bau aus werke.json und bleibt damit von selbst aktuell.
    """
    ziele = {}
    def sammle(knoten):
        if isinstance(knoten, dict):
            if isinstance(knoten.get("datei"), str) and datei_da(knoten):
                d = knoten["datei"]
                ziele[d.rsplit("/", 1)[-1]] = d if d.startswith(("http://", "https://")) else "/" + d
            for w in knoten.values():
                sammle(w)
        elif isinstance(knoten, list):
            for w in knoten:
                sammle(w)
    sammle(WERKE)
    tabelle = json.dumps(dict(sorted(ziele.items())), ensure_ascii=False)
    return ("<script>(function(){var ziele=" + tabelle + ";"
            "var p=location.pathname.replace(/^\\/Syntaxis\\//,'/');"
            "var m=p.match(/^\\/downloads\\/([^\\/]+)$/);if(!m)return;"
            "var d=decodeURIComponent(m[1]);var z=ziele[d];"
            "if(z&&z!==location.pathname){location.replace(z);}else{location.replace('/downloads.html');}"
            "})();</script>")


BAUSTEINE = {
    "{{LR_BAENDE}}": rendere_baende_lr,
    "{{LR_BUCH2}}": rendere_lr_buch2,
    "{{LD_BAENDE}}": rendere_baende_ld,
    "{{AU_PLAN}}": rendere_au_plan,
    "{{NC_BAENDE}}": rendere_baende_nc,
    "{{NC_FIGUREN}}": rendere_figuren,
    "{{AU_FAELLE}}": rendere_faelle,
    "{{AU_SAMMELBAND}}": rendere_au_sammelband,
    "{{AU_SKALA}}": rendere_gefahrenskala,
    "{{DOWNLOADS}}": rendere_downloads,
    "{{F404_STIMMEN}}": rendere_f404_stimmen,
    "{{F404_BAENDE}}": rendere_f404_baende,
    "{{QUELLEN}}": rendere_quellen,
    "{{NEUIGKEITEN}}": rendere_neuigkeiten,
    "{{DOWNLOAD_UMLEITUNGEN}}": rendere_download_umleitungen,
}
BAUSTEINE.update(zahlen_platzhalter())
BAUSTEINE.update({
    "{{GEMEINSCHAFT_TOR}}": rendere_gemeinschaft_tor,
    "{{GEMEINSCHAFT_REGELN}}": rendere_gemeinschaft_regeln,
    "{{GEMEINSCHAFT_KANAELE}}": rendere_gemeinschaft_kanaele,
    "{{DISCORD_DATENSCHUTZ}}": rendere_discord_datenschutz,
    "{{GEMEINSCHAFT_LIVE_JS}}": lambda: "true" if GEMEINSCHAFT_LIVE else "false",
})

# slug: (Titel, Beschreibung, Reihenfarbe, zusätzliche Skripte)
SEITEN = {
    "index":       ("Syntaxis — Ein Projekt &uuml;ber kritisches Denken",
                    "Kostenlose Bücher über kritisches Denken, Mythen und eine Stadt, die gebaut ist wie ein Gehirn. PDF und EPUB unter Creative-Commons-Lizenz.", "", ""),
    "landkarte":   ("Die Landkarte der Realität — Syntaxis",
                    "Das Hauptwerk in zwei Büchern: Buch 1, Die Reise, in acht Bänden vom Rüstzeug des Denkens bis zur Anatomie der Chimäre, dazu Buch 2, Die Werkstatt, als Nachschlagewerk.", "lr", ""),
    "chroniken":   ("Chroniken von Neocortex City — Syntaxis",
                    "Fünf Kriminalromane (drei erschienen, zwei in Arbeit) in einer Stadt, die gebaut ist wie ein menschliches Gehirn. Noir mit belegtem Anhang.", "nc", ""),
    "autopsien":   ("Autopsien der Schatten — Syntaxis",
                    "Mythen, seziert nach einem festen Protokoll. Zehn Fallakten sind fertig, 105 in zehn Sektionen sind geplant.", "au", ""),
    "licht":       ("Licht der Realität — Syntaxis",
                    "Ein Mythos als Türöffner, dahinter die Wissenschaft, die ihn auflöst — ein Band je Fachgebiet. In Vorbereitung.", "ld", ""),
    "atlas":       ("Kartographischer Atlas von Neocortex City — Syntaxis",
                    "Die Stadt als begehbares Gehirn: 27 Sektoren mit echten Koordinaten, Höhenschnitt, Wegzeiten und neuroanatomischer Entsprechung.", "",
                    '<script src="assets/js/atlas.js"></script>'),
    "werkzeuge":   ("Das Rüstzeug — Syntaxis",
                    "Red-Flag-Prüfung, Autopsie-Protokoll und ein Kartenkasten mit den Werkzeugen aus der Landkarte der Realität.", "lr",
                    '<script src="assets/js/werkzeuge.js"></script>'),
    "gegenfragen": ("Gegenfragen-Kartei — Syntaxis",
                    "115 verbreitete Behauptungen, die Falle dahinter und je eine Gegenfrage, die weiterführt statt zu belehren.", "au",
                    '<script src="assets/js/gegenfragen.js"></script>'),
    "downloads":   ("Downloads — Syntaxis",
                    "Alle Syntaxis-Werke als PDF und EPUB, kostenlos und unter Creative-Commons-Lizenz.", "", ""),
    "lizenz":      ("Lizenz und Nutzung — Syntaxis",
                    "Was mit den Syntaxis-Werken erlaubt ist: CC BY-NC-ND 4.0 für die Chroniken, CC BY-NC 4.0 für Landkarte und Autopsien.", "", ""),
    "impressum":   ("Impressum und Haftungsausschluss — Syntaxis",
                    "Herausgeber, Kontakt, neurale Assistenz und Haftungsausschluss.", "", ""),
    "frequenz-404": ("Frequenz 404 — Der Piratensender aus Neocortex City",
                    "Cassidy Null, Kevin und Dr. Tacheles streiten sich um drei Uhr nachts durch die Mythen der Stadt. Wöchentlich wechselnde Sendung plus Archiv.", "nc",
                    '<script src="assets/js/frequenz404.js"></script>'),
    "bildband":    ("Das Bildarchiv — Syntaxis",
                    "Mnemosynes Bildarchiv: Stadtansichten und Schauplätze, an der Wand aufgereiht und mit rotem Faden verbunden.", "",
                    '<script src="assets/js/bildband.js"></script>'),
    "glossar":     ("Glossar — Syntaxis",
                    "Signatur, Terrasse, Asservat, Toleranz-Zone: 35 Begriffe aus den Werken und der Stadt, durchsuchbar.", "",
                    '<script src="assets/js/glossar.js"></script>'),
    "quellen":     ("Quellenverzeichnis — Syntaxis",
                    "GWUP, Mimikama, Psiram, Hoaxilla und weiterführende Bücher: die realen Institutionen und Werke hinter dem Ansatz von Syntaxis.", "lr", ""),
    "neuigkeiten": ("Neuigkeiten — Syntaxis",
                    "Was zuletzt dazukam: neue Folgen, neue Bereiche, neue Werke — chronologisch, mit RSS-Feed.", "", ""),
    "gemeinschaft": ("Gemeinschaft — Syntaxis",
                    "Reden über die Werke, die Fälle und die Frage, wie man Behauptungen prüft: Hausordnung, Kanäle und der Weg zum Discord-Server, mit Hinweis vor dem Klick.", "", ""),
    "404":         ("Seite nicht gefunden — Syntaxis",
                    "Diese Adresse liegt außerhalb des Koordinatensystems.", "", ""),
}


# ---------------------------------------------------------------------------
# NAVIGATION — eine Quelle für Kopfleiste und Mobilmenü.
# Neue Seite ins Menü: hier eine Zeile ergänzen. Gruppen mit „punkte“ werden
# zum Ausklappmenü, Gruppen mit „href“ sind ein direkter Link.
# „wenn“ blendet einen Punkt nur unter einer Bedingung ein.
# ---------------------------------------------------------------------------
NAV = [
    {"titel": "Werke", "punkte": [
        ("landkarte",    "Die Landkarte der Realität",   "Das Hauptwerk: wie man Behauptungen prüft", "lr"),
        ("chroniken",    "Chroniken von Neocortex City", "Noir-Krimis in einer Stadt wie ein Gehirn", "nc"),
        ("autopsien",    "Autopsien der Schatten",       "Mythen, seziert nach festem Protokoll", "au"),
        ("licht",        "Licht der Realität",           "Populärwissenschaft, in Vorbereitung", "ld"),
        ("frequenz-404", "Frequenz 404",                 "Der Piratensender aus den Chroniken", "nc"),
    ]},
    {"titel": "Mehrwert", "punkte": [
        ("werkzeuge",   "Das Rüstzeug",         "Red Flags, Protokoll, Denkwerkzeuge", ""),
        ("gegenfragen", "Gegenfragen-Kartei",   "Verbreitete Sätze und was man fragen kann", ""),
        ("atlas",       "Atlas von Neocortex City", "Die Stadt als begehbare Karte", ""),
        ("bildband",    "Bildarchiv",           "Ansichten und Schauplätze", ""),
        ("glossar",     "Glossar",              "Begriffe und Signaturen", ""),
        ("quellen",     "Quellenverzeichnis",   "Reale Institutionen und Bücher", ""),
    ]},
    {"titel": "Projekt", "punkte": [
        ("neuigkeiten",  "Neuigkeiten",          "Was zuletzt dazukam, mit RSS", ""),
        ("gemeinschaft", "Gemeinschaft",         "Der Discord-Server mit Hausordnung", "", "gemeinschaft"),
        ("lizenz",       "Lizenz und Nutzung",   "Was erlaubt ist und was nicht", ""),
        ("impressum",    "Impressum und Kontakt", "Herausgeber, KI-Einsatz, Haftung", ""),
    ]},
    {"titel": "Downloads", "href": "downloads", "hervor": True},
]


def rendere_navigation():
    """Kopfnavigation aus NAV. Ausklappmenüs funktionieren per Klick, Tastatur und (am Rechner) beim Überfahren."""
    teile = []
    for i, g in enumerate(NAV):
        if "href" in g:
            kl = "navlink hervor" if g.get("hervor") else "navlink"
            teile.append(f'      <a class="{kl}" href="{g["href"]}.html" data-s="{g["href"]}">{g["titel"]}</a>')
            continue
        punkte = []
        slugs = []
        for p in g["punkte"]:
            slug, titel, hinweis, farbe = p[:4]
            if len(p) > 4 and p[4] == "gemeinschaft" and not GEMEINSCHAFT_LIVE:
                continue
            slugs.append(slug)
            punkt = f'<span class="pkt" data-c="{farbe}"></span>' if farbe else '<span class="pkt"></span>'
            punkte.append(f'<li><a href="{slug}.html" data-s="{slug}">{punkt}<span><b>{titel}</b><small>{hinweis}</small></span></a></li>')
        teile.append(
            f'      <div class="navgruppe" data-slugs="{" ".join(slugs)}">\n'
            f'        <button type="button" class="navknopf" aria-expanded="false" aria-controls="navpanel-{i}">{g["titel"]}</button>\n'
            f'        <ul class="navpanel" id="navpanel-{i}">{"".join(punkte)}</ul>\n'
            f'      </div>')
    return "\n".join(teile)


def seiten_url(slug):
    """Kanonische Adresse einer Seite. index.html liegt an der Wurzel ohne Dateinamen."""
    return SITE_URL + "/" if slug == "index" else f"{SITE_URL}/{slug}.html"


def baue():
    global NAVIGATION_HTML
    NAVIGATION_HTML = rendere_navigation()
    gebaut = 0
    for slug, (titel, beschr, reihenfarbe, skripte) in SEITEN.items():
        frag = PAGES / f"{slug}.html"
        if not frag.exists():
            print(f"  fehlt: {frag.name}", file=sys.stderr)
            continue
        inhalt = frag.read_text(encoding="utf-8")
        for marke, fn in BAUSTEINE.items():
            if marke in inhalt:
                try:
                    inhalt = inhalt.replace(marke, fn())
                except Exception as e:
                    meldung = (f"Baustein {marke} ({fn.__name__}) auf Seite '{slug}' ist fehlgeschlagen: "
                               f"{type(e).__name__}: {e}. Häufigste Ursache: data/*.json und _build/build.py stammen "
                               f"aus unterschiedlichen Ständen, etwa wenn ein Upload auf mehrere Commits verteilt wurde. "
                               f"Der letzte Lauf nach dem vollständigen Upload zählt.")
                    print(f"::error title=Seitengenerator::{meldung}", file=sys.stderr)  # erscheint als Fehler-Annotation in GitHub Actions
                    raise RuntimeError(meldung) from e
        html = (LAYOUT
                .replace("{{TITEL}}", titel)
                .replace("{{BESCHREIBUNG}}", beschr)
                .replace("{{REIHE}}", reihenfarbe)
                .replace("{{SLUG}}", slug)
                .replace("{{SKRIPTE}}", skripte)
                .replace("{{URL}}", seiten_url(slug))
                .replace("{{ROBOTS}}", '<meta name="robots" content="noindex,nofollow">' if slug in NICHT_INDEXIEREN else "")
                .replace("{{NAVIGATION}}", NAVIGATION_HTML)
                .replace("{{GEMEINSCHAFT_LIVE}}", "1" if GEMEINSCHAFT_LIVE else "0")
                .replace("{{OGBILD}}", SITE_URL + "/assets/img/og.png")
                .replace("{{INHALT}}", inhalt))
        if slug == "404":
            # GitHub Pages liefert 404.html für jede fehlende Adresse aus, auch tief
            # verschachtelte (/downloads/x.pdf). Ohne feste Basis zeigten die relativen
            # Pfade zu CSS, Skripten und Links dann ins Leere.
            html = html.replace("<head>\n", '<head>\n<base href="/">\n', 1)
            # Mit <base> würde „#inhalt“ zur Startseite führen – Sprungmarke direkt setzen.
            html = html.replace('href="#inhalt"', 'href="#inhalt" onclick="location.hash=\'inhalt\';return false"')
        (WURZEL / f"{slug}.html").write_text(html, encoding="utf-8")
        gebaut += 1
        print(f"  {slug}.html")
    print(f"\n{gebaut} Seiten gebaut.")
    return gebaut


def schreibe_sitemap():
    """sitemap.xml aus SEITEN — nie mehr von Hand nachpflegen, nie mehr veraltet."""
    prio = {"index": "1.0", "downloads": "0.9", "atlas": "0.8",
            "werkzeuge": "0.8", "gegenfragen": "0.8", "glossar": "0.6"}
    zeilen = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for slug in SEITEN:
        if slug == "404" or slug in NICHT_INDEXIEREN:
            continue
        zeilen.append(
            f"  <url><loc>{seiten_url(slug)}</loc><changefreq>monthly</changefreq>"
            f"<priority>{prio.get(slug, '0.7')}</priority></url>")
    zeilen.append("</urlset>")
    (WURZEL / "sitemap.xml").write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    print("  sitemap.xml")


def schreibe_robots():
    (WURZEL / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    print("  robots.txt")


def umleitungsseite(ziel):
    """Eine einzelne Weiterleitungsseite. ziel ist der Pfad ab der Domain-Wurzel,
    leer für die Startseite. Leitet per JavaScript weiter (behält #Sprungmarken
    und ?Parameter der alten Adresse) und per <noscript>-Meta-Refresh als Rückfall."""
    return f'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seite umgezogen — Syntaxis</title>
<meta name="robots" content="noindex,follow">
<noscript><meta http-equiv="refresh" content="0; url=/{ziel}"></noscript>
<script>location.replace("/{ziel}" + location.hash + location.search);</script>
<style>
  body{{background:#0C1519;color:#DDE2DC;font-family:Georgia,serif;display:flex;
       align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;
       text-align:center}}
  a{{color:#3FA8A0}}
  p{{max-width:32rem;line-height:1.6;font-size:1.05rem}}
</style>
</head>
<body>
<p>Diese Seite ist umgezogen.<br>Falls die Weiterleitung nicht von selbst startet:
<a href="/{ziel}">weiter zu syntaxisbuch.github.io/{ziel}</a></p>
</body>
</html>'''


def schreibe_umleitungen():
    """Alter Pfad /Syntaxis/… → neue Wurzeladresse, Seite für Seite.

    Nach der Repository-Umbenennung (siehe README, Abschnitt „Domain“) existiert
    der Projektordner /Syntaxis/ nicht mehr, unter dem die Seite bis dahin lief.
    Jede dort verlinkte oder mit Lesezeichen versehene Unterseite würde sonst auf
    eine 404 laufen — nicht nur die Startseite. Für jede reguläre Seite entsteht
    deshalb hier ein winziger Umleiter am alten Ort, der project- und dateiweit
    automatisch mitwächst: taucht ein neuer Eintrag in SEITEN auf, bekommt er
    beim nächsten Bauen seinen Umleiter dazu, ohne dass das hier angefasst wird.
    """
    ordner = WURZEL / "Syntaxis"
    ordner.mkdir(exist_ok=True)
    ziele = {slug: ("" if slug == "index" else f"{slug}.html")
             for slug in SEITEN if slug != "404"}
    gewollt = set()
    for slug, ziel in ziele.items():
        datei = "index.html" if slug == "index" else f"{slug}.html"
        gewollt.add(datei)
        (ordner / datei).write_text(umleitungsseite(ziel), encoding="utf-8")
    # Umleiter zu Seiten, die es nicht mehr gibt, würden ins Leere führen — weg damit
    for alt in ordner.glob("*.html"):
        if alt.name not in gewollt:
            alt.unlink()
            print(f"  Syntaxis/{alt.name} entfernt (Seite existiert nicht mehr)")
    print(f"  Syntaxis/ — {len(ziele)} Umleitungen")


def schreibe_feed():
    """RSS 2.0 aus data/neuigkeiten.json — dieselbe Datei speist auch die
    Neuigkeiten-Seite. Ein neuer Eintrag dort taucht hier automatisch auf,
    ohne dass die Feed-Datei je von Hand angefasst werden muss."""
    D = json.loads((WURZEL / "data" / "neuigkeiten.json").read_text(encoding="utf-8"))
    def rfc822(datum):
        j, m, t = int(datum[:4]), int(datum[5:7]), int(datum[8:10])
        MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        return f"{t:02d} {MON[m-1]} {j} 12:00:00 +0000"
    def esc(s):
        return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    items = []
    for e in D["eintraege"]:
        link = seiten_url(e["link"].replace(".html", "")) if e["link"] != "index.html" else SITE_URL + "/"
        items.append(f'''  <item>
    <title>{esc(e["titel"])}</title>
    <link>{link}</link>
    <guid isPermaLink="false">{e["datum"]}-{esc(e["titel"])}</guid>
    <pubDate>{rfc822(e["datum"])}</pubDate>
    <description>{esc(e["text"])}</description>
  </item>''')
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Syntaxis — Neuigkeiten</title>
  <link>{SITE_URL}/neuigkeiten.html</link>
  <description>Neue Folgen, Bereiche und Werke bei Syntaxis — einem Projekt über kritisches Denken.</description>
  <language>de-de</language>
  <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(items)}
</channel>
</rss>
'''
    (WURZEL / "feed.xml").write_text(xml, encoding="utf-8")
    print("  feed.xml")


def schreibe_downloadliste():
    """downloads/LIESMICH.md: alle erwarteten Dateinamen mit Häkchen — direkt aus werke.json, nie veraltet."""
    zeilen = ["# Downloads — erwartete Dateien", "",
              "Diese Datei erzeugt `_build/build.py` bei jedem Lauf aus `data/werke.json` — nicht von Hand bearbeiten.",
              "✅ = Datei liegt im Ordner, ⬜ = fehlt noch. Dateinamen bleiben für immer gleich; eine neue Fassung ersetzt die alte unter demselben Namen.", ""]
    fehlt = gesamt = 0
    for r in WERKE["reihen"]:
        eintraege = [a for a in ausgaben_von(r) if a.get("dateien")]
        if not eintraege:
            continue
        zeilen += [f"## {r['titel']}", "", "| Ausgabe | Format | Dateiname | |", "|---|---|---|---|"]
        for a in eintraege:
            for d in a["dateien"]:
                da = datei_da(d); gesamt += 1; fehlt += 0 if da else 1
                zeilen.append(f"| {a['titel']} | {d['format']} | `{d['datei'].split('/')[-1]}` | {'✅' if da else '⬜'} |")
        zeilen.append("")
    (WURZEL / "downloads" / "LIESMICH.md").write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    print(f"  downloads/LIESMICH.md — {gesamt - fehlt} von {gesamt} Dateien vorhanden, {fehlt} fehlen noch")


def pruefe_verknuepfungen():
    """Meldet Verweise ins Leere als Warnung (in GitHub Actions als Annotation), ohne den Bau zu stoppen."""
    ids = {s["id"] for s in STADT["sektoren"]}
    baende = {b["nr"] for b in reihe("nc")["baende"]}
    faelle = {f["nr"] for f in reihe("au")["faelle"]}
    brueckennamen = {b["name"] for b in STADT["bruecken"]}
    meldungen, gesehen = [], set()
    for a in BILDER["akten"]:
        for b in a["bilder"]:
            if b["id"] in gesehen: meldungen.append(f'Bild-ID doppelt: {b["id"]}')
            gesehen.add(b["id"])
            if b.get("sektor") and b["sektor"] not in ids: meldungen.append(f'Bild {b["id"]}: Sektor {b["sektor"]} steht nicht in stadt.json')
            if b.get("band") and b["band"] not in baende: meldungen.append(f'Bild {b["id"]}: Band {b["band"]} unbekannt')
            if isinstance(b.get("bruecke"), str) and b["bruecke"] not in brueckennamen: meldungen.append(f'Bild {b["id"]}: Brücke „{b["bruecke"]}“ unbekannt')
            ziel = b.get("ziel") or ""
            m = re.fullmatch(r"autopsien\.html#au-(\d+)", ziel)
            if ziel and not m: meldungen.append(f'Bild {b["id"]}: Ziel {ziel} ist kein bekannter Anker')
            if m and int(m.group(1)) not in faelle: meldungen.append(f'Bild {b["id"]}: Autopsie {m.group(1)} gibt es nicht')
            for f in ("bild", "gross"):
                if b.get(f) and not (WURZEL / b[f]).exists(): meldungen.append(f'Bild {b["id"]}: Datei {b[f]} fehlt')
    for br in STADT["bruecken"]:
        for seite in ("von", "nach"):
            v = br[seite]
            if re.fullmatch(r"[A-Z]{1,4}-\d\d", v) and v not in ids: meldungen.append(f'Brücke {br["name"]}: {v} steht nicht in stadt.json')
    for m in meldungen:
        print(f"::warning title=Verknüpfung::{m}", file=sys.stderr)
    print(f"  Verknüpfungen geprüft — {len(meldungen)} Warnung(en)" if meldungen else "  Verknüpfungen geprüft — keine Verweise ins Leere")


def pruefe_gemeinschaft():
    """Ein kaputter oder fehlender Einladungslink darf nie live gehen; ein vorzeitig eingetragener steht im öffentlichen Repository."""
    G = GEMEINSCHAFT; link = G.get("einladung", "")
    gueltig = re.fullmatch(r"https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9-]+", link or "")
    if GEMEINSCHAFT_LIVE and not gueltig:
        meldung = "data/gemeinschaft.json: live ist true, aber 'einladung' ist leer oder kein Discord-Einladungslink (https://discord.gg/… oder https://discord.com/invite/…)."
        print(f"::error title=Gemeinschaft::{meldung}", file=sys.stderr)
        raise RuntimeError(meldung)
    if not GEMEINSCHAFT_LIVE and link:
        print("::warning title=Gemeinschaft::Die Einladung steht in data/gemeinschaft.json, obwohl der Server nicht live ist. "
              "Das Repository ist öffentlich: Jeder kann den Link lesen und beitreten, bevor Regeln und Moderation stehen.", file=sys.stderr)
    for g in G["gruppen"]:
        for k in g["kanaele"]:
            if not re.fullmatch(r"[a-z0-9-]{1,100}", k["name"]):
                print(f'::warning title=Gemeinschaft::Kanalname „{k["name"]}“: Discord erlaubt nur Kleinbuchstaben, Ziffern und Bindestriche.', file=sys.stderr)
    n = sum(len(g["kanaele"]) for g in G["gruppen"])
    print(f"  Gemeinschaft: {'LIVE' if GEMEINSCHAFT_LIVE else 'vorbereitet, nicht live'} — {len(G['regeln'])} Regeln, {n} Kanäle")


def schreibe_discord_vorlage():
    """discord/VORLAGE.md: alles zum Einfügen in Discord, aus derselben Datei wie die Website-Seite."""
    G = GEMEINSCHAFT; S = G["server"]
    z = ["# Discord-Vorlage — zum Einfügen", "",
         "Diese Datei erzeugt `_build/build.py` bei jedem Lauf aus `data/gemeinschaft.json` — nicht von Hand bearbeiten. "
         "Ändern: `data/gemeinschaft.json`. So bleiben Website und Server gleich.", "",
         "## 1. Server", "", f"- **Name:** {S['name']}", f"- **Beschreibung (Community-Einstellungen):** {S['beschreibung']}", "",
         "## 2. Einstellungen, in dieser Reihenfolge", ""]
    z += [f"{i}. {x}" for i, x in enumerate(G["einstellungen"], 1)]
    z += ["", "## 3. Rollen", ""] + [f"- **{r['name']}** — {r['zweck']}" for r in G["rollen"]]
    z += ["", "## 4. Kanäle", "", "Namen genau so anlegen (Kleinbuchstaben, Bindestriche). „Thema“ ist das Feld unter dem Kanalnamen.", ""]
    for g in G["gruppen"]:
        z += [f"### Kategorie: {g['name']}", ""]
        for k in g["kanaele"]:
            z += [f"**#{k['name']}** — schreiben: {k['schreiben']}", "", f"- Thema: {k['thema']}", f"- Beschreibung: {k['beschreibung']}", ""]
    z += ["## 5. Text für #willkommen (als eine Nachricht, Regeln in einer zweiten)", "",
          "> **Willkommen bei Syntaxis.**",
          "> Hier reden wir über die Werke, die Fälle und die Frage, wie man Behauptungen prüft. Die Hausregel steht ganz oben und gilt für alle, auch für das Team: **hart gegen die Behauptung, nachgiebig gegen den, der sie glaubt.**",
          f"> Impressum: {SITE_URL}/impressum.html · Alles Wichtige geht auch ohne Discord: {S['kontakt']}",
          f"> Diese Ordnung steht auch auf der Website: {SITE_URL}/gemeinschaft.html", "",
          "## 6. Hausordnung (zweite Nachricht in #willkommen, auch für die Regelbestätigung)", ""]
    for i, r in enumerate(G["regeln"], 1):
        z += [f"**{i}. {r['titel']}**", r["text"], ""]
    z += ["## 7. Leitfaden für das Team", "",
          "*Diese Datei liegt im öffentlichen Repository; der Leitfaden ist deshalb bewusst ohne Interna formuliert. Er ersetzt keine Rechtsberatung. Die AutoMod-Wortliste gehört nicht hierher.*", "",
          "Die Leitfrage im Zweifel: *Was ist hier die Behauptung, und wer ist der Mensch dahinter?* Die Behauptung darf hart angefasst werden, der Mensch nicht.", "",
          "| Fall | Vorgehen |", "|---|---|"]
    z += [f"| {f['fall']} | {f['vorgehen']} |" for f in G["leitfaden"]]
    z += ["", "## 8. Vor dem Öffnen: Checkliste", "",
          "- [ ] Alle Einstellungen aus Abschnitt 2 gesetzt, besonders Zwei-Faktor-Anmeldung und zweite Admin-Person",
          "- [ ] Kanäle, Rollen, Willkommenstext und Hausordnung eingerichtet, Regelbestätigung getestet (mit einem zweiten Konto)",
          "- [ ] Altersgrenze entschieden und in Willkommenstext und Hausordnung ergänzt (Discord verlangt selbst ein Mindestalter)",
          "- [ ] Wortliste für AutoMod angelegt",
          "- [ ] Einladungslink erstellt: läuft nie ab, unbegrenzte Nutzungen",
          "- [ ] Link in `data/gemeinschaft.json` unter `einladung` eintragen, `live` auf `true` setzen, hochladen",
          "- [ ] Optional: Webhook für #neuigkeiten anlegen und als Repository-Geheimnis `DISCORD_WEBHOOK` speichern (Anleitung in der README)",
          "- [ ] Eintrag in `data/neuigkeiten.json`: „Gemeinschaft eröffnet“", ""]
    (WURZEL / "discord").mkdir(exist_ok=True)
    (WURZEL / "discord" / "VORLAGE.md").write_text("\n".join(z) + "\n", encoding="utf-8")
    print("  discord/VORLAGE.md")


if __name__ == "__main__":
    print("Syntaxis — Seiten werden gebaut:\n")
    pruefe_gemeinschaft()      # zuerst: ein ungültiger Schalter darf keine halb fertigen Seiten hinterlassen
    baue()
    schreibe_sitemap()
    schreibe_robots()
    schreibe_umleitungen()
    schreibe_feed()
    schreibe_downloadliste()
    pruefe_verknuepfungen()
    schreibe_discord_vorlage()
