// Jednoduchý build bez závislostí: načíta obsah z /content (upravuje sa cez /admin)
// a vygeneruje statický web do /dist. Netlify ho spúšťa príkazom `node build.js`.
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "content", f), "utf8"));

const site = read("site.json");
const sv = read("services.json");
const gallery = read("gallery.json");

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tel = (p) => "+421" + String(p).replace(/\D/g, "").replace(/^0/, "");
const year = new Date().getFullYear();

// Rezervačný formulár (Netlify Forms) – zatiaľ vypnutý, zapína sa ako doplnková služba.
const SHOW_BOOKING = false;

// ---------- pomocné bloky ----------
const icon = {
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`,
  fb: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.25-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4V10.5H7.8v3h2.6V21z"/></svg>`,
};

const priceOrAsk = (p) => (p && String(p).trim() ? esc(p) : `<span class="ask">na otázku</span>`);

// Hotspoty sú naviazané na fotku hero-1800.jpg (súradnice v pixeloch fotky 1800×1125).
// Pri výmene fotky v administrácii treba body upraviť tu.
const HOT = [
  { key: "tires", n: 1, target: "#pneu", point: [780, 760], path: "M780 760 L640 960 L362 960", tag: { right: "79.9%", top: "85.3%" }, side: "left" },
  { key: "lights", n: 2, target: "#svetlomety", point: [1150, 540], path: "M1150 540 L1260 250 L1348 250", tag: { left: "74.9%", top: "22.2%" }, side: "right" },
  { key: "plastics", n: 3, target: "#plasty", point: [1290, 690], path: "M1290 690 L1390 860 L1418 860", tag: { left: "78.8%", top: "76.4%" }, side: "right" },
];

const hotSvg = HOT.map(
  (h) => `<g class="hl hl--${h.key}" data-key="${h.key}">
      <path class="hl-line" d="${h.path}" pathLength="1" />
      <circle class="hl-ring" cx="${h.point[0]}" cy="${h.point[1]}" r="22" />
      <circle class="hl-dot" cx="${h.point[0]}" cy="${h.point[1]}" r="9" />
    </g>`
).join("");

const hotTags = HOT.map((h) => {
  const t = sv.hotspots[h.key];
  const pos = Object.entries(h.tag).map(([k, v]) => `${k}:${v}`).join(";");
  return `<a class="tag tag--${h.side}" href="${h.target}" style="${pos};--i:${h.n}" data-key="${h.key}">
      <span class="tag-n">0${h.n}</span>
      <span class="tag-t"><strong>${esc(t.label)}</strong><small>${esc(t.sub)}</small></span>
    </a>`;
}).join("");

const hotPins = HOT.map(
  (h) =>
    `<span class="pin" style="left:${((h.point[0] / 1800) * 100).toFixed(2)}%;top:${((h.point[1] / 1125) * 100).toFixed(2)}%">${h.n}</span>`
).join("");

const hotLegend = HOT.map((h) => {
  const t = sv.hotspots[h.key];
  return `<li><a href="${h.target}"><span>${h.n}</span><strong>${esc(t.label)}</strong><small>${esc(t.sub)}</small></a></li>`;
}).join("");

const list = (arr, cls = "") => `<ul class="${cls}">${(arr || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

const hoursRows = site.hours
  .map(
    (h, i) =>
      `<tr data-day="${i}"><th>${esc(h.day)}</th><td>${h.closed ? "zatvorené" : `${esc(h.open)} – ${esc(h.close)}`}</td></tr>`
  )
  .join("");

const fullAddress = [site.street, site.town].filter(Boolean).join(", ");
const navUrl = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(site.map_query || fullAddress);
const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(site.map_query || fullAddress);

const dayCodes = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: site.name,
  telephone: tel(site.phone),
  image: "/img/og.jpg",
  address: { "@type": "PostalAddress", streetAddress: site.street, addressLocality: site.town, addressCountry: "SK" },
  openingHours: site.hours.map((h, i) => (h.closed ? null : `${dayCodes[i]} ${h.open}-${h.close}`)).filter(Boolean),
};
if (site.facebook && site.facebook.length > 26) jsonLd.sameAs = [site.facebook];

const head = (title, desc) => `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="/img/og.jpg">
<meta property="og:type" content="website">
<meta name="theme-color" content="#0b0c0e">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,800&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script>
  document.documentElement.classList.add("js");
  // Prihlasovacie odkazy z Netlify Identity (pozvánka, reset hesla) presmeruj do administrácie
  if (/(invite|recovery|confirmation|email_change)_token|access_token/.test(location.hash)) location.replace("/admin/" + location.hash);
</script>
</head>`;

const header = `<header class="site-header" id="top">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="${esc(site.name)} – domov"><img src="/img/logo-600.png" alt="${esc(site.name)}" width="600" height="169"></a>
    <nav class="nav" aria-label="Hlavné menu">
      <a href="/#sluzby">Služby</a>
      <a href="/#cennik">Cenník</a>
      <a href="/#plasty">Zváranie plastov</a>
      <a href="/#kontakt">Kontakt</a>
    </nav>
    ${SHOW_BOOKING ? `<a class="btn btn--sm btn--blue" href="/#rezervacia">Rezervovať</a>` : `<a class="btn btn--sm btn--blue" href="tel:${tel(site.phone)}">${icon.phone}${esc(site.phone)}</a>`}
  </div>
</header>`;

const footer = `<footer class="site-footer">
  <div class="wrap foot">
    <img src="/img/logo-600.png" alt="${esc(site.name)}" width="600" height="169" loading="lazy">
    <p>${esc(fullAddress)} · <a href="tel:${tel(site.phone)}">${esc(site.phone)}</a></p>
    <p class="muted">© ${year} ${esc(site.name)}</p>
  </div>
</footer>
<div class="mbar" aria-label="Rýchly kontakt">
  ${SHOW_BOOKING
    ? `<a href="tel:${tel(site.phone)}">${icon.phone}Zavolať</a><a href="/#rezervacia" class="mbar-main">Rezervovať termín</a>`
    : `<a href="${navUrl}" target="_blank" rel="noopener">${icon.pin}Navigovať</a><a href="tel:${tel(site.phone)}" class="mbar-main">${icon.phone}Zavolať</a>`}
</div>`;

// ---------- hlavná stránka ----------
const index = `${head(site.seo_title, site.seo_description)}
<body>
<a class="skip" href="#obsah">Preskočiť na obsah</a>
${header}

<main id="obsah">
<section class="hero">
  <div class="wrap hero-head">
    <div class="hero-copy">
      <p class="kicker reveal">${esc(site.hero_kicker)}</p>
      <h1 class="reveal">${esc(site.hero_title)}</h1>
    </div>
    <div class="hero-side reveal">
      <p class="lead">${esc(site.hero_text)}</p>
      <div class="actions">
        ${SHOW_BOOKING
          ? `<a class="btn btn--blue" href="#rezervacia">Rezervovať termín ${icon.arrow}</a>
        <a class="btn btn--ghost" href="tel:${tel(site.phone)}">${icon.phone}${esc(site.phone)}</a>`
          : `<a class="btn btn--blue" href="tel:${tel(site.phone)}">${icon.phone}Zavolať a objednať sa</a>
        <a class="btn btn--ghost" href="#kontakt">Kde nás nájdete ${icon.arrow}</a>`}
      </div>
      <p class="status" data-status><span class="status-dot"></span><span class="status-text">Otváracie hodiny</span></p>
    </div>
  </div>

  <div class="wrap">
    <figure class="stage" aria-label="Služby na aute">
      <img src="/img/hero-1800.jpg" srcset="/img/hero-1000.jpg 1000w, /img/hero-1800.jpg 1800w" sizes="(max-width: 1300px) 100vw, 1260px" width="1800" height="1125" alt="Auto v dielni Pneuservis Bronsky">
      <svg class="lines" viewBox="0 0 1800 1125" preserveAspectRatio="none" aria-hidden="true">${hotSvg}</svg>
      ${hotTags}
      ${hotPins}
    </figure>
    <ol class="legend">${hotLegend}</ol>
  </div>
  <div class="hazard" aria-hidden="true"></div>
</section>

<section class="section" id="sluzby">
  <div class="wrap">
    <header class="sec-head reveal">
      <p class="kicker">Služby</p>
      <h2>Všetko okolo kolies, plastov a svetiel</h2>
    </header>

    <article class="row reveal" id="pneu">
      <span class="row-n">01</span>
      <h3>${esc(sv.tires.title)}</h3>
      <div class="row-body">
        <p>${esc(sv.tires.text)}</p>
        ${list(sv.tires.points, "ticks")}
      </div>
      <a class="row-link" href="${SHOW_BOOKING ? "#rezervacia" : `tel:${tel(site.phone)}`}">Objednať sa ${icon.arrow}</a>
    </article>

    <article class="row reveal">
      <span class="row-n">02</span>
      <h3>${esc(sv.storage.title)}</h3>
      <div class="row-body">
        <p>${esc(sv.storage.text)}</p>
        <p class="row-price">od <strong>${esc((sv.storage.prices[1] || sv.storage.prices[0] || {}).price || "")}</strong> za sadu 4 ks</p>
      </div>
      <a class="row-link" href="#cennik">Cenník ${icon.arrow}</a>
    </article>

    <article class="row reveal">
      <span class="row-n">03</span>
      <h3>${esc(sv.plastics.title)}</h3>
      <div class="row-body">
        <p>${esc(sv.plastics.text)}</p>
      </div>
      <a class="row-link" href="#plasty">Viac ${icon.arrow}</a>
    </article>

    <article class="row reveal">
      <span class="row-n">04</span>
      <h3>${esc(sv.lights.title)}</h3>
      <div class="row-body">
        <p>${esc(sv.lights.text)}</p>
      </div>
      <a class="row-link" href="#svetlomety">Pred a po ${icon.arrow}</a>
    </article>
  </div>
</section>

<section class="section light" id="cennik">
  <div class="wrap">
    <header class="sec-head reveal">
      <p class="kicker">Cenník</p>
      <h2>Uskladnenie pneumatík</h2>
      <p class="sec-lead">${esc(sv.storage.text)}</p>
    </header>
    <div class="pricing">
      <div class="price-cards">
        ${sv.storage.prices
          .map(
            (p, i) => `<div class="pcard reveal${i === 0 ? " pcard--main" : ""}">
          <div><h3>${esc(p.title)}</h3>${p.note ? `<p>${esc(p.note)}</p>` : ""}</div>
          <div class="pcard-price"><small>pri 4 ks</small><strong>${esc(p.price)}</strong></div>
        </div>`
          )
          .join("")}
        <p class="included reveal"><span>V cene:</span> ${sv.storage.included.map((x) => `<b>${esc(x)}</b>`).join("")}</p>
        <p class="fine reveal">${esc(sv.storage.price_note)}</p>
      </div>
      <div class="price-list reveal">
        <h3>Ďalšie služby</h3>
        <dl>
          ${sv.prices.map((p) => `<div><dt>${esc(p.item)}</dt><dd>${priceOrAsk(p.price)}</dd></div>`).join("")}
        </dl>
        <a class="btn btn--dark" href="tel:${tel(site.phone)}">${icon.phone}Zavolajte pre presnú cenu</a>
      </div>
    </div>
  </div>
</section>

<section class="section" id="plasty">
  <div class="wrap">
    <div class="split">
      <header class="sec-head reveal">
        <p class="kicker">Zváranie plastov</p>
        <h2>Prasknutý nárazník nemusí ísť do šrotu</h2>
        <p class="sec-lead">${esc(sv.plastics.text)}</p>
      </header>
      <div class="plast-info reveal">
        ${list(sv.plastics.repairs, "ticks")}
        <p class="mini">Vhodné pre materiály</p>
        <ul class="chips">${sv.plastics.materials.map((m) => `<li>${esc(m)}</li>`).join("")}<li>a ďalšie</li></ul>
      </div>
    </div>
    <ol class="steps">
      ${sv.plastics.steps
        .map((s, i) => `<li class="reveal" style="--d:${i * 90}ms"><span>${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`)
        .join("")}
    </ol>
  </div>
</section>

<section class="section dark2" id="svetlomety">
  <div class="wrap split split--media">
    <div class="ba reveal" data-ba style="--pos:50%">
      <img src="/img/svetlomet-po.jpg" alt="Svetlomet po regenerácii" width="852" height="930" loading="lazy">
      <div class="ba-before" aria-hidden="true"><img src="/img/svetlomet-pred.jpg" alt="" width="852" height="930" loading="lazy"></div>
      <span class="ba-handle" aria-hidden="true"></span>
      <span class="ba-label ba-label--l">Pred</span><span class="ba-label ba-label--r">Po</span>
      <input type="range" min="0" max="100" value="50" aria-label="Posuňte pre porovnanie pred a po">
      <small class="ba-note">Ilustračná ukážka</small>
    </div>
    <div class="reveal">
      <p class="kicker">Regenerácia svetlometov</p>
      <h2>Jasnejšie svetlá, auto o pár rokov mladšie</h2>
      <p class="sec-lead">${esc(sv.lights.text)}</p>
      ${list(sv.lights.points, "ticks")}
    </div>
  </div>
</section>

<section class="section" id="dielna">
  <div class="wrap">
    <header class="sec-head reveal">
      <p class="kicker">${esc(gallery.title)}</p>
      <h2>Kde sa o vaše auto postaráme</h2>
      <p class="sec-lead">${esc(gallery.text)}</p>
    </header>
    <div class="gallery">
      ${gallery.photos.map((p) => `<figure class="reveal"><img src="${esc(p.image)}" alt="${esc(p.alt)}" loading="lazy"></figure>`).join("")}
    </div>
  </div>
</section>

${SHOW_BOOKING ? `<section class="section booking" id="rezervacia">
  <div class="wrap split">
    <div class="reveal">
      <p class="kicker">Rezervácia</p>
      <h2>Dohodnime termín</h2>
      <p class="sec-lead">Vyplňte, čo potrebujete a kedy sa vám to hodí. Termín vám potvrdíme telefonicky alebo SMS. Ak sa ponáhľate, radšej zavolajte.</p>
      <a class="bigphone" href="tel:\${tel(site.phone)}">\${icon.phone}\${esc(site.phone)}</a>
    </div>
    <form class="form reveal" name="rezervacia" method="POST" action="/dakujeme/" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="rezervacia">
      <p class="hp"><label>Nevypĺňajte <input name="bot-field"></label></p>
      <label class="f">Meno <input name="meno" autocomplete="name" required></label>
      <label class="f">Telefón <input name="telefon" type="tel" autocomplete="tel" required></label>
      <label class="f f--full">Služba
        <select name="sluzba" required>
          <option value="">Vyberte…</option>
          <option>Prezutie pneumatík</option>
          <option>Prezutie + uskladnenie</option>
          <option>Oprava defektu</option>
          <option>Zváranie plastov</option>
          <option>Regenerácia svetlometov</option>
          <option>Iné</option>
        </select>
      </label>
      <label class="f">Auto / ŠPZ <input name="auto" placeholder="napr. Škoda Octavia"></label>
      <label class="f">Preferovaný deň <input name="den" type="date" data-min-today></label>
      <fieldset class="f f--full seg">
        <legend>Čas</legend>
        <label><input type="radio" name="cas" value="Dopoludnia" checked><span>Dopoludnia</span></label>
        <label><input type="radio" name="cas" value="Popoludní"><span>Popoludní</span></label>
        <label><input type="radio" name="cas" value="Je mi to jedno"><span>Je mi to jedno</span></label>
      </fieldset>
      <label class="f f--full">Poznámka <textarea name="poznamka" rows="3" placeholder="rozmer pneumatík, popis poškodenia…"></textarea></label>
      <button class="btn btn--blue f--full" type="submit">Odoslať rezerváciu \${icon.arrow}</button>
    </form>
  </div>
</section>

` : ""}

<section class="section" id="kontakt">
  <div class="wrap contact">
    <div class="reveal">
      <p class="kicker">Kontakt</p>
      <h2>${esc(site.street)}</h2>
      <ul class="clist">
        <li>${icon.pin}<span>${esc(fullAddress)}</span></li>
        <li>${icon.phone}<a href="tel:${tel(site.phone)}">${esc(site.phone)}</a></li>
        ${site.email ? `<li><span class="at">@</span><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ""}
        ${site.facebook ? `<li>${icon.fb}<a href="${esc(site.facebook)}" target="_blank" rel="noopener">Facebook</a></li>` : ""}
      </ul>
      <table class="hours" data-hours>${hoursRows}</table>
      ${site.hours_note ? `<p class="fine">${esc(site.hours_note)}</p>` : ""}
      <a class="bigphone" href="tel:${tel(site.phone)}">${icon.phone}${esc(site.phone)}</a>
    </div>
    <div class="map reveal">
      <iframe title="Mapa – ${esc(site.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        src="https://maps.google.com/maps?q=${encodeURIComponent(site.map_query || fullAddress)}&z=15&output=embed"></iframe>
      <a class="map-link" href="${mapUrl}" target="_blank" rel="noopener">${icon.pin}Otvoriť v Google Mapách</a>
    </div>
  </div>
</section>
</main>

${footer}
<script type="application/json" id="hours-data">${JSON.stringify(site.hours)}</script>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script src="/main.js" defer></script>
</body>
</html>`;

const thanks = `${head("Ďakujeme – " + site.name, "Rezervácia odoslaná")}
<body>
${header}
<main class="thanks">
  <div class="wrap">
    <p class="kicker">Rezervácia odoslaná</p>
    <h1>Ďakujeme, ozveme sa vám.</h1>
    <p class="lead">Termín vám potvrdíme telefonicky alebo SMS, zvyčajne v ten istý pracovný deň. Ak je to súrne, zavolajte na <a href="tel:${tel(site.phone)}">${esc(site.phone)}</a>.</p>
    <a class="btn btn--blue" href="/">Späť na úvod</a>
  </div>
</main>
${footer}
</body>
</html>`;

// ---------- zápis ----------
const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
};

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, "src"), OUT);
fs.writeFileSync(path.join(OUT, "index.html"), index);
if (SHOW_BOOKING) {
  fs.mkdirSync(path.join(OUT, "dakujeme"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "dakujeme", "index.html"), thanks);
}
console.log("Hotovo → dist/");
