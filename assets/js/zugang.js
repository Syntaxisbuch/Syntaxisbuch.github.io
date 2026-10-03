/* Lesen und Sehen: Schriftgröße, Kontrast, ruhige Bewegung und Sprachausgabe für die ganze Website.
   Die Einstellungen liegen im Browser (localStorage, Schlüssel syntaxis_zugang_v1) und gelten
   genauso für die Trainings-App unter derselben Adresse. Die Stimme kommt vom Gerät, nichts wird übertragen. */
(function () {
  'use strict';
  var KEY = 'syntaxis_zugang_v1';
  var STANDARD = { textgroesse: 100, kontrast: false, ruhig: false, vorlesenAuto: false, tempo: 1, stimme: '' };
  var doc = document, html = doc.documentElement;

  function lade() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!r || typeof r !== 'object') return Object.assign({}, STANDARD);
      return {
        textgroesse: [100, 115, 130, 150].indexOf(r.textgroesse) >= 0 ? r.textgroesse : 100,
        kontrast: r.kontrast === true, ruhig: r.ruhig === true, vorlesenAuto: r.vorlesenAuto === true,
        tempo: typeof r.tempo === 'number' && r.tempo >= 0.5 && r.tempo <= 2 ? r.tempo : 1,
        stimme: typeof r.stimme === 'string' ? r.stimme.slice(0, 300) : ''
      };
    } catch (e) { return Object.assign({}, STANDARD); }
  }
  function anwenden(z) {
    html.style.fontSize = z.textgroesse + '%';
    html.classList.toggle('kontrast', !!z.kontrast);
    html.classList.toggle('ruhige-bewegung', !!z.ruhig);
  }
  function speichern(teil) {
    var neu = Object.assign(lade(), teil);
    try { localStorage.setItem(KEY, JSON.stringify(neu)); } catch (e) { /* gesperrt */ }
    anwenden(neu); return neu;
  }
  var z = lade(); anwenden(z);

  function el(tag, attr, kinder) {
    var e = doc.createElement(tag);
    Object.keys(attr || {}).forEach(function (k) { if (k === 'text') e.textContent = attr[k]; else e.setAttribute(k, attr[k]); });
    (kinder || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }

  /* ---------- Sprachausgabe ---------- */
  var synth = window.speechSynthesis, hat = !!synth && typeof window.SpeechSynthesisUtterance !== 'undefined';
  function stimmen() { return hat ? synth.getVoices().filter(function (v) { return /^de([-_]|$)/i.test(v.lang); }).sort(function (a, b) { return Number(b.localService) - Number(a.localService); }) : []; }
  function sauber(t) {
    return t.replace(/[←-⇿☀-➿\u{1F300}-\u{1FAFF}️]/gu, ' ').replace(/[*_`#>]+/g, '').replace(/%/g, ' Prozent').replace(/\s*[–—]\s*/g, ', ').replace(/\s+/g, ' ').trim();
  }
  function teile(t) {
    var s = t.match(/[^.!?:;]+[.!?:;]?/g) || [t], out = [], akt = '';
    s.forEach(function (x) { if ((akt + x).length > 220 && akt) { out.push(akt.trim()); akt = x; } else akt += x; });
    if (akt.trim()) out.push(akt.trim());
    return out;
  }
  function sprich(text, fertig) {
    var zz = lade(), st = stimmen(), stimme = st.filter(function (v) { return v.voiceURI === zz.stimme; })[0] || st[0];
    var teilchen = teile(sauber(text));
    if (!teilchen.length) { if (fertig) fertig(); return; }
    teilchen.forEach(function (t, i) {
      var u = new window.SpeechSynthesisUtterance(t);
      u.lang = (stimme && stimme.lang) || 'de-DE'; if (stimme) u.voice = stimme; u.rate = zz.tempo;
      if (i === teilchen.length - 1 && fertig) { u.onend = fertig; u.onerror = fertig; }
      synth.speak(u);
    });
  }

  /* ---------- Vorlesen des Seiteninhalts ---------- */
  var BLOECKE = 'h1,h2,h3,h4,p,li,blockquote,figcaption,dt,dd,summary,td,th';
  var liste = [], pos = -1, laeuft = false, leiste = null, statusFeld = null, sitzung = 0;

  function sammeln(wurzel) {
    var out = [];
    (wurzel || doc.getElementById('inhalt') || doc.body).querySelectorAll(BLOECKE).forEach(function (b) {
      if (b.closest('[aria-hidden="true"], .skip, .zugang-leiste, nav, script, style')) return;
      if (b.querySelector(BLOECKE) && b.tagName !== 'LI') return; // nur das innerste Element lesen
      var r = b.getBoundingClientRect(); var cs = getComputedStyle(b);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (b.closest('details:not([open])') && b.tagName !== 'SUMMARY') return;
      var t = (b.innerText || '').trim(); if (t.length < 2) return;
      out.push({ el: b, text: t });
    });
    return out;
  }
  function markiere(i) {
    liste.forEach(function (x) { x.el.classList.remove('vorlese-aktuell'); });
    if (liste[i]) {
      liste[i].el.classList.add('vorlese-aktuell');
      liste[i].el.scrollIntoView({ block: 'center', behavior: html.classList.contains('ruhige-bewegung') ? 'auto' : 'smooth' });
    }
  }
  function status(t) { if (statusFeld) statusFeld.textContent = t; }
  function lese(i, meine) {
    if (meine !== sitzung) return;
    if (i >= liste.length) { stopp(); status('Ende der Seite erreicht.'); return; }
    pos = i; markiere(i); laeuft = true; aktualisiereLeiste();
    status('Block ' + (i + 1) + ' von ' + liste.length);
    sprich(liste[i].text, function () { if (meine === sitzung && laeuft) lese(i + 1, meine); });
  }
  function starte(von) {
    if (!hat) return;
    synth.cancel(); sitzung++;
    liste = sammeln(); if (!liste.length) return;
    zeigeLeiste(); lese(Math.max(0, Math.min(von || 0, liste.length - 1)), sitzung);
  }
  function stopp() {
    sitzung++; laeuft = false; if (hat) synth.cancel();
    liste.forEach(function (x) { x.el.classList.remove('vorlese-aktuell'); });
    if (leiste) leiste.hidden = true; pos = -1; aktualisiereLeiste();
  }
  function pause() { sitzung++; laeuft = false; if (hat) synth.cancel(); aktualisiereLeiste(); status('Pausiert bei Block ' + (pos + 1) + '.'); }
  function weiter() { if (pos < 0) return; sitzung++; synth.cancel(); lese(pos, sitzung); }
  function springe(d) { if (pos < 0) return; var n = Math.max(0, Math.min(pos + d, liste.length - 1)); sitzung++; synth.cancel(); lese(n, sitzung); }
  function abHier() {
    var l = sammeln(), i = 0, h = window.innerHeight;
    for (; i < l.length; i++) { var r = l[i].el.getBoundingClientRect(); if (r.bottom > 80 && r.top < h) break; }
    synth.cancel(); sitzung++; liste = l; zeigeLeiste(); lese(i >= l.length ? 0 : i, sitzung);
  }
  function auswahl() {
    var t = (window.getSelection && String(window.getSelection())) || '';
    if (t.trim().length < 2) { return false; }
    synth.cancel(); sitzung++; laeuft = false; sprich(t, null); return true;
  }

  function zeigeLeiste() {
    if (!leiste) {
      statusFeld = el('span', { class: 'zl-status', role: 'status', 'aria-live': 'polite' });
      var knopf = function (id, text, label, fn) { var b = el('button', { type: 'button', 'data-zl': id, 'aria-label': label, title: label, text: text }); b.addEventListener('click', fn); return b; };
      leiste = el('div', { class: 'zugang-leiste', role: 'region', 'aria-label': 'Vorlesen' }, [
        knopf('zurueck', '⏮', 'Vorheriger Absatz', function () { springe(-1); }),
        knopf('pause', '⏸', 'Pause', function () { if (laeuft) pause(); else weiter(); }),
        knopf('vor', '⏭', 'Nächster Absatz', function () { springe(1); }),
        knopf('stopp', '⏹', 'Vorlesen beenden', stopp),
        statusFeld
      ]);
      doc.body.appendChild(leiste);
    }
    leiste.hidden = false;
  }
  function aktualisiereLeiste() {
    if (!leiste) return;
    var p = leiste.querySelector('[data-zl="pause"]');
    if (p) { p.textContent = laeuft ? '⏸' : '▶'; p.setAttribute('aria-label', laeuft ? 'Pause' : 'Weiterlesen'); p.title = laeuft ? 'Pause' : 'Weiterlesen'; }
  }

  /* ---------- Einstellungsfenster ---------- */
  var fenster = null, zuvorFokus = null;
  function baueFenster() {
    var zz = lade();
    var sw = function (id, text, klein, an, fn) {
      var cb = el('input', { type: 'checkbox', role: 'switch', id: 'zg-' + id }); cb.checked = an; cb.addEventListener('change', function () { fn(cb.checked); });
      return el('label', { class: 'zg-zeile' }, [cb, el('span', {}, [el('span', { class: 'zg-titel', text: text }), el('span', { class: 'zg-klein', text: klein })])]);
    };
    var groessen = el('div', { class: 'zg-chips', role: 'radiogroup', 'aria-label': 'Schriftgröße' });
    [[100, 'Normal'], [115, 'Groß'], [130, 'Größer'], [150, 'Sehr groß']].forEach(function (g) {
      var b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(zz.textgroesse === g[0]), 'data-groesse': g[0], text: g[1] });
      b.addEventListener('click', function () { speichern({ textgroesse: g[0] }); groessen.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(Number(x.getAttribute('data-groesse')) === g[0])); }); });
      groessen.appendChild(b);
    });
    var kinder = [
      el('div', { class: 'zg-kopf' }, [el('h2', { id: 'zg-titel', text: 'Lesen und Sehen' }), (function () { var b = el('button', { type: 'button', class: 'zg-zu', 'aria-label': 'Schließen', text: '×' }); b.addEventListener('click', schliesse); return b; })()]),
      el('p', { class: 'zg-hinweis', text: 'Stelle die Seite so ein, dass sie für dich gut lesbar und hörbar ist. Die Einstellungen bleiben auf diesem Gerät und gelten auch in der Trainings-App.' }),
      el('h3', { text: 'Schriftgröße' }), groessen,
      el('h3', { text: 'Darstellung' }),
      sw('kontrast', 'Kräftigere Kontraste', 'Graue Texte und Linien werden heller', zz.kontrast, function (v) { speichern({ kontrast: v }); }),
      sw('ruhig', 'Bewegung reduzieren', 'Keine Einblend- und Gleitanimationen', zz.ruhig, function (v) { speichern({ ruhig: v }); })
    ];
    if (hat) {
      var tempo = el('input', { type: 'range', min: '0.7', max: '1.4', step: '0.1', value: String(zz.tempo), 'aria-label': 'Sprechtempo', id: 'zg-tempo' });
      var tempoText = el('span', { text: 'Tempo: ' + zz.tempo.toFixed(1).replace('.', ',') + '×' });
      tempo.addEventListener('input', function () { var t = Number(tempo.value); speichern({ tempo: t }); tempoText.textContent = 'Tempo: ' + t.toFixed(1).replace('.', ',') + '×'; });
      var sel = el('select', { id: 'zg-stimme', 'aria-label': 'Stimme' });
      var fuell = function () {
        var cur = lade().stimme; sel.innerHTML = '';
        sel.appendChild(el('option', { value: '', text: 'Automatisch (beste deutsche Stimme)' }));
        stimmen().forEach(function (v) { var o = el('option', { value: v.voiceURI, text: v.name + (v.localService ? '' : ' (online)') }); if (v.voiceURI === cur) o.selected = true; sel.appendChild(o); });
      };
      fuell(); if (synth.addEventListener) synth.addEventListener('voiceschanged', fuell);
      sel.addEventListener('change', function () { speichern({ stimme: sel.value }); });
      var probe = el('button', { type: 'button', class: 'zg-knopf', 'data-probe': '1', text: 'Probe hören' });
      probe.addEventListener('click', function () { synth.cancel(); sprich('So klingt die Sprachausgabe. Frage zuerst, urteile danach.'); });
      var ganze = el('button', { type: 'button', class: 'zg-knopf', 'data-seite-lesen': '1', text: 'Diese Seite vorlesen' });
      ganze.addEventListener('click', function () { schliesse(); if (!auswahl()) starte(0); });
      kinder.push(el('h3', { text: 'Sprachausgabe' }),
        el('p', { class: 'zg-hinweis', text: 'Die Stimme kommt von deinem Gerät, es wird nichts übertragen. Markierten Text liest „Diese Seite vorlesen“ zuerst; ohne Markierung beginnt es oben.' }),
        el('label', { class: 'zg-feld' }, [tempoText, tempo]),
        el('label', { class: 'zg-feld' }, [el('span', { text: 'Stimme' }), sel]),
        el('div', { class: 'zg-reihe' }, [probe, ganze]));
      if (stimmen().length === 0) kinder.push(el('p', { class: 'zg-warn', text: 'Es wurde keine deutsche Stimme gefunden. In den Systemeinstellungen des Geräts lässt sich eine installieren.' }));
    } else {
      kinder.push(el('h3', { text: 'Sprachausgabe' }), el('p', { class: 'zg-warn', 'data-keine-sprache': '1', text: 'Dieses Gerät oder dieser Browser bietet keine Sprachausgabe an. Ein Bildschirmleser des Geräts (zum Beispiel TalkBack, VoiceOver oder NVDA) funktioniert mit der Seite trotzdem.' }));
    }
    var fertig = el('button', { type: 'button', class: 'zg-fertig', text: 'Fertig' }); fertig.addEventListener('click', schliesse);
    kinder.push(fertig);
    var kasten = el('div', { class: 'zg-kasten', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'zg-titel', tabindex: '-1' }, kinder);
    var schleier = el('div', { class: 'zg-schleier' }); schleier.addEventListener('click', schliesse);
    fenster = el('div', { class: 'zugang-fenster', id: 'zugangFenster' }, [schleier, kasten]);
    fenster.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); schliesse(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(fenster.querySelectorAll('button, input, select, a[href]'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    doc.body.appendChild(fenster);
  }
  function oeffne() {
    if (fenster) fenster.remove(); fenster = null;
    baueFenster(); zuvorFokus = doc.activeElement;
    fenster.classList.add('offen'); doc.body.style.overflow = 'hidden';
    var k = fenster.querySelector('.zg-kasten'); (fenster.querySelector('h2') ? k : k).focus();
  }
  function schliesse() {
    if (!fenster) return; fenster.classList.remove('offen'); doc.body.style.overflow = '';
    if (zuvorFokus && zuvorFokus.focus) zuvorFokus.focus();
  }

  /* ---------- Knopf in der Kopfzeile ---------- */
  function knopfEinbauen() {
    var zeile = doc.querySelector('.masthead-in'); if (!zeile) return;
    var b = el('button', { type: 'button', class: 'zugangknopf', id: 'zugangAuf', 'aria-haspopup': 'dialog', 'aria-label': 'Lesen und Sehen: Schrift, Kontrast, Sprachausgabe', title: 'Lesen und Sehen' });
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="4.5" r="2" fill="currentColor"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5m0 0l-3.5 5M12 15l3.5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener('click', oeffne);
    var such = doc.getElementById('suchAuf'); zeile.insertBefore(b, such ? such.nextSibling : null);
    if (hat) {
      var v = el('button', { type: 'button', class: 'zugangknopf', id: 'vorlesenAuf', 'aria-label': 'Seite vorlesen', title: 'Seite vorlesen (markierten Text zuerst)' });
      v.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      v.addEventListener('click', function () { if (laeuft || pos >= 0) { stopp(); return; } if (!auswahl()) abHier(); });
      zeile.insertBefore(v, b);
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', knopfEinbauen); else knopfEinbauen();
  window.addEventListener('pagehide', function () { if (hat) synth.cancel(); });
  window.SyntaxisZugang = { oeffne: oeffne, starte: starte, stopp: stopp };
})();
