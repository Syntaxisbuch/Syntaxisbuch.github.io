/* SYNTAXIS — Gegenfragen-Kartei */
(async () => {
  "use strict";

  const liste = document.getElementById("gfListe");
  if (!liste) return;

  let G, W;
  try {
    [G, W] = await Promise.all([
      fetch("data/gegenfragen.json").then(r => r.json()),
      fetch("data/werke.json").then(r => r.json())
    ]);
  } catch (e) {
    liste.innerHTML = '<p class="leise">Die Kartei konnte nicht geladen werden. Beim lokalen Öffnen einen kleinen Webserver starten, etwa mit <span class="kennung">python3 -m http.server</span>.</p>';
    return;
  }

  const au = W.reihen.find(r => r.id === "au");
  const fallName = n => (au.faelle.find(f => f.nr === n) || {}).titel || ("Autopsie #" + n);

  const suche = document.getElementById("gfSuche");
  const filter = document.getElementById("gfFilter");
  const zaehler = document.getElementById("gfZaehler");
  let aktivAu = 0;

  filter.innerHTML = `<button class="filter" type="button" data-au="0" aria-pressed="true">Alle Fälle</button>` +
    au.faelle.map(f => `<button class="filter" type="button" data-au="${f.nr}" aria-pressed="false">#${String(f.nr).padStart(2, "0")} ${f.titel}</button>`).join("");

  const norm = s => (s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[„“”"‚‘’']/g, "");

  function hervor(text, q) {
    if (!q) return text;
    const worte = q.split(/\s+/).filter(w => w.length > 2);
    let out = text;
    worte.forEach(w => {
      const nt = norm(out), nw = norm(w);
      let i = 0, res = "", rest = out, offen = 0;
      // einfache, akzenttolerante Markierung über normalisierte Indizes
      const idx = nt.indexOf(nw);
      if (idx >= 0) out = out.slice(0, idx) + "<mark>" + out.slice(idx, idx + w.length) + "</mark>" + out.slice(idx + w.length);
    });
    return out;
  }

  function zeichne() {
    const q = suche.value.trim();
    const nq = norm(q);
    const worte = nq.split(/\s+/).filter(Boolean);

    const treffer = G.filter(g => {
      if (aktivAu && g.au !== aktivAu) return false;
      if (!worte.length) return true;
      const heu = norm(g.behauptung + " " + g.falle + " " + g.gegenfrage + " " + g.quelle);
      return worte.every(w => heu.includes(w));
    });

    zaehler.textContent = treffer.length === G.length
      ? `${G.length} Karten aus zehn Autopsien`
      : `${treffer.length} von ${G.length} Karten`;

    liste.innerHTML = treffer.length ? treffer.map(g => `
      <article class="gf" id="${g.id}">
        <p class="behauptung">${hervor(g.behauptung, q)}</p>
        <p class="falle">${hervor(g.falle, q)}</p>
        <p class="gegenfrage">${hervor(g.gegenfrage, q)}</p>
        <p class="herkunft">${g.id} · Autopsie #${String(g.au).padStart(2, "0")} — ${fallName(g.au)}</p>
      </article>`).join("")
      : `<p class="leise" style="padding:2rem 0">Kein Treffer. Versuch ein einzelnes Stichwort — die Kartei sucht in Behauptung, Falle und Gegenfrage.</p>`;

    [...filter.children].forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.au) === aktivAu)));
  }

  suche.addEventListener("input", zeichne);
  filter.addEventListener("click", e => {
    const b = e.target.closest("[data-au]");
    if (!b) return;
    aktivAu = Number(b.dataset.au);
    zeichne();
  });

  zeichne();

  const ziel = location.hash.slice(1);
  if (ziel) document.getElementById(ziel)?.scrollIntoView({ block: "center" });
})();
