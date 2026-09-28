/* SYNTAXIS — Glossar */
(async () => {
  "use strict";
  const liste = document.getElementById("glListe");
  if (!liste) return;
  let D;
  try { D = await (await fetch("data/glossar.json")).json(); }
  catch (e) { liste.innerHTML = '<p class="leise">Das Glossar konnte nicht geladen werden.</p>'; return; }

  const suche = document.getElementById("glSuche");
  const filter = document.getElementById("glFilter");
  const zaehler = document.getElementById("glZaehler");
  let aktiv = "alle";
  const gesamt = D.gruppen.reduce((n, g) => n + g.eintraege.length, 0);

  filter.innerHTML = `<button class="filter" type="button" data-g="alle" aria-pressed="true">Alle</button>` +
    D.gruppen.map(g => `<button class="filter" type="button" data-g="${g.id}" aria-pressed="false">${g.name}</button>`).join("");

  const norm = s => (s || "").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .replace(/[„“”"‚‘’']/g, "");

  function zeichne() {
    const q = norm(suche.value.trim());
    const worte = q.split(/\s+/).filter(Boolean);
    let n = 0;
    liste.innerHTML = D.gruppen.filter(g => aktiv === "alle" || g.id === aktiv).map(g => {
      const treffer = g.eintraege.filter(e => !worte.length ||
        worte.every(w => norm(e.begriff + " " + e.kurz + " " + e.text + " " + (e.beispiel || "")).includes(w)));
      n += treffer.length;
      if (!treffer.length) return "";
      return `<section class="glgruppe">
        <h3 class="glgruppe-kopf">${g.name}<span class="kennung">${treffer.length}</span></h3>
        <dl class="glossar">${treffer.map(e => `
          <div class="gleintrag" id="gl-${norm(e.begriff).replace(/[^a-z0-9]+/g, "-")}">
            <dt>${e.begriff}<span class="kurz">${e.kurz}</span></dt>
            <dd>${e.text}${e.beispiel ? `<span class="beispiel">${e.beispiel}</span>` : ""}</dd>
          </div>`).join("")}</dl>
      </section>`;
    }).join("") || '<p class="leise" style="padding:2rem 0">Kein Treffer.</p>';

    zaehler.textContent = n === gesamt ? `${gesamt} Begriffe in ${D.gruppen.length} Gruppen` : `${n} von ${gesamt} Begriffen`;
    [...filter.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === aktiv)));
  }

  suche.addEventListener("input", zeichne);
  filter.addEventListener("click", e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    aktiv = b.dataset.g; zeichne();
  });
  zeichne();
  const ziel = location.hash.slice(1);
  if (ziel) document.getElementById(ziel)?.scrollIntoView({ block: "center" });
})();
