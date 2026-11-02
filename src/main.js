(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Postupné zobrazovanie blokov pri scrollovaní
  const items = document.querySelectorAll(".reveal, .steps li");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  // Hero: čiary sa vykreslia, keď je fotka načítaná
  const stage = document.querySelector(".stage");
  if (stage) {
    const img = stage.querySelector("img");
    // spustí sa, keď je fotka načítaná a aspoň z tretiny viditeľná
    const go = () => requestAnimationFrame(() => stage.classList.add("go"));
    const whenLoaded = (fn) => (img.complete ? fn() : (img.addEventListener("load", fn, { once: true }), setTimeout(fn, 2000)));
    if ("IntersectionObserver" in window) {
      const so = new IntersectionObserver(([e]) => { if (e.isIntersecting) { so.disconnect(); whenLoaded(go); } }, { threshold: 0.35 });
      so.observe(stage);
    } else whenLoaded(go);

    // prepojenie popisku a čiary pri prechode myšou
    stage.querySelectorAll(".tag").forEach((tag) => {
      const g = stage.querySelector(`.hl[data-key="${tag.dataset.key}"]`);
      const on = () => { tag.classList.add("is-hot"); g && g.classList.add("is-hot"); };
      const off = () => { tag.classList.remove("is-hot"); g && g.classList.remove("is-hot"); };
      tag.addEventListener("mouseenter", on);
      tag.addEventListener("mouseleave", off);
      tag.addEventListener("focus", on);
      tag.addEventListener("blur", off);
    });
  }

  // Otvorené / zatvorené podľa otváracích hodín
  try {
    const hours = JSON.parse(document.getElementById("hours-data").textContent);
    const now = new Date();
    const idx = (now.getDay() + 6) % 7; // pondelok = 0
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
    const isOpenDay = (d) => d && !d.closed && d.open && d.close;

    document.querySelectorAll("[data-hours] tr").forEach((tr) => tr.classList.toggle("today", Number(tr.dataset.day) === idx));

    const el = document.querySelector("[data-status]");
    if (el && hours.length === 7) {
      const today = hours[idx];
      const text = el.querySelector(".status-text");
      if (isOpenDay(today) && mins >= toMin(today.open) && mins < toMin(today.close)) {
        el.classList.add("is-open");
        text.innerHTML = `<strong>Teraz otvorené</strong> · do ${today.close}`;
      } else {
        el.classList.add("is-closed");
        let label = "";
        if (isOpenDay(today) && mins < toMin(today.open)) label = `dnes o ${today.open}`;
        else {
          for (let i = 1; i <= 7; i++) {
            const d = hours[(idx + i) % 7];
            if (isOpenDay(d)) { label = i === 1 ? `zajtra o ${d.open}` : `${d.day.toLowerCase()} o ${d.open}`; break; }
          }
        }
        text.innerHTML = `<strong>Teraz zatvorené</strong>${label ? ` · otvárame ${label}` : ""}`;
      }
    }
  } catch (e) { /* bez hodín sa stav jednoducho nezobrazí */ }

  // Rezervácia: dátum najskôr dnes
  const date = document.querySelector("[data-min-today]");
  if (date) {
    const d = new Date();
    date.min = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  // Svetlomety – posuvník pred/po
  document.querySelectorAll("[data-ba]").forEach((ba) => {
    const range = ba.querySelector("input");
    let demo = true;
    const set = (v) => ba.style.setProperty("--pos", v + "%");
    range.addEventListener("input", () => { demo = false; set(range.value); });
    range.addEventListener("pointerdown", () => { demo = false; ba.classList.add("is-drag"); });
    window.addEventListener("pointerup", () => ba.classList.remove("is-drag"));
    // krátka ukážka pohybu, keď sa posuvník prvýkrát objaví
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const seq = [50, 22, 78, 50];
        let i = 0;
        const step = () => {
          if (!demo || i >= seq.length - 1) return;
          const from = seq[i], to = seq[i + 1], t0 = performance.now(), dur = 700;
          const tick = (t) => {
            if (!demo) return;
            const p = Math.min(1, (t - t0) / dur), k = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            const v = from + (to - from) * k;
            set(v); range.value = v;
            p < 1 ? requestAnimationFrame(tick) : (i++, setTimeout(step, 140));
          };
          requestAnimationFrame(tick);
        };
        setTimeout(step, 600);
      }, { threshold: 0.6 });
      io.observe(ba);
    }
  });
})();
