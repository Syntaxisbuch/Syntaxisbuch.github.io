/* SYNTAXIS — Fahrt zwischen den Ebenen.
   Eine kurze Fahrstuhl-Fahrt (Streifen, Lichtstrahl, Kabine im Höhenmesser), wenn man die Ebene über den Höhenmesser, die Hauptnavigation
   oder das Logo wechselt. Nur bei der Menüwahl: nie beim Lesen, Scrollen, bei Links im Text oder bei Sprungmarken.
   Die Fahrt ist eine Funktion der Zahl `phase` (0…1) und läuft in zwei Hälften: Abfahrt (0 → 0,5) auf der alten Seite, Ankunft (0,5 → 1) auf der neuen;
   der Zustand dazwischen steht im sessionStorage. Aus bei „Bewegung reduzieren“ (Lesen und Sehen), prefers-reduced-motion und Datensparmodus.
   Ohne dieses Skript funktioniert die Navigation unverändert. */
(() => {
  "use strict";
  const EBENEN = window.SYNTAXIS_EBENEN;
  if (!EBENEN) return;

  const ZMAX = 520, ZMIN = -60;
  const SCHLUESSEL = "syntaxis_fahrt";
  const BILD = "assets/img/stadt/stadt-turm-panorama.webp";
  const DAUER_MIN = 520, DAUER_MAX = 900;           // ms für die ganze Fahrt (beide Hälften), je nach Höhenunterschied
const MITGEHEN = 0.38;                              // wie weit der Seiteninhalt mit der Fahrt mitgleitet (Bruchteil der Fensterhöhe); 0 = nur ausblenden
  const html = document.documentElement;
  const NAVIGATION = ".hoehenmesser a, .hauptnav a, a.logo";
  const BEWEGT = "main#inhalt, .reihenzeiger, .fuss";    // das gleitet mit; Kopfzeile und Höhenmesser bleiben stehen

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const glatt = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;      // Anfahren, Rasen, Bremsen
  const pHoehe = (z) => (ZMAX - z) / (ZMAX - ZMIN);                                     // 0 = oben, 1 = unten
  const stamm = (url) => (new URL(url, location.href).pathname.split("/").pop() || "index").replace(/\.html$/, "");
  const ruhig = () => html.classList.contains("ruhige-bewegung") || matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !!(navigator.connection && navigator.connection.saveData);

  const aktuell = EBENEN.find((e) => e.slug === (document.body.dataset.seite || ""));
  const ebeneFuer = (url) => EBENEN.find((e) => stamm(e.href) === stamm(url));

  /* ---------- Fahrtgeräusch (nur wenn in „Lesen und Sehen“ eingeschaltet) ----------
     Gefiltertes Rauschen, dessen Helligkeit dem Tempo der Fahrt folgt (aufwärts heller werdend, abwärts dumpfer), dazu ein sehr leiser gleitender Ton;
     wie in der Mediathek, hier live erzeugt (Web Audio), keine Datei. Jede Hälfte der Fahrt klingt für sich: die Abfahrt schwillt an, die Ankunft klingt aus. */
  const tonAn = () => { try { return JSON.parse(localStorage.getItem("syntaxis_zugang_v1")).fahrtton === true; } catch (_) { return false; } };
  const LAUTSTAERKE = 0.4;                                                 // Spitze, wie in der Mediathek (−6 dBFS × 0,8)

  function klang(ctx, aus, t0, dauer, von, bis, aufwaerts, staerke, einS, ausS) {
    const n = Math.ceil(ctx.sampleRate * (dauer + 0.05));
    const puffer = ctx.createBuffer(1, n, ctx.sampleRate), daten = puffer.getChannelData(0);
    for (let i = 0; i < n; i++) daten[i] = Math.random() * 2 - 1;
    const rauschen = ctx.createBufferSource(); rauschen.buffer = puffer;
    const tp1 = ctx.createBiquadFilter(), tp2 = ctx.createBiquadFilter();   // zwei Tiefpässe hintereinander: der wandernde Eckpunkt macht den Windzug
    for (const f of [tp1, tp2]) { f.type = "lowpass"; f.Q.value = 4; }
    const mischer = ctx.createGain(), lauter = ctx.createGain(), tonPegel = ctx.createGain(), osc = ctx.createOscillator();
    mischer.gain.value = 0.85; tonPegel.gain.value = 0.18;
    const N = 48, fk = new Float32Array(N), ak = new Float32Array(N), ok = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const ph = von + (bis - von) * i / (N - 1), t = dauer * i / (N - 1);
      const g = Math.pow(Math.sin(Math.PI * ph), 1.4) * staerke;           // Geschwindigkeit, wie in der Bildfahrt
      const kante = Math.min(einS > 0 ? t / einS : 1, ausS > 0 ? (dauer - t) / ausS : 1, 1);
      fk[i] = aufwaerts ? 500 + 2100 * g : 2600 - 2100 * g;
      ok[i] = aufwaerts ? 80 + 140 * g : 230 - 140 * g;
      ak[i] = Math.pow(g, 1.1) * clamp(kante, 0, 1);
    }
    tp1.frequency.setValueCurveAtTime(fk, t0, dauer); tp2.frequency.setValueCurveAtTime(fk, t0, dauer);
    osc.frequency.setValueCurveAtTime(ok, t0, dauer);
    lauter.gain.setValueCurveAtTime(ak, t0, dauer);
    rauschen.connect(tp1); tp1.connect(tp2); tp2.connect(mischer); mischer.connect(lauter);
    osc.connect(tonPegel); tonPegel.connect(lauter); lauter.connect(aus);
    rauschen.start(t0); osc.start(t0); rauschen.stop(t0 + dauer + 0.05); osc.stop(t0 + dauer + 0.05);
  }

  async function ton(von, bis, ms, aufwaerts, dz) {
    if (!tonAn() || ruhig()) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      if (ctx.state !== "running") await ctx.resume();                      // ohne vorherige Bedienung der Seite bleibt er oft gesperrt: dann still, nicht später nachholen
      if (ctx.state !== "running") { ctx.close(); return; }
      const master = ctx.createGain(); master.gain.value = LAUTSTAERKE; master.connect(ctx.destination);
      klang(ctx, master, ctx.currentTime + 0.01, ms / 1000, von, bis, aufwaerts, Math.min(1, dz / 140), von === 0 ? 0.02 : 0.04, von === 0 ? 0.04 : 0.12);
      setTimeout(() => ctx.close().catch(() => {}), ms + 400);
    } catch (_) { /* kein Ton ist kein Fehler */ }
  }
  window.SYNTAXIS_FAHRT = { klang };                                        // für Tests (Klangprobe ohne Lautsprecher)

  let ov = null, bild, streifenBox, tunnel, kabine, fuell, strahl, zahl, stops = [], streifen = [], bewegt = [];
  let F = null, raf = 0, laeuft = false;

  function el(tag, klasse) { const x = document.createElement(tag); if (klasse) x.className = klasse; return x; }

  function aufbauen() {
    if (ov) return;
    ov = el("div", "fahrt"); ov.setAttribute("aria-hidden", "true");
    bild = new Image(); bild.className = "fahrt-stadt"; bild.alt = ""; bild.decoding = "async"; bild.src = BILD;
    streifenBox = el("div", "fahrt-streifen"); tunnel = el("div", "fahrt-tunnel");
    const ki = el("span", "fahrt-ki"); ki.textContent = "KI-generiert";
    for (let i = 0; i < 46; i++) {
      const s = el("i"); s.style.background = i % 4 === 0 ? "#cfeee9" : "#3FA8A0"; streifenBox.appendChild(s);
      streifen.push({ el: s, basis: (i * 337) % 1000 / 1000, laenge: 90 + (i * 211) % 360, tiefe: 0.5 + ((i * 97) % 100) / 100 * 1.6,
                      x: (i * 541) % 1000 / 1000, breite: 2 + (i % 3) });
    }
    ov.append(bild, el("div", "fahrt-schleier"), streifenBox, tunnel, ki);
    document.body.appendChild(ov);

    const skala = document.getElementById("hmSkala");                 // Kabine nur, wenn der Höhenmesser sichtbar ist (ab 1180 px)
    if (skala && skala.parentNode && getComputedStyle(skala.parentNode).display !== "none") {
      fuell = el("span", "hm-fuell"); strahl = el("span", "hm-strahl auf"); kabine = el("span", "hm-kabine"); zahl = el("span", "hm-zahl");
      skala.append(fuell, strahl, kabine, zahl);
      stops = [...skala.querySelectorAll(".hm-stop")].map((a) => ({ a, z: (ebeneFuer(a.href) || {}).z }));
    }
    bewegt = [...document.querySelectorAll(BEWEGT)];
    html.classList.add("fahrt-laeuft");
  }

  function abbauen() {
    cancelAnimationFrame(raf);
    if (ov) ov.remove();
    [fuell, strahl, kabine, zahl].forEach((x) => x && x.remove());
    stops.forEach((s) => s.a.style.removeProperty("--nah"));
    bewegt.forEach((x) => { x.style.transform = ""; x.style.opacity = ""; });
    ov = bild = streifenBox = tunnel = fuell = strahl = kabine = zahl = null; stops = []; streifen = []; bewegt = [];
    html.classList.remove("fahrt-laeuft", "fahrt-an");
    laeuft = false; F = null;
  }

  function werte(ph) {
    const p = clamp(ph, 0, 1);
    return {
      hoehe: F.z0 + (F.ziel - F.z0) * glatt(p),
      g: Math.pow(Math.sin(Math.PI * p), 1.4) * Math.min(1, Math.abs(F.ziel - F.z0) / 140),     // Geschwindigkeit 0…1
      richtung: F.ziel >= F.z0 ? 1 : -1
    };
  }

  function zeichne(ph) {
    const w = werte(ph), W = innerWidth, H = innerHeight, u = H / 1080;
    /* Abdeckung (dunkel, Stadtbild, Streifen): blendet erst ein, wenn der Inhalt schon unterwegs ist, ist in der Mitte (Seitenwechsel) ganz zu
       und blendet auf der neuen Seite wieder aus */
    const weich = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    ov.style.opacity = (ph < 0.5 ? weich((ph - 0.12) / 0.30) : weich((0.88 - ph) / 0.30)).toFixed(3);

    /* Seiteninhalt: gleitet in Richtung der Fahrt davon und blendet dabei aus; auf der neuen Seite kommt er von der Gegenseite herein
       (wie die Regale im Mediathek-Entwurf: aufwärts nach unten weg, abwärts nach oben weg) */
    let versatz = 0, deck = 1;
    if (ph < 0.5) { const a = clamp(ph / 0.42, 0, 1); versatz = w.richtung * a * a * a; deck = 1 - Math.pow(a, 1.4); }
    else { const b = clamp((ph - 0.55) / 0.40, 0, 1), c = 1 - Math.pow(1 - b, 4); versatz = -w.richtung * (1 - c); deck = c; }
    const px = versatz * MITGEHEN * H;
    for (const x of bewegt) { x.style.transform = `translate3d(0,${px.toFixed(1)}px,0)`; x.style.opacity = deck.toFixed(3); }

    const bildH = bild.offsetHeight, pg = clamp((w.hoehe - ZMIN) / (ZMAX - ZMIN), 0, 1);
    bild.style.transform = `translate3d(-50%,${-Math.max(0, bildH - H) * (1 - pg)}px,0)`;
    bild.style.opacity = bild.complete ? (0.62 + 0.18 * w.g).toFixed(3) : 0;

    const sichtbar = w.g > 0.01;
    streifenBox.style.visibility = sichtbar ? "visible" : "hidden";
    tunnel.style.opacity = sichtbar ? (w.g * 0.5).toFixed(3) : 0;
    if (sichtbar) {
      const span = H + 700 * u;
      for (const s of streifen) {
        const y = (((s.basis * span + w.hoehe * s.tiefe * 7.5 * u) % span) + span) % span - 350 * u;
        s.el.style.width = Math.max(1.5, s.breite * u) + "px";
        s.el.style.height = (s.laenge * u) + "px";
        s.el.style.opacity = Math.min(0.75, w.g * (0.25 + s.tiefe * 0.35)).toFixed(3);
        s.el.style.transform = `translate3d(${s.x * W}px,${y}px,0) scaleY(${(0.6 + w.g * 1.8).toFixed(3)})`;
      }
    }

    if (kabine) {                                                       // Höhenmesser: Kabine, Füllung, Strahl, Höhenzähler, vorbeirasende Halte
      const p = pHoehe(w.hoehe) * 100;
      kabine.style.top = p + "%";
      fuell.style.top = p + "%"; fuell.style.opacity = (0.28 + 0.25 * w.g).toFixed(3);
      if (w.g > 0.02) {
        strahl.style.display = "block"; strahl.className = "hm-strahl " + (w.richtung > 0 ? "auf" : "ab");
        strahl.style.height = (70 + 360 * w.g) + "px"; strahl.style.top = p + "%";
        strahl.style.transform = w.richtung > 0 ? "translateY(-6px)" : "translateY(calc(-100% + 6px))";
        strahl.style.opacity = Math.min(1, w.g * 1.3).toFixed(3);
        zahl.style.top = p + "%"; zahl.style.opacity = Math.min(1, w.g * 3).toFixed(3);
        zahl.textContent = (w.richtung > 0 ? "▲ " : "▼ ") + Math.round(w.hoehe) + " m";
      } else { strahl.style.display = "none"; zahl.style.opacity = 0; }
      for (const s of stops) s.a.style.setProperty("--nah", (sichtbar ? Math.max(0, 1 - Math.abs(s.z - w.hoehe) / 45) : 0).toFixed(3));
    }
  }

  /* Hälfte einer Fahrt abspielen: von `von` bis `bis` (Phase), in `ms` */
  function spielen(von, bis, ms, fertig) {
    const t0 = performance.now();
    const tick = (t) => {
      const k = clamp((t - t0) / ms, 0, 1);
      zeichne(von + (bis - von) * k);
      if (k < 1) raf = requestAnimationFrame(tick); else fertig();
    };
    raf = requestAnimationFrame(tick);
  }

  function abfahrt(z0, ziel, href) {
    F = { z0, ziel }; laeuft = true;
    aufbauen();
    const dauer = clamp(380 + Math.abs(ziel - z0) * 1.4, DAUER_MIN, DAUER_MAX);
    ton(0, 0.5, dauer / 2, ziel > z0, Math.abs(ziel - z0));
    spielen(0, 0.5, dauer / 2, () => {
      try { sessionStorage.setItem(SCHLUESSEL, JSON.stringify({ z0, ziel, dauer, t: Date.now(), datei: stamm(href) })); } catch (_) {}
      location.assign(href);
      setTimeout(() => { try { sessionStorage.removeItem(SCHLUESSEL); } catch (_) {} abbauen(); }, 4000);   // falls die Seite nicht wechselt
    });
  }

  function ankunft() {
    let f = null;
    try { f = JSON.parse(sessionStorage.getItem(SCHLUESSEL) || "null"); sessionStorage.removeItem(SCHLUESSEL); } catch (_) {}
    if (!f || Date.now() - f.t > 6000 || f.datei !== stamm(location.href) || ruhig()) { html.classList.remove("fahrt-an"); return; }
    F = { z0: f.z0, ziel: f.ziel }; laeuft = true;
    aufbauen(); zeichne(0.5);
    html.classList.remove("fahrt-an");                                  // die Fahrt deckt jetzt selbst ab, kein Aufblitzen
    ton(0.5, 1, f.dauer / 2, f.ziel > f.z0, Math.abs(f.ziel - f.z0));
    spielen(0.5, 1, f.dauer / 2, abbauen);
  }

  /* ---------- Menüwahl abfangen ---------- */
  document.addEventListener("click", (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = ev.target.closest && ev.target.closest(NAVIGATION);
    if (!a || !a.href || a.target || a.hasAttribute("download") || laeuft || !aktuell) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const ziel = ebeneFuer(url.href);
    if (!ziel || ziel === aktuell || Math.abs(ziel.z - aktuell.z) < 1 || ruhig()) return;     // gleiche Höhe oder keine Ebene: normaler Seitenwechsel
    ev.preventDefault();
    abfahrt(aktuell.z, ziel.z, url.href);
  });

  /* Bild und Zielseite vorladen, sobald jemand das Menü anfasst (spart allen anderen den Abruf) */
  let vorgeladen = false;
  const vorladen = (ev) => {
    const a = ev.target.closest && ev.target.closest(NAVIGATION);
    if (!a || ruhig()) return;
    if (!vorgeladen) { vorgeladen = true; new Image().src = BILD; }
    if (a.dataset.vorgeladen || a.origin !== location.origin) return;
    a.dataset.vorgeladen = "1";
    const l = el("link"); l.rel = "prefetch"; l.href = a.href; document.head.appendChild(l);
  };
  document.addEventListener("pointerover", vorladen, { passive: true });
  document.addEventListener("focusin", vorladen);

  /* Zurück-Taste: die Seite kommt unverändert aus dem Zwischenspeicher, dann darf keine halbe Fahrt darauf stehen */
  addEventListener("pageshow", (ev) => {
    if (ev.persisted) { try { sessionStorage.removeItem(SCHLUESSEL); } catch (_) {} abbauen(); }
  });

  ankunft();
})();
