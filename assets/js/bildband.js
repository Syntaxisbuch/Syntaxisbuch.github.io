/* SYNTAXIS — Bildarchiv: Aktenschrank, Pinnwand, Leuchtkasten, verknüpft mit Atlas, Chroniken und Autopsien */
(async () => {
  "use strict";
  const wand = document.getElementById("pinnwand");
  if (!wand) return;
  let D, S = null;
  try { D = await (await fetch("data/bildband.json")).json(); }
  catch (e) { wand.innerHTML = '<p class="leise" style="padding:2rem">Akten konnten nicht geladen werden.</p>'; return; }
  try { S = await (await fetch("data/stadt.json")).json(); } catch (e) { /* Links ohne Sektornamen */ }
  const sektorName = id => S?.sektoren.find(s => s.id === id)?.name;
  const sektorDa = id => !S || S.sektoren.some(s => s.id === id);   // ohne Stadtdaten nicht vorschnell verwerfen

  const schrank = document.getElementById("schrank");
  const kopf = document.getElementById("aktenKopf");
  let offen = D.akten[0].id;

  schrank.innerHTML = D.akten.map(a => `
    <button class="lade" role="tab" data-akte="${a.id}" aria-selected="${a.id === offen}">
      <span class="sig">${a.signatur}</span>
      <span class="tt">${a.titel}</span>
      <span class="st">${a.status}</span>
    </button>`).join("");

  function zeichne() {
    const a = D.akten.find(x => x.id === offen);
    [...schrank.children].forEach(b => b.setAttribute("aria-selected", String(b.dataset.akte === offen)));

    kopf.innerHTML = `<span class="kennung">${a.signatur} · ${a.status}</span>
      <h3>${a.titel}</h3><p class="unter">${a.untertitel}</p><p class="notiz">${a.notiz}</p>`;

    if (!a.bilder.length) {
      wand.innerHTML = '<p class="leer">Diese Akte ist noch leer.</p>';
      return;
    }

    const faeden = a.faeden.map(([v, n]) => {
      const A = a.bilder.find(b => b.id === v), B = a.bilder.find(b => b.id === n);
      if (!A || !B) return "";
      return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" vector-effect="non-scaling-stroke"/>`;
    }).join("");

    wand.innerHTML = `
      <svg class="faeden" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${faeden}</svg>
      ${a.bilder.map((b, i) => `
        <figure class="beleg" style="left:${b.x}%;top:${b.y}%;--dreh:${b.dreh}deg;--verzug:${i * 40}ms"
                tabindex="0" role="button" data-id="${b.id}" data-ebene="${b.ebene || ""}" aria-label="${b.titel} vergrößern">
          <span class="nadel"></span>
          ${b.ebene && b.ebene !== "COVER" ? `<span class="ebene">${b.ebene}</span>` : ""}
          <img src="${b.bild}" alt="${b.titel}" loading="lazy" decoding="async">
          <figcaption>${b.titel}<small>${b.unterschrift}</small></figcaption>
        </figure>`).join("")}`;

    wand.querySelectorAll(".beleg").forEach(el => {
      const auf = () => zeige(a.bilder.find(x => x.id === el.dataset.id));
      el.addEventListener("click", auf);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); auf(); } });
    });
  }

  /* Leuchtkasten: Knöpfe entstehen nur für Ziele, die es wirklich gibt */
  const lk = document.getElementById("leuchtkasten");
  const lkBild = document.getElementById("lkBild"), lkTitel = document.getElementById("lkTitel");
  const lkText = document.getElementById("lkText"), lkLinks = document.getElementById("lkLinks");
  const ROEM = { I: "i", II: "ii", III: "iii", IV: "iv", V: "v" };

  function ziele(b) {
    const z = [];
    if (b.sektor && sektorDa(b.sektor)) {
      const n = sektorName(b.sektor);
      z.push([`Im Atlas${n ? ": " + n : ""}${b.lage ? " (" + b.lage + ")" : ""}`, `atlas.html#${b.sektor}`]);
    }
    if (b.ort) z.push([`Im Atlas: ${b.ort}`, "atlas.html#ohne-koordinate"]);
    if (b.bruecke) z.push([typeof b.bruecke === "string" ? `Im Atlas: ${b.bruecke}` : "Sky Bridges im Atlas", "atlas.html#bruecken"]);
    if (b.band && ROEM[b.band]) z.push([`Zu Band ${b.band}`, `chroniken.html#nc-${ROEM[b.band]}`]);
    if (b.ziel) z.push([b.ziel.startsWith("autopsien.html") ? "Zur Autopsie" : "Weiterlesen", b.ziel]);
    return z;
  }

  function zeige(b, hash = true) {
    if (!b) return;
    lkBild.src = b.gross || b.bild; lkBild.alt = b.titel;
    lkTitel.textContent = b.titel;
    lkText.innerHTML = [
      b.unterschrift ? `<span class="zeile">${b.unterschrift}</span>` : "",
      b.notiz ? `<span class="zeile">${b.notiz}</span>` : "",
      b.realbezug ? `<span class="zeile realbezug">${b.realbezug}</span>` : ""
    ].join("");
    lkLinks.innerHTML = ziele(b).map(([text, href], i) => `<a class="knopf${i ? " still" : ""}" href="${href}">${text}</a>`).join("");
    lk.classList.add("offen");
    document.getElementById("lkZu").focus();
    if (hash && history.replaceState) history.replaceState(null, "", "#" + encodeURIComponent(b.id));
  }
  function zu() {
    lk.classList.remove("offen");
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }
  document.getElementById("lkZu").addEventListener("click", zu);
  lk.addEventListener("click", e => { if (e.target === lk) zu(); });
  addEventListener("keydown", e => { if (e.key === "Escape") zu(); });

  schrank.addEventListener("click", e => {
    const b = e.target.closest("[data-akte]");
    if (!b) return;
    offen = b.dataset.akte; zeichne();
  });

  /* Sprung von außen: bildband.html#<Bild-ID> öffnet die passende Akte und das Bild */
  function ausHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const akte = D.akten.find(a => a.bilder.some(b => b.id === id));
    if (!akte) return;
    offen = akte.id; zeichne();
    zeige(akte.bilder.find(b => b.id === id), false);
  }
  zeichne();
  ausHash();
  addEventListener("hashchange", ausHash);
})();
