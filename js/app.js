// TechTree — interakcje strony (bez bibliotek). Szanuje prefers-reduced-motion.
(() => {
  const d = document, w = window;
  const calm = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = w.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // 1. animacje przy przewijaniu (z opóźnieniem dla grup)
  d.querySelectorAll("[data-stagger]").forEach((g) => {
    const step = +g.dataset.stagger || 90;
    [...g.querySelectorAll(":scope > [data-r]")].forEach((el, i) => el.style.setProperty("--d", i * step + "ms"));
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  d.querySelectorAll("[data-r], .reveal").forEach((el) => (calm ? el.classList.add("in") : io.observe(el)));

  // 2. nagłówek, pasek postępu, paralaksa — jedna pętla rAF na przewijanie
  const top = d.querySelector(".top"), bar = d.querySelector(".progress");
  const par = [...d.querySelectorAll("[data-par]")];
  const hero = d.querySelector(".hero");
  let ticking = false, heroApi = null;
  function onScroll() {
    ticking = false;
    const y = w.scrollY, h = d.documentElement.scrollHeight - w.innerHeight;
    top.classList.toggle("scrolled", y > 8);
    bar.style.setProperty("--p", h > 0 ? (y / h).toFixed(4) : 0);
    if (calm) return;
    const vh = w.innerHeight;
    for (const el of par) {
      const r = el.parentElement.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0,${(c * -(+el.dataset.par) * 100).toFixed(1)}px,0)`;
    }
    if (heroApi) { const r = hero.getBoundingClientRect(); heroApi.scroll(Math.min(Math.max(-r.top / r.height, 0), 1)); }
  }
  w.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  requestAnimationFrame(onScroll);

  // 3. kafelki: przechył za kursorem, poświata, wciśnięcie przy dotyku
  d.querySelectorAll(".raise.hov").forEach((el) => {
    const tilt = el.hasAttribute("data-tilt") && fine && !calm;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%");
      if (tilt) { el.style.setProperty("--ry", ((x - 0.5) * 7).toFixed(2) + "deg"); el.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg"); }
    });
    el.addEventListener("pointerleave", () => { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); el.classList.remove("press"); });
    el.addEventListener("pointerdown", () => el.classList.add("press"));
    ["pointerup", "pointercancel"].forEach((t) => el.addEventListener(t, () => setTimeout(() => el.classList.remove("press"), 120)));
  });

  // 4. cyfry „przewijają się” przy pojawieniu (wartość prawdziwa jest od razu w aria-label)
  const scr = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; scr.unobserve(e.target);
    const el = e.target, fin = el.textContent; let f = 0;
    el.setAttribute("aria-label", fin);
    const id = setInterval(() => {
      f++; el.textContent = [...fin].map((ch, i) => (/\d/.test(ch) && i >= f / 1.6 ? (Math.random() * 10) | 0 : ch)).join("");
      if (f > fin.length * 1.6 + 2) { clearInterval(id); el.textContent = fin; }
    }, 34);
  }), { threshold: 0.6 });
  if (!calm) d.querySelectorAll("[data-scr]").forEach((el) => scr.observe(el));

  // 5. kopiowanie danych
  const live = d.getElementById("live");
  d.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { const t = d.createElement("textarea"); t.value = b.dataset.copy; d.body.append(t); t.select(); d.execCommand("copy"); t.remove(); }
    const lbl = b.querySelector("span"); const old = lbl.textContent;
    b.classList.add("ok"); lbl.textContent = "Skopiowano"; live.textContent = `Skopiowano: ${b.dataset.copy}`;
    setTimeout(() => { b.classList.remove("ok"); lbl.textContent = old; }, 1800);
  }));

  // 6. menu na telefonie
  const mb = d.querySelector(".menu-btn"), nav = d.getElementById("nav");
  const close = () => { mb.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); };
  mb.addEventListener("click", () => { const o = mb.getAttribute("aria-expanded") !== "true"; mb.setAttribute("aria-expanded", String(o)); nav.classList.toggle("open", o); if (o) nav.querySelector("a").focus(); });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { close(); mb.focus(); } });

  // 7. znak 3D (WebGL): startuje przy pierwszej interakcji (ruch myszy, dotyk, przewinięcie),
  //    tylko na prawdziwym GPU, rysuje wyłącznie gdy jest widoczny. Do tego czasu widać identyczny obraz statyczny.
  const boxes = [...d.querySelectorAll("[data-3d]")];
  if (!boxes.length) return;
  const gpuOk = () => {
    try {
      const g = d.createElement("canvas").getContext("webgl"); if (!g) return false;
      const ext = g.getExtension("WEBGL_debug_renderer_info");
      const name = ext ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
      return !/swiftshader|llvmpipe|software|basic render/i.test(name);
    } catch { return false; }
  };
  const t0 = performance.now();
  const init = () => boxes.forEach((box) => {
    const cv = box.querySelector("canvas"), mode = box.dataset["3d"];
    const fl = box.querySelector(".floor");
    const api = w.znak3d(cv, { mode, still: calm, intro: performance.now() - t0 < 1500, colors: box.dataset.colors ? box.dataset.colors.split(",") : undefined, dist: +box.dataset.dist || undefined,
      onLift: fl ? (l) => fl.style.setProperty("--fs", (0.94 - l * 0.035).toFixed(3)) : null });
    if (!api) return;
    box.classList.add("live");
    if (mode === "hero") {
      heroApi = api; onScroll();
      if (fine && !calm) w.addEventListener("pointermove", (e) => api.pointer(e.clientX / w.innerWidth * 2 - 1, e.clientY / w.innerHeight * 2 - 1), { passive: true });
    }
    if (calm) { api.draw(); return; }
    new IntersectionObserver(([e]) => (e.isIntersecting ? api.start() : api.stop())).observe(box);
  });
  let started = false;
  const go = () => {
    if (started) return; started = true;
    evs.forEach((t) => w.removeEventListener(t, go, opts));
    if (!gpuOk() && !/[?&]gl=1/.test(location.search)) return; // słaby/programowy GPU: zostaje obraz statyczny
    const sc = d.createElement("script"); sc.src = d.querySelector("script[src$='app.js']").src.replace("app.js", "znak3d.js"); sc.onload = init; d.head.append(sc);
  };
  const evs = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown", "scroll"], opts = { passive: true };
  evs.forEach((t) => w.addEventListener(t, go, opts));
})();
