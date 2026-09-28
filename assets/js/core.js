/* SYNTAXIS — Grundfunktionen: Höhenmesser, Menü, Suche */
(() => {
  "use strict";

  /* Die Ebenen der Stadt sind zugleich die Ebenen der Website.
     z = Meter über dem Stadt-Basisdatum. */
  const EBENEN = [
    { z:  520, slug: "index",       titel: "Turmspitze",              unter: "Start und Übersicht",             href: "index.html" },
    { z:  500, slug: "landkarte",   titel: "Landkarte der Realität",  unter: "Oberste Terrasse — Vernunft",     href: "landkarte.html", c: "lr" },
    { z:  500, slug: "quellen",     titel: "Quellenverzeichnis",      unter: "Reale Institutionen und Bücher",  href: "quellen.html", c: "lr", sub: true },
    { z:  400, slug: "licht",       titel: "Licht der Realität",      unter: "Obere-Mittlere — Messung",        href: "licht.html",     c: "ld" },
    { z:  280, slug: "downloads",   titel: "Ausgabestelle",           unter: "Mittlere Terrasse — Verwaltung",  href: "downloads.html" },
    { z:  280, slug: "neuigkeiten", titel: "Neuigkeiten",             unter: "Änderungsverlauf mit RSS",        href: "neuigkeiten.html", sub: true },
    { z:  280, slug: "glossar",     titel: "Glossar",                  unter: "Begriffe und Signaturen",         href: "glossar.html", sub: true },
    { z:  180, slug: "atlas",       titel: "Kartographischer Atlas",  unter: "Mittlere-Untere — Gedächtnis",    href: "atlas.html" },
    { z:  180, slug: "bildband",    titel: "Das Bildarchiv",           unter: "Mnemosynes Aufnahmen",             href: "bildband.html", sub: true },
    { z:   80, slug: "chroniken",   titel: "Chroniken von Neocortex City", unter: "Untere Terrasse — Trieb",    href: "chroniken.html", c: "nc" },
    { z:   80, slug: "frequenz-404", titel: "Frequenz 404",              unter: "Medienviertel — Studio 6",        href: "frequenz-404.html", c: "nc", sub: true },
    { z:   20, slug: "gegenfragen", titel: "Gegenfragen-Kartei",      unter: "Thalamus Central Station",        href: "gegenfragen.html" },
    { z:    0, slug: "werkzeuge",   titel: "Das Rüstzeug",            unter: "Unterste Terrasse — Grundfunktionen", href: "werkzeuge.html" },
    { z:  -60, slug: "autopsien",   titel: "Autopsien der Schatten",  unter: "Sub-Unterste — Seziersaal",       href: "autopsien.html", c: "au" }
  ];

  /* Die Gemeinschaft erscheint erst, wenn der Server offen ist (data/gemeinschaft.json → live) */
  if (document.body.dataset.gemeinschaft === "1")
    EBENEN.push({ z: 340, slug: "gemeinschaft", titel: "Gemeinschaft", unter: "Tower of Reason, Etage 50 — Broca-Areal", href: "gemeinschaft.html", sub: true });

  const seite = document.body.dataset.seite || "";
  const ZMAX = 520, ZMIN = -60;

  /* ---------- Höhenmesser ---------- */
  const skala = document.getElementById("hmSkala");
  if (skala) {
    EBENEN.forEach(e => {
      const p = (ZMAX - e.z) / (ZMAX - ZMIN);
      const a = document.createElement("a");
      a.className = "hm-stop";
      a.href = e.href;
      a.style.top = (p * 100) + "%";
      if (e.c) a.dataset.c = e.c;
      if (e.sub) a.dataset.sub = "1";
      if (e.slug === seite) a.setAttribute("aria-current", "page");
      a.innerHTML = `<span class="pkt"></span><span class="tip"><b>${e.titel}</b><span class="z">${e.z} m</span></span>`;
      a.setAttribute("aria-label", `${e.titel}, ${e.z} Meter`);
      skala.appendChild(a);
    });
  }

  /* ---------- Hauptnavigation ----------
     Eine Leiste für alles: am Rechner mit Ausklappmenüs, auf dem Telefon als Menü-Tafel.
     Der Inhalt kommt aus NAV in _build/build.py. */
  const nav = document.getElementById("hauptnav");
  const kopf = document.getElementById("kopf");
  const menuAuf = document.getElementById("menuAuf");
  const gruppen = [...document.querySelectorAll(".navgruppe")];

  function schliesseGruppen(ausser) {
    gruppen.forEach(g => {
      if (g === ausser) return;
      g.classList.remove("offen");
      g.querySelector(".navknopf")?.setAttribute("aria-expanded", "false");
    });
  }
  gruppen.forEach(g => {
    const knopf = g.querySelector(".navknopf");
    knopf?.addEventListener("click", () => {
      const offen = !g.classList.contains("offen");
      schliesseGruppen(g);
      g.classList.toggle("offen", offen);
      knopf.setAttribute("aria-expanded", String(offen));
    });
    /* Aktuelle Seite: Punkt markieren, Gruppe hervorheben */
    if ((g.dataset.slugs || "").split(" ").includes(seite)) g.classList.add("aktiv");
  });
  document.querySelectorAll(".hauptnav a[data-s]").forEach(a => {
    if (a.dataset.s === seite) a.setAttribute("aria-current", "page");
  });
  document.addEventListener("click", ev => { if (!ev.target.closest(".navgruppe")) schliesseGruppen(); });
  document.addEventListener("keydown", ev => {
    if (ev.key !== "Escape") return;
    const offen = gruppen.find(g => g.classList.contains("offen"));
    if (offen) { schliesseGruppen(); offen.querySelector(".navknopf")?.focus(); }
    if (kopf?.classList.contains("menu-offen")) { kopf.classList.remove("menu-offen"); menuAuf?.setAttribute("aria-expanded", "false"); menuAuf?.focus(); }
  });
  menuAuf?.addEventListener("click", () => {
    const offen = kopf.classList.toggle("menu-offen");
    menuAuf.setAttribute("aria-expanded", String(offen));
    menuAuf.textContent = offen ? "Schließen" : "Menü";
  });

  /* ---------- Sprungleiste: die Abschnitte einer Seite auf einen Blick ----------
     Jeder Abschnitt mit data-sprung="Name" bekommt einen Eintrag. Ab zwei Einträgen erscheint die Leiste. */
  const ziele = [...document.querySelectorAll("main section[id][data-sprung]")];
  if (ziele.length >= 2) {
    const leiste = document.createElement("nav");
    leiste.className = "sprungleiste";
    leiste.setAttribute("aria-label", "Auf dieser Seite");
    leiste.innerHTML = '<div class="wrap">' + ziele.map(s =>
      `<a href="#${s.id}">${s.dataset.sprung}</a>`).join("") + "</div>";
    const hero = document.querySelector("main > .hero");
    (hero || document.querySelector("main").firstElementChild).after(leiste);
    const links = [...leiste.querySelectorAll("a")];
    if ("IntersectionObserver" in window) {
      const beob = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.toggleAttribute("aria-current", l.getAttribute("href") === "#" + e.target.id));
      }), { rootMargin: "-35% 0px -60% 0px" });
      ziele.forEach(s => beob.observe(s));
    }
  }

  /* ---------- Lesefortschritt ---------- */
  const balken = document.getElementById("fortschritt");
  let ticking = false;
  function fortschritt() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    balken.style.width = (max > 60 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + "%";
  }

  /* ---------- Reihenzeiger: welche Reihe gerade sichtbar ist ---------- */
  const zeiger = document.getElementById("reihenzeiger");
  const bloecke = [...document.querySelectorAll("[data-reihenname]")];
  let zeigeReihe = () => {};
  if (zeiger && bloecke.length > 1) {
    const nm = zeiger.querySelector(".nm"), kz = zeiger.querySelector(".kz");
    let aktuell = null;
    zeigeReihe = () => {
      const linie = 130;                       // knapp unter Kopfleiste und Zeiger
      let treffer = null;
      for (const b of bloecke) {
        const r = b.getBoundingClientRect();
        if (r.top <= linie && r.bottom > linie) { treffer = b; break; }
        if (r.top <= linie) treffer = b;       // letzter, dessen Oberkante passiert ist
      }
      const ersterOben = bloecke[0].getBoundingClientRect().top > linie;
      if (ersterOben || !treffer) { zeiger.classList.remove("an"); aktuell = null; return; }
      const letzter = bloecke[bloecke.length - 1].getBoundingClientRect();
      if (letzter.bottom < linie) { zeiger.classList.remove("an"); aktuell = null; return; }
      zeiger.classList.add("an");
      if (treffer === aktuell) return;
      aktuell = treffer;
      zeiger.setAttribute("data-reihe", treffer.dataset.reihe);
      nm.textContent = treffer.dataset.reihenname;
      kz.textContent = treffer.dataset.reihe.toUpperCase();
    };
  }

  /* ---------- Sanftes Auftauchen ---------- */
  const sanft = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (sanft && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal");
    const ziele = document.querySelectorAll(
      ".stratum > .wrap > *, .pforte, .werk, .fall, .karte, .sektion, .kit > div");
    ziele.forEach(el => el.classList.add("auf"));
    const auf = new IntersectionObserver((es, o) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        const i = [...e.target.parentElement.children].indexOf(e.target);
        e.target.style.transitionDelay = Math.min(i, 6) * 45 + "ms";
        e.target.classList.add("da");
        o.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .04 });
    ziele.forEach(el => auf.observe(el));
    /* Was schon beim Laden im Bild ist, sofort zeigen */
    setTimeout(() => ziele.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("da");
    }), 60);
  }

  function beiScroll() { fortschritt(); zeigeReihe(); }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { beiScroll(); ticking = false; }); }
  }, { passive: true });
  addEventListener("resize", beiScroll, { passive: true });
  beiScroll();

  /* ---------- Suche ---------- */
  const fenster = document.getElementById("suchfenster");
  const eingabe = document.getElementById("suchEingabe");
  const trefferListe = document.getElementById("suchTreffer");
  let index = null, ladend = null, cursor = 0;

  async function ladeIndex() {
    if (index) return index;
    if (ladend) return ladend;
    ladend = (async () => {
      const eintraege = [];
      EBENEN.forEach(e => eintraege.push({ art: "Ebene", titel: e.titel, unter: `${e.unter} · ${e.z} m`, href: e.href, gew: 3 }));
      eintraege.push(
        { art: "Seite", titel: "Lizenz und Nutzung", unter: "Was erlaubt ist, was nicht", href: "lizenz.html", gew: 2 },
        { art: "Seite", titel: "Impressum und Haftungsausschluss", unter: "Kontakt, Urheber, neurale Assistenz", href: "impressum.html", gew: 2 }
      );
      try {
        const [werke, stadt, wz, gf, f404] = await Promise.all([
          fetch("data/werke.json").then(r => r.json()).catch(() => null),
          fetch("data/stadt.json").then(r => r.json()).catch(() => null),
          fetch("data/werkzeuge.json").then(r => r.json()).catch(() => null),
          fetch("data/gegenfragen.json").then(r => r.json()).catch(() => null),
          fetch("data/frequenz404.json").then(r => r.json()).catch(() => null)
        ]);
        werke?.reihen.forEach(r => {
          eintraege.push({ art: "Reihe", titel: r.titel, unter: r.claim, href: r.seite, gew: 3 });
          (r.baende || []).forEach(b => eintraege.push({
            art: r.kennung + "-" + (b.nr || ""), titel: b.titel,
            unter: (b.fall || b.inhalt || "").slice(0, 96), href: r.seite, gew: 2
          }));
          (r.sammelbaende || []).forEach(s => eintraege.push({
            art: "AU-" + s.sektion, titel: s.titel, unter: s.unter, href: "autopsien.html#sammelband", gew: 3
          }));
          (r.faelle || []).forEach(f => eintraege.push({
            art: "AU-" + String(f.nr).padStart(2, "0"), titel: f.titel,
            unter: f.unter, href: "autopsien.html#au-" + f.nr, gew: 2
          }));
        });
        stadt?.sektoren.forEach(s => eintraege.push({
          art: s.id, titel: s.name, unter: `${s.hirn} · Z ${s.z} m`, href: "atlas.html#" + s.id, gew: 2
        }));
        wz?.ruestzeug.forEach(k => eintraege.push({
          art: k.sig, titel: k.name, unter: k.kern, href: "werkzeuge.html#kartei", gew: 1
        }));
        wz?.redflags.punkte.forEach(p => eintraege.push({
          art: "Red Flag " + p.nr, titel: p.name, unter: p.frage, href: "werkzeuge.html#redflags", gew: 1
        }));
        f404?.folgen.forEach(f => eintraege.push({
          art: f.nummer, titel: f.titel, unter: f.thema, href: "frequenz-404.html#" + f.id, gew: 1
        }));
        gf?.forEach(g => eintraege.push({
          art: g.id, titel: g.behauptung, unter: "Gegenfrage aus Autopsie #" + String(g.au).padStart(2, "0"),
          href: "gegenfragen.html#" + g.id, gew: 1
        }));
      } catch (e) { /* Index bleibt auf den Grundeinträgen */ }
      index = eintraege;
      return index;
    })();
    return ladend;
  }

  function norm(s) {
    return (s || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[„“”"‚‘’']/g, "");
  }

  function suche(q) {
    const n = norm(q).trim();
    if (!n) return index.filter(e => e.gew >= 3).slice(0, 9);
    const worte = n.split(/\s+/);
    return index
      .map(e => {
        const heu = norm(e.art + " " + e.titel + " " + e.unter);
        let p = 0;
        for (const w of worte) {
          const i = heu.indexOf(w);
          if (i < 0) return null;
          p += (i === 0 ? 6 : 3) + e.gew;
          if (norm(e.titel).startsWith(w)) p += 5;
          if (norm(e.art) === w) p += 12;
        }
        return { e, p };
      })
      .filter(Boolean)
      .sort((a, b) => b.p - a.p)
      .slice(0, 14)
      .map(x => x.e);
  }

  function hervor(text, q) {
    const n = norm(q).trim().split(/\s+/).filter(Boolean);
    let t = text;
    if (!n.length) return t;
    const nt = norm(t);
    const i = nt.indexOf(n[0]);
    if (i < 0) return t;
    return t.slice(0, i) + "<mark>" + t.slice(i, i + n[0].length) + "</mark>" + t.slice(i + n[0].length);
  }

  function zeichne(q) {
    const treffer = suche(q);
    cursor = 0;
    trefferListe.innerHTML = treffer.length
      ? treffer.map((e, i) => `<li><a href="${e.href}" class="${i === 0 ? "aktiv" : ""}">
          <span class="art">${e.art}</span>
          <span class="txt">${hervor(e.titel, q)}<small>${e.unter || ""}</small></span></a></li>`).join("")
      : `<li><a href="gegenfragen.html"><span class="art">—</span><span class="txt">Kein Treffer<small>Versuch es mit einem Stadtsektor wie NK-01, einer Werksignatur wie LR-I-1.2.3 oder einem Stichwort.</small></span></a></li>`;
  }

  async function oeffne() {
    await ladeIndex();
    fenster.classList.add("offen");
    zeichne("");
    eingabe.value = "";
    eingabe.focus();
  }
  function schliesse() { fenster.classList.remove("offen"); }

  document.getElementById("suchAuf")?.addEventListener("click", oeffne);
  fenster?.querySelector("[data-schliessen]")?.addEventListener("click", schliesse);
  eingabe?.addEventListener("input", () => zeichne(eingabe.value));

  document.addEventListener("keydown", ev => {
    const tippt = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if (ev.key === "/" && !tippt && !fenster.classList.contains("offen")) { ev.preventDefault(); oeffne(); return; }
    if ((ev.key === "k" || ev.key === "K") && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); oeffne(); return; }
    if (!fenster.classList.contains("offen")) return;
    if (ev.key === "Escape") { schliesse(); return; }
    const links = [...trefferListe.querySelectorAll("a")];
    if (!links.length) return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      links[cursor]?.classList.remove("aktiv");
      cursor = (cursor + (ev.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links[cursor].classList.add("aktiv");
      links[cursor].scrollIntoView({ block: "nearest" });
    }
    if (ev.key === "Enter") { ev.preventDefault(); links[cursor]?.click(); }
  });
})();


/* ---------- Downloads: Verfügbarkeit beim Aufruf prüfen ----------
   build.py entscheidet beim Bauen, ob ein Knopf ausgegraut ist. Wird eine Datei danach
   hochgeladen, ohne dass neu gebaut wird, wäre der Knopf sonst noch tagelang falsch.
   Deshalb fragt die Seite jede Datei kurz ab (HEAD, ein paar Bytes) und korrigiert den Zustand. */
(() => {
  if (location.protocol === "file:") return;
  const links = [...document.querySelectorAll(".dl a[href]")];
  if (!links.length) return;

  const abgleich = async () => {
    await Promise.all(links.map(async a => {
      try {
        const r = await fetch(a.getAttribute("href"), { method: "HEAD", cache: "no-store" });
        if (r.ok) a.removeAttribute("aria-disabled"); else a.setAttribute("aria-disabled", "true");
      } catch (e) { /* offline: Zustand aus dem Build stehen lassen */ }
    }));
    document.querySelectorAll(".dl").forEach(dl => {
      const fehlt = dl.querySelector('a[aria-disabled="true"]');
      const hinweis = dl.nextElementSibling;
      if (hinweis?.classList.contains("dateihinweis")) hinweis.hidden = !fehlt;
      const werk = dl.closest(".werk");
      const status = werk?.querySelector(".status[data-auto]");
      if (status) {
        const da = !!dl.querySelector("a:not([aria-disabled])");
        status.textContent = da ? "verfügbar" : "Datei folgt";
        status.dataset.s = da ? "verfuegbar" : "";
      }
    });
  };
  (window.requestIdleCallback || (f => setTimeout(f, 200)))(abgleich);
})();
