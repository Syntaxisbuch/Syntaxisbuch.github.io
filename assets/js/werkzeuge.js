/* SYNTAXIS — Rüstzeug: Red-Flag-Prüfung, Autopsie-Protokoll, Kartenkasten */
(async () => {
  "use strict";

  let D;
  try { D = await (await fetch("data/werkzeuge.json")).json(); }
  catch (e) {
    document.getElementById("rfListe").innerHTML =
      '<p class="leise" style="padding:1rem">Die Daten konnten nicht geladen werden. Beim lokalen Öffnen: einen kleinen Webserver starten, etwa mit <span class="kennung">python3 -m http.server</span>.</p>';
    return;
  }

  const merke = (k, v) => { try { localStorage.setItem("syntaxis:" + k, v); } catch (e) {} };
  const hole = k => { try { return localStorage.getItem("syntaxis:" + k); } catch (e) { return null; } };

  /* ================= Red-Flag-Prüfung ================= */
  const rfListe = document.getElementById("rfListe");
  const rfBefund = document.getElementById("rfBefund");
  const RF = D.redflags;

  if (rfListe) {
    rfListe.innerHTML = RF.punkte.map(p => `
      <label class="flagge">
        <input type="checkbox" value="${p.nr}">
        <span class="kopf"><span class="kasten"></span><span class="titel">${p.nr}. ${p.name}</span></span>
        <span class="frage">${p.frage}</span>
        <span class="erkl">${p.erklaerung}</span>
      </label>`).join("");

    const kaesten = () => [...rfListe.querySelectorAll("input")];

    function befund() {
      const treffer = kaesten().filter(k => k.checked);
      const n = treffer.length;
      const stufe = [...RF.bewertung].reverse().find(b => n >= b.ab) || RF.bewertung[0];
      rfBefund.innerHTML = `
        <div class="anzeige">
          <span class="zahl">${n}</span>
          <div>
            <h4>${stufe.titel}</h4>
            <p>${stufe.text}</p>
          </div>
        </div>
        ${n ? `<p class="kennung" style="margin-top:.9rem">Angehakt: ${treffer.map(t => RF.punkte[t.value - 1].name).join(" · ")}</p>` : ""}`;
      merke("redflags", treffer.map(t => t.value).join(","));
    }

    rfListe.addEventListener("change", befund);
    document.getElementById("rfReset")?.addEventListener("click", () => {
      kaesten().forEach(k => k.checked = false); befund();
    });

    const gespeichert = (hole("redflags") || "").split(",").filter(Boolean);
    kaesten().forEach(k => { if (gespeichert.includes(k.value)) k.checked = true; });
    befund();
  }

  /* ================= Autopsie-Protokoll ================= */
  const pkListe = document.getElementById("pkListe");
  const P = D.protokoll;

  if (pkListe) {
    pkListe.innerHTML = P.schritte.map(s => `
      <div class="schritt">
        <span class="p">PUNKT ${s.nr}</span>
        <div>
          <h4>${s.name}</h4>
          <p>${s.frage}</p>
          <textarea class="suchfeld" rows="2" data-pk="${s.nr}" placeholder="Deine Notiz" style="margin-top:.55rem;resize:vertical;font-size:.93rem"></textarea>
        </div>
      </div>`).join("");

    const gegenstand = document.getElementById("pkGegenstand");
    const felder = () => [...pkListe.querySelectorAll("textarea")];

    function speichere() {
      const daten = { g: gegenstand.value };
      felder().forEach(f => { if (f.value.trim()) daten[f.dataset.pk] = f.value; });
      merke("protokoll", JSON.stringify(daten));
    }
    pkListe.addEventListener("input", speichere);
    gegenstand.addEventListener("input", speichere);

    try {
      const alt = JSON.parse(hole("protokoll") || "{}");
      gegenstand.value = alt.g || "";
      felder().forEach(f => { if (alt[f.dataset.pk]) f.value = alt[f.dataset.pk]; });
    } catch (e) {}

    document.getElementById("pkLeeren")?.addEventListener("click", () => {
      if (!confirm("Alle Notizen dieses Arbeitsbogens löschen?")) return;
      gegenstand.value = "";
      felder().forEach(f => f.value = "");
      speichere();
    });

    document.getElementById("pkKopieren")?.addEventListener("click", async ev => {
      const zeilen = [
        "AUTOPSIE — ARBEITSBOGEN",
        "Gegenstand: " + (gegenstand.value || "—"),
        "Verfahren nach: Syntaxis, Autopsien der Schatten",
        ""
      ];
      P.schritte.forEach(s => {
        const f = pkListe.querySelector(`[data-pk="${s.nr}"]`);
        zeilen.push(`PUNKT ${s.nr} — ${s.name}`, s.frage, (f && f.value.trim()) || "(offen)", "");
      });
      const text = zeilen.join("\n");
      try {
        await navigator.clipboard.writeText(text);
        ev.target.textContent = "Kopiert";
      } catch (e) {
        const b = new Blob([text], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "autopsie-arbeitsbogen.txt";
        a.click();
        ev.target.textContent = "Heruntergeladen";
      }
      setTimeout(() => ev.target.textContent = "Als Text kopieren", 2200);
    });
  }

  /* ================= Kartenkasten ================= */
  const kkListe = document.getElementById("kkListe");
  const kkFilter = document.getElementById("kkFilter");

  if (kkListe) {
    const gruppen = ["Alle", ...new Set(D.ruestzeug.map(k => k.gruppe))];
    let aktiv = "Alle";

    kkFilter.innerHTML = gruppen.map(g =>
      `<button class="filter" type="button" data-g="${g}" aria-pressed="${g === aktiv}">${g}</button>`).join("");

    function zeichne() {
      const k = aktiv === "Alle" ? D.ruestzeug : D.ruestzeug.filter(x => x.gruppe === aktiv);
      kkListe.innerHTML = k.map(x => `
        <article class="karte">
          <span class="sig">${x.sig} · ${x.gruppe}</span>
          <h4>${x.name}</h4>
          <p class="kern">${x.kern}</p>
          <p class="anw">${x.anwendung}</p>
        </article>`).join("");
      [...kkFilter.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === aktiv)));
    }

    kkFilter.addEventListener("click", e => {
      const b = e.target.closest("[data-g]");
      if (!b) return;
      aktiv = b.dataset.g;
      zeichne();
    });
    zeichne();
  }
})();
