/* SYNTAXIS — Frequenz 404: wöchentliche Sendung + Archiv */
(async () => {
  "use strict";
  const spieler = document.getElementById("f404Player");
  if (!spieler) return;

  let D, W;
  try {
    [D, W] = await Promise.all([
      fetch("data/frequenz404.json").then(r => r.json()),
      fetch("data/werke.json").then(r => r.json())
    ]);
  } catch (e) {
    spieler.innerHTML = '<p class="leise">Die Sendung konnte nicht geladen werden. Beim lokalen Öffnen einen kleinen Webserver starten, etwa mit <span class="kennung">python3 -m http.server</span>.</p>';
    return;
  }

  const folgen = D.folgen;
  const au = W.reihen.find(r => r.id === "au");
  const nachId = id => folgen.find(f => f.id === id);
  const nummer = f => parseInt(f.nummer.split("-")[1], 10);

  const ART = { teaser: "AUFTAKT", regulaer: "REGULÄR", sonderfolge: "SONDERFOLGE" };

  /* ---------- Wochenwahl: deterministisch aus dem Datum, kein Server nötig ---------- */
  function wochenpick() {
    const tage = Math.floor(Date.now() / 86400000);
    const woche = Math.floor(tage / 7);
    const sortiert = [...folgen].sort((a, b) => nummer(a) - nummer(b));
    return sortiert[woche % sortiert.length];
  }

  function zeichneSpieler(f, viaWoche) {
    const zeilen = f.transkript.map(s => {
      const werbung = s.sprecher === "WERBUNG";
      const regie = s.regie ? `<span class="regie">${s.regie}</span>` : "";
      return `<div class="funkzeile${werbung ? " werbeblock" : ""}">
        <span class="sprecher">${s.sprecher}</span>
        <div class="rede">${regie}<p>${s.text}</p></div>
      </div>`;
    }).join("");

    const auListe = (Array.isArray(f.autopsie) ? f.autopsie : f.autopsie ? [f.autopsie] : [])
      .map(nr => au.faelle.find(x => x.nr === nr)).filter(Boolean);
    const shownote = auListe.length ? `<div class="shownotes">
        <span class="kennung">SHOWNOTES</span>
        <p>${auListe.length > 1 ? "Die vollständigen Akten zu dieser Sendung: " : "Die vollständige Akte zu dieser Sendung: "}
        ${auListe.map(a => `<a href="autopsien.html#au-${a.nr}">Autopsie #${String(a.nr).padStart(2, "0")} — ${a.titel}</a>`).join(", ")}.
        Dort stehen die Belege, die im Studio nur behauptet werden.</p>
      </div>` : "";

    spieler.innerHTML = `<article class="sendung" id="${f.id}">
        <header class="sendungskopf">
          <span class="kennung">SENDUNG ${f.nummer} · ${ART[f.art] || ""} · ${f.zeit} · ${f.dauer}</span>
          <h3>${f.titel}</h3>
          <p class="setting">${f.setting}</p>
          <p class="signal">[${f.signal}]</p>
        </header>
        <div class="funkprotokoll">${zeilen}</div>
        <p class="signal ende">[${f.ausklang}]</p>
        ${shownote}
      </article>`;

    document.getElementById("f404Wochenhinweis").textContent =
      viaWoche ? "diese Woche auf Sendung" : "manuell aus dem Archiv geladen";

    [...document.querySelectorAll(".f404-eintrag")].forEach(el =>
      el.setAttribute("aria-current", String(el.dataset.id === f.id)));
  }

  function spiele(id, { hash = true, scroll = false } = {}) {
    const f = nachId(id);
    if (!f) return;
    zeichneSpieler(f, false);
    if (hash) history.replaceState(null, "", "#" + id);
    if (scroll) spieler.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Archiv ---------- */
  const archiv = document.getElementById("f404Archiv");
  const sortiert = [...folgen].sort((a, b) => nummer(b) - nummer(a));
  archiv.innerHTML = sortiert.map(f => `
    <button type="button" class="f404-eintrag" data-id="${f.id}">
      <span class="kennung">${f.nummer}</span>
      <span class="tt">${f.titel}<small>${f.thema}${f.status === "in Konzeption" ? " · in Konzeption" : ""}</small></span>
      <span class="art art-${f.art}">${ART[f.art] || ""}</span>
    </button>`).join("");
  document.getElementById("f404Zaehler").textContent =
    `${folgen.length} Sendungen archiviert · neue Nummern folgen unregelmäßig`;

  archiv.addEventListener("click", e => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    spiele(b.dataset.id, { scroll: true });
  });

  /* ---------- Start: Sprungmarke schlägt Wochenwahl ---------- */
  const ziel = decodeURIComponent(location.hash.slice(1));
  if (ziel && nachId(ziel)) {
    zeichneSpieler(nachId(ziel), false);
  } else {
    zeichneSpieler(wochenpick(), true);
  }

  /* Sprung von der Suche, während die Seite schon offen ist */
  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (nachId(id)) zeichneSpieler(nachId(id), false);
  });
})();
