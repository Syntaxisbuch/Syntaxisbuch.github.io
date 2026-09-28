/* SYNTAXIS — Kartographischer Atlas */
(async () => {
  "use strict";

  const karte = document.getElementById("atlasKarte");
  if (!karte) return;

  let D;
  try { D = await (await fetch("data/stadt.json")).json(); }
  catch (e) {
    document.getElementById("atlasInfo").innerHTML =
      '<p class="leise">Die Sektordaten konnten nicht geladen werden. Falls du die Seite lokal geöffnet hast: Browser laden JSON nur über einen Webserver. Starte im Ordner <span class="kennung">python3 -m http.server</span> und öffne dann <span class="kennung">localhost:8000</span>.</p>';
    return;
  }

  /* Bildarchiv: optional, der Atlas funktioniert auch ohne */
  let B = null;
  try { B = await (await fetch("data/bildband.json")).json(); } catch (e) { /* ohne Bilder weiter */ }
  const alleBilder = B ? B.akten.flatMap(a => a.bilder.map(b => ({ ...b, akte: a.id }))) : [];
  const bilderVon = f => alleBilder.filter(f);
  const bildLink = b => `bildband.html#${encodeURIComponent(b.id)}`;
  const ROEM = ["", "I", "II", "III", "IV", "V"];

  const info = document.getElementById("atlasInfo");
  const filterreihe = document.getElementById("terrassenFilter");
  const nachId = Object.fromEntries(D.sektoren.map(s => [s.id, s]));
  const zahl = n => n.toLocaleString("de-DE", { maximumFractionDigits: 3 });

  let aktiveTerrasse = "oberste";
  let aktiverSektor = null;

  /* ---------- Filterknöpfe je Terrasse ---------- */
  D.terrassen.forEach(t => {
    const n = D.sektoren.filter(s => s.terrasse === t.id).length;
    if (!n) return;
    const b = document.createElement("button");
    b.className = "filter";
    b.type = "button";
    b.textContent = `${t.name} · ${t.z} m`;
    b.setAttribute("aria-pressed", String(t.id === aktiveTerrasse));
    b.addEventListener("click", () => { aktiveTerrasse = t.id; aktiverSektor = null; zeichne(); });
    filterreihe.appendChild(b);
  });

  /* ---------- Grundriss zeichnen ---------- */
  function zeichne() {
    [...filterreihe.children].forEach((b, i) => {
      const t = D.terrassen.filter(t => D.sektoren.some(s => s.terrasse === t.id))[i];
      b.setAttribute("aria-pressed", String(t.id === aktiveTerrasse));
    });

    const t = D.terrassen.find(x => x.id === aktiveTerrasse);
    const sek = D.sektoren.filter(s => s.terrasse === aktiveTerrasse);

    const W = 700, H = 500, pad = 58;
    const xs = sek.map(s => s.x).concat(0), ys = sek.map(s => s.y).concat(0);
    let minX = Math.min(...xs) - 1.2, maxX = Math.max(...xs) + 1.6;
    let minY = Math.min(...ys) - 1.2, maxY = Math.max(...ys) + 1.2;
    if (maxX - minX < 4) { const c = (maxX + minX) / 2; minX = c - 2; maxX = c + 2; }
    if (maxY - minY < 3) { const c = (maxY + minY) / 2; minY = c - 1.5; maxY = c + 1.5; }

    const sx = (W - pad * 2) / (maxX - minX);
    const sy = (H - pad * 2 - 40) / (maxY - minY);
    const s = Math.min(sx, sy);
    const px = x => pad + (x - minX) * s + ((W - pad * 2) - (maxX - minX) * s) / 2;
    const py = y => H - pad - (y - minY) * s - ((H - pad * 2 - 40) - (maxY - minY) * s) / 2;

    let g = `<g class="gitter">`;
    for (let k = Math.ceil(minX); k <= Math.floor(maxX); k++) {
      g += `<line x1="${px(k)}" y1="${pad - 10}" x2="${px(k)}" y2="${H - pad + 6}"/>`;
      g += `<text x="${px(k)}" y="${H - pad + 18}" text-anchor="middle">${k}</text>`;
    }
    for (let k = Math.ceil(minY); k <= Math.floor(maxY); k++) {
      g += `<line x1="${pad - 12}" y1="${py(k)}" x2="${W - pad + 10}" y2="${py(k)}"/>`;
      g += `<text x="${pad - 18}" y="${py(k) + 3}" text-anchor="end">${k}</text>`;
    }
    g += `<text x="${W - pad + 10}" y="${H - pad + 18}" text-anchor="end">X in km</text>`;
    g += `<text x="${pad - 18}" y="${pad + 8}" text-anchor="end">Y in km</text></g>`;

    /* Lokaler Nullpunkt */
    g += `<g><circle cx="${px(0)}" cy="${py(0)}" r="12" fill="none" stroke="var(--line-hard)" stroke-dasharray="2 3"/>
          <line x1="${px(0) - 16}" y1="${py(0)}" x2="${px(0) + 16}" y2="${py(0)}" stroke="var(--line-hard)"/>
          <line x1="${px(0)}" y1="${py(0) - 16}" x2="${px(0)}" y2="${py(0) + 16}" stroke="var(--line-hard)"/></g>`;

    const knoten = sek.map(o => {
      const cx = px(o.x), cy = py(o.y);
      const rechts = cx < W * 0.62;
      return `<g class="sektor" role="button" tabindex="0" data-id="${o.id}" aria-selected="${o.id === aktiverSektor}" aria-label="${o.name}">
        <circle cx="${cx}" cy="${cy}" r="${o.id === "T-00" || o.x === 0 && o.y === 0 ? 8 : 6}"/>
        <text x="${rechts ? cx + 12 : cx - 12}" y="${cy + 3.5}" text-anchor="${rechts ? "start" : "end"}">${o.name}</text>
      </g>`;
    }).join("");

    karte.innerHTML = `
      <text x="${pad - 18}" y="30" style="font-family:var(--data);font-size:10px;fill:var(--fog)">${t.name.toUpperCase()}</text>
      <text x="${W - pad + 10}" y="30" text-anchor="end" style="font-family:var(--data);font-size:10px;fill:var(--fog-dim)">Z ${t.z} m · ${t.hirn}</text>
      <text x="${W - pad + 10}" y="46" text-anchor="end" style="font-family:var(--body);font-size:11px;fill:var(--fog-dim)">Lokaler Nullpunkt: ${t.nullpunkt}</text>
      ${g}${knoten}`;

    karte.querySelectorAll(".sektor").forEach(el => {
      const w = () => waehle(el.dataset.id);
      el.addEventListener("click", w);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); w(); } });
    });

    if (aktiverSektor) waehle(aktiverSektor, false);
    else info.innerHTML = `<p class="leise" style="margin:0 0 .8rem">${t.funktion}.</p><p class="leise" style="margin:0">Wähle einen Sektor auf der Karte.</p>`;
  }

  /* ---------- Sektordetails ---------- */
  function waehle(id, neuZeichnen = true) {
    aktiverSektor = id;
    const o = nachId[id];
    if (!o) return;
    if (neuZeichnen) karte.querySelectorAll(".sektor").forEach(el =>
      el.setAttribute("aria-selected", String(el.dataset.id === id)));

    const baende = (o.band || []).map(b => `<a href="chroniken.html#nc-${(ROEM[b] || b).toString().toLowerCase()}">Band ${ROEM[b] || b}</a>`).join(", ");
    const bilder = bilderVon(x => x.sektor === o.id);
    const aufnahmen = bilder.length ? `<div class="aufnahmen">
        <span class="kennung">${bilder.length === 1 ? "AUFNAHME" : bilder.length + " AUFNAHMEN"} IM BILDARCHIV</span>
        <div class="reihe">${bilder.map(b => `<a href="${bildLink(b)}" title="${b.titel}${b.lage ? " · " + b.lage : ""}">
            <img src="${b.bild}" alt="${b.titel}" loading="lazy" decoding="async"></a>`).join("")}</div>
      </div>` : "";
    info.innerHTML = `
      <h3>${o.name}</h3>
      <p class="meta">${o.id}${o.sektor ? " · Sektor " + o.sektor : ""}</p>
      <dl>
        <dt>X</dt><dd>${zahl(o.x)} km</dd>
        <dt>Y</dt><dd>${zahl(o.y)} km</dd>
        <dt>Z</dt><dd>${zahl(o.z)} m</dd>
        <dt>REAL</dt><dd>${o.hirn}</dd>
        ${baende ? `<dt>BAND</dt><dd>${baende}</dd>` : ""}
      </dl>
      <p class="notiz">${o.notiz}</p>
      ${o.flagge ? `<p class="flagge-hinweis">Anmerkung zur Quelle: ${o.flagge}</p>` : ""}
      ${aufnahmen}`;
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }

  /* ---------- Wegbeschreibung ---------- */
  const von = document.getElementById("vonSektor"), nach = document.getElementById("nachSektor");
  const erg = document.getElementById("rechnerErgebnis");
  const sortiert = [...D.sektoren].sort((a, b) => b.z - a.z || a.name.localeCompare(b.name, "de"));
  const optionen = sortiert.map(s => `<option value="${s.id}">${s.name} — ${s.id}</option>`).join("");
  von.innerHTML = optionen; nach.innerHTML = optionen;
  von.value = "AK-01"; nach.value = "SDE-01";

  const RE = D.reise;
  let betrieb = "tag";

  /* Marken auf der Senkrechten: Turmetagen und Terrassenkanten, nach Höhe geordnet */
  const marken = [
    ...D.turm.map(e => ({ z: e.z, art: "Etage", name: e.name, zusatz: "Etage " + e.etage })),
    ...D.terrassen.filter(t => t.id !== "grenzlage")
      .map(t => ({ z: t.z, art: "Ebene", name: t.name, zusatz: t.hirn }))
  ];

  function dazwischen(z1, z2) {
    const u = Math.min(z1, z2), o = Math.max(z1, z2);
    const l = marken.filter(m => m.z > u && m.z < o);
    l.sort((a, b) => z2 < z1 ? b.z - a.z : a.z - b.z);
    /* Doppelmarken auf gleicher Höhe zusammenfassen */
    const raus = [];
    l.forEach(m => {
      const vorh = raus.find(x => x.z === m.z);
      if (vorh) vorh.name += " · " + m.name; else raus.push({ ...m });
    });
    return raus;
  }

  function band(aufwand) {
    const b = [...RE.baender].reverse().find(x => aufwand >= x.ab) || RE.baender[0];
    return b;
  }

  function beschreibe() {
    const a = nachId[von.value], b = nachId[nach.value];
    if (!a || !b) return;
    if (a.id === b.id) {
      erg.innerHTML = '<p class="leise" style="margin:0">Start und Ziel sind derselbe Ort.</p>';
      return;
    }

    const halte = [];
    const kostenliste = [];
    let aufwand = 0, umstiege = 0;
    const gleicheEbene = a.terrasse === b.terrasse;
    const dz = b.z - a.z;
    const runter = dz < 0;
    const direkt = (RE.direktwege || []).find(w => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id));

    const merkeKosten = o => { if (o.kosten) kostenliste.push({ ort: o.name, text: o.kosten }); };

    halte.push({ typ: "start", name: a.name, unter: a.hirn, zusatz: `${a.id} · Z ${zahl(a.z)} m` });
    merkeKosten(a);

    if (direkt) {
      aufwand += direkt.aufwand;   /* der Wert des Weges steht in den Daten */
      umstiege += direkt.umstiege;
      halte.push({ typ: "umstieg", name: "Einstieg in den " + direkt.name, unter: direkt.text, zusatz: "eigener Schacht, nicht der Turm" });
      dazwischen(a.z, b.z).filter(m => m.art === "Ebene")
        .forEach(m => halte.push({ typ: "vorbei", name: m.name, unter: m.zusatz, zusatz: `Z ${m.z} m` }));
      halte.push({ typ: "umstieg", name: "Ausstieg", unter: "", zusatz: `Z ${zahl(b.z)} m` });
    } else if (gleicheEbene) {
      const km = Math.hypot(b.x - a.x, b.y - a.y);
      aufwand += km;
      const t = D.terrassen.find(x => x.id === a.terrasse);
      if (km > 0) halte.push({
        typ: "weg",
        name: km < 0.5 ? "Zu Fuß quer über die Ebene" : "Mit dem Pontiac über die Ebene",
        unter: t ? t.hirn : "",
        zusatz: `${zahl(km)} km durch ${t ? t.name : "die Ebene"}`
      });
      if (dz !== 0) {
        aufwand += Math.abs(dz) / 100;
        halte.push({ typ: "achse", name: (runter ? "Abstieg" : "Aufstieg") + " um " + zahl(Math.abs(dz)) + " m", unter: "", zusatz: "" });
      }
    } else {
      const tA = D.terrassen.find(x => x.id === a.terrasse);
      const tB = D.terrassen.find(x => x.id === b.terrasse);
      const kmA = Math.hypot(a.x, a.y), kmB = Math.hypot(b.x, b.y);

      if (kmA > 0) {
        aufwand += kmA;
        halte.push({
          typ: "weg",
          name: kmA < 0.5 ? "Zu Fuß zur Turmachse" : "Mit dem Pontiac zur Turmachse",
          unter: tA ? tA.hirn : "",
          zusatz: `${zahl(kmA)} km bis ${tA ? tA.nullpunkt : "zur Achse"}`
        });
      }

      umstiege++;
      halte.push({ typ: "umstieg", name: "Einstieg in den Tower of Reason", unter: "Die Achse läuft durchgehend — kein Warten, die Schächte fahren alle zugleich.", zusatz: "" });

      const unterNull = Math.min(a.z, b.z) < 0;
      const wende = unterNull ? 0 : b.z;
      dazwischen(a.z, wende).forEach(m => halte.push({ typ: "vorbei", name: m.name, unter: m.zusatz, zusatz: `Z ${m.z} m` }));

      if (unterNull) {
        umstiege++;
        const mh = nachId["MH-01"];
        halte.push({ typ: "umstieg", name: "Umstieg auf den Hebel-Aufzug", unter: RE.umstieg.text, zusatz: mh ? "an der " + mh.name + " · Z 0 m" : "Z 0 m" });
        halte.push({ typ: "vorbei", name: "Unter das Stadt-Basisdatum", unter: "Der archaische Schacht. Zwei bis drei Meter je Sekunde, und man hört jeden davon.", zusatz: `${zahl(Math.abs(Math.min(a.z, b.z)))} m` });
      }

      aufwand += Math.abs(dz) / 100;

      umstiege++;
      halte.push({ typ: "umstieg", name: "Ausstieg", unter: "", zusatz: (tB ? tB.name : "") + " · Z " + zahl(b.z) + " m" });

      if (kmB > 0) {
        aufwand += kmB;
        halte.push({
          typ: "weg",
          name: kmB < 0.5 || b.z < 0 ? "Zu Fuß ans Ziel" : "Mit dem Pontiac ans Ziel",
          unter: tB && tB.id !== "sub-unterste" ? tB.hirn : "",
          zusatz: `${zahl(kmB)} km ab ${tB ? tB.nullpunkt : "der Achse"}`
        });
      }
    }

    halte.push({ typ: "ziel", name: b.name, unter: b.hirn, zusatz: `${b.id} · Z ${zahl(b.z)} m` });
    merkeKosten(b);

    aufwand = (aufwand + umstiege * RE.umstieg.gewicht) * RE.betrieb[betrieb].faktor;
    const bd = band(aufwand);
    const rg = dz === 0 ? RE.richtungsgesetz.quer : (runter ? RE.richtungsgesetz.ab : RE.richtungsgesetz.auf);

    const zeilen = halte.map(h => `
      <li class="halt" data-typ="${h.typ}">
        <span class="pkt"></span>
        <span class="txt">
          <span class="nm">${h.name}</span>
          ${h.unter ? `<span class="un">${h.unter}</span>` : ""}
        </span>
        ${h.zusatz ? `<span class="zs">${h.zusatz}</span>` : ""}
      </li>`).join("");

    const kosten = `<div class="kostenblock">
        <span class="kennung">KÖRPERLICHE KOSTEN</span>
        ${kostenliste.length
          ? kostenliste.map(k => `<p><strong>${k.ort}.</strong> ${k.text}</p>`).join("")
          : `<p class="offen">Für Start und Ziel ist im Kanon noch kein körperlicher Preis festgelegt. Bezahlt wird auf diesem Weg nur mit der Richtung: ${dz === 0 ? "gar nicht" : (runter ? "Trieb" : "Kontrolle")}.</p>`}
      </div>`;

    erg.innerHTML = `
      <div class="wegkopf">
        <div>
          <span class="kennung">DAUER</span>
          <p class="dauer">${bd.text}</p>
          <p class="dauer-zusatz">${bd.zusatz}</p>
        </div>
        <div>
          <span class="kennung">RICHTUNGSGESETZ</span>
          <p class="richtung">${rg}</p>
        </div>
      </div>
      <ol class="route">${zeilen}</ol>
      ${kosten}
      <p class="kennung" style="margin:1rem 0 0">${umstiege} Umstieg${umstiege === 1 ? "" : "e"} · ${RE.betrieb[betrieb].name} · ${RE.betrieb[betrieb].text}</p>`;
  }

  von.addEventListener("change", beschreibe);
  nach.addEventListener("change", beschreibe);
  document.getElementById("betriebSchalter")?.addEventListener("click", e => {
    const k = e.target.closest("[data-betrieb]");
    if (!k) return;
    betrieb = k.dataset.betrieb;
    [...e.currentTarget.children].forEach(c => c.setAttribute("aria-pressed", String(c.dataset.betrieb === betrieb)));
    beschreibe();
  });

  /* ---------- Tabellen ---------- */
  document.querySelector("#turmTabelle tbody").innerHTML =
    D.turm.map(e => `<tr><td class="zahl">${e.etage}</td><td>${e.name}</td><td class="zahl">${e.z} m</td></tr>`).join("");
  document.querySelector("#brueckenTabelle tbody").innerHTML =
    D.bruecken.map(b => {
      const a = nachId[b.von];
      const z = nachId[b.nach];
      const bild = bilderVon(x => x.bruecke === b.name)[0];
      const marke = [
        b.unbenannt ? '<small class="leise" title="Im Kanon noch ohne eigenen Namen"> · Arbeitstitel</small>' : "",
        bild ? ` <a class="bildlink" href="${bildLink(bild)}" title="Aufnahme im Bildarchiv: ${bild.titel}">Bild</a>` : ""
      ].join("");
      return `<tr><td>${b.name}${marke}</td><td>${a ? a.name : b.von} ↔ ${z ? z.name : b.nach}</td><td class="leise">${b.real}</td></tr>`;
    }).join("");

  const ohne = document.getElementById("ohneKoordinate");
  if (ohne) ohne.innerHTML = (D.ohne_koordinate || []).map(o => {
    const bild = bilderVon(x => x.ort === o.name)[0];
    return `<li><strong>${o.name}</strong>${o.alt ? ` <span class="leise">(${o.alt})</span>` : ""}${bild
      ? ` <a class="bildlink" href="${bildLink(bild)}" title="${bild.titel}">Bild im Bildarchiv</a>` : ""}</li>`;
  }).join("");

  /* ---------- Start ---------- */
  const ziel = decodeURIComponent(location.hash.slice(1));
  if (nachId[ziel]) { aktiveTerrasse = nachId[ziel].terrasse; aktiverSektor = ziel; }
  zeichne();
  beschreibe();

  /* Sprung von der Suche oder einem Link, während die Seite schon offen ist */
  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (nachId[id] && id !== aktiverSektor) { aktiveTerrasse = nachId[id].terrasse; aktiverSektor = id; zeichne(); }
  });
})();
