#!/usr/bin/env python3
"""
Meldet neue Einträge aus data/neuigkeiten.json im Discord-Kanal #neuigkeiten — per Webhook, ohne Bot.

Läuft als letzter Schritt des Workflows und ist bewusst harmlos:
  - ohne Repository-Geheimnis DISCORD_WEBHOOK passiert nichts,
  - solange data/gemeinschaft.json nicht "live" ist, passiert nichts,
  - "neu" heißt: steht jetzt in neuigkeiten.json, stand aber vor dem Push (BEFORE_SHA) noch nicht darin,
  - jeder Fehler wird nur gemeldet, nie zum Abbruch (der Workflow ruft das mit continue-on-error auf).

Was gesendet wird, ist ausschließlich öffentlicher Seiteninhalt: Titel, Kurztext, Link. Keine Nutzerdaten.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
MAX_EINZELN = 3          # mehr neue Einträge auf einmal → eine Sammelmeldung statt einer Flut


def site_url():
    m = re.search(r'^SITE_URL\s*=\s*"([^"]+)"', (WURZEL / "_build" / "build.py").read_text(encoding="utf-8"), re.M)
    return m.group(1).rstrip("/") if m else ""


def kurz(text, n=380):
    if len(text) <= n:
        return text
    stueck = text[:n]
    punkt = max(stueck.rfind(". "), stueck.rfind("! "), stueck.rfind("? "))
    return (stueck[:punkt + 1] if punkt > n * 0.5 else stueck.rsplit(" ", 1)[0] + " …")


def schluessel(e):
    return (e.get("datum", ""), e.get("titel", ""))


def sende(webhook, inhalt):
    daten = json.dumps({"content": inhalt[:1990], "username": "Syntaxis", "allowed_mentions": {"parse": []}}).encode("utf-8")
    anfrage = urllib.request.Request(webhook, data=daten, method="POST", headers={
        "Content-Type": "application/json",
        "User-Agent": "Syntaxis-Site/1.0 (+https://syntaxisbuch.github.io)",   # Discord weist den Standard-Agenten von Python ab
    })
    with urllib.request.urlopen(anfrage, timeout=15) as r:
        return r.status


def main():
    webhook = os.environ.get("DISCORD_WEBHOOK", "").strip()
    if not webhook:
        print("Discord: kein Webhook hinterlegt — nichts zu melden.")
        return 0
    g = json.loads((WURZEL / "data" / "gemeinschaft.json").read_text(encoding="utf-8"))
    if not g.get("live"):
        print("Discord: Gemeinschaft ist nicht live — nichts gemeldet.")
        return 0
    vorher = os.environ.get("BEFORE_SHA", "").strip()
    if not vorher or set(vorher) <= {"0"}:
        print("Discord: kein Vergleichsstand (neuer Branch?) — nichts gemeldet.")
        return 0
    alt = subprocess.run(["git", "show", f"{vorher}:data/neuigkeiten.json"], cwd=WURZEL, capture_output=True, text=True)
    if alt.returncode != 0:
        print("Discord: Vergleichsstand nicht auffindbar (Force-Push?) — nichts gemeldet.")
        return 0
    bekannt = {schluessel(e) for e in json.loads(alt.stdout)["eintraege"]}
    jetzt = json.loads((WURZEL / "data" / "neuigkeiten.json").read_text(encoding="utf-8"))["eintraege"]
    neu = [e for e in jetzt if schluessel(e) not in bekannt]
    if not neu:
        print("Discord: keine neuen Einträge.")
        return 0

    basis = site_url()
    neu.reverse()                                   # älteste zuerst, so wie sie entstanden sind
    if len(neu) > MAX_EINZELN:
        zeilen = "\n".join(f"• **{e['titel']}**" for e in neu[:10])
        meldungen = [f"**{len(neu)} neue Einträge in den Neuigkeiten**\n{zeilen}\n{basis}/neuigkeiten.html"]
    else:
        meldungen = [f"**{e['titel']}**\n{kurz(e['text'])}\n{basis}/{e['link']}" for e in neu]
    for m in meldungen:
        try:
            print(f"Discord: gemeldet ({sende(webhook, m)}) — {m.splitlines()[0]}")
        except (urllib.error.URLError, OSError) as fehler:
            print(f"::warning title=Discord::Meldung nicht zugestellt: {fehler}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
