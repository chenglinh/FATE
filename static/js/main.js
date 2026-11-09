/* Interactive figures: compare sliders, pipeline, assignments, crop connectors, gallery. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const MINUS = "\u2212";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const IMG = "static/img/";

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const tip = $("#tooltip");
  function showTip(html, ev) {
    tip.innerHTML = html;
    tip.classList.add("on");
    const pad = 14, r = tip.getBoundingClientRect();
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - pad;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => tip.classList.remove("on");
  const vec = (dx, dy) => `(${dx > 0 ? "+" : dx < 0 ? MINUS : ""}${Math.abs(dx)}, ${dy > 0 ? "+" : dy < 0 ? MINUS : ""}${Math.abs(dy)})`;

  /* ---------------------------------------------------------------- nav */
  const nav = $(".topnav");
  const links = $$(".navlinks a");
  let current = null;
  function setActive(id) {
    if (id === current) return;
    current = id;
    links.forEach((a) => {
      const on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("active", on);
      if (on && window.innerWidth < 900) a.parentElement.scrollTo({ left: a.offsetLeft - 40, behavior: "smooth" });
    });
  }
  const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    if (atBottom()) setActive("citation");
    else if (window.scrollY < 40) setActive(null);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting && !atBottom()) setActive(e.target.id); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section[id]").forEach((s) => io.observe(s));

  const story = $("#opening-story");
  if (story) {
    $$("[data-story-scale]").forEach((button) => button.addEventListener("click", () => {
      const detail = button.dataset.storyScale === "detail";
      story.classList.toggle("detail", detail);
      const groups = $("#story-groups");
      groups.src = detail ? groups.dataset.detailSrc : groups.dataset.wholeSrc;
      groups.classList.toggle("cropped", detail);
      $$("[data-story-scale]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    }));
    $$("[data-story-frame]").forEach((button) => button.addEventListener("click", () => {
      const frame = button.dataset.storyFrame;
      $("#story-input").src = story.dataset[`image${frame}`];
      $("#story-input").alt = `Image ${frame} of the Sintel moving-blade scene`;
      $$("[data-story-frame]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    }));
  }

  /* --------------------------------------------------------------- math */
  function renderMath() {
    if (!window.renderMathInElement) return false;
    window.renderMathInElement(document.body, {
      delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
    return true;
  }
  if (!renderMath()) window.addEventListener("load", renderMath);

  /* ---------------------------------------------------- compare slider */
  function Compare(root) {
    const base = $(".base", root), top = $(".top", root);
    const divider = $(".divider", root), lens = $(".lens", root);
    const tagL = $(".tag-left", root), tagR = $(".tag-right", root);
    const Z = 2.6;
    let pos = 50, dragging = false;
    const setPos = (p) => {
      pos = Math.max(0, Math.min(100, p));
      root.style.setProperty("--pos", pos + "%");
      divider.setAttribute("aria-valuenow", String(Math.round(pos)));
    };
    const pct = (ev) => { const r = root.getBoundingClientRect(); return ((ev.clientX - r.left) / r.width) * 100; };
    root.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      dragging = true;
      root.classList.remove("lens-on");
      root.setPointerCapture(ev.pointerId);
      setPos(pct(ev));
    });
    root.addEventListener("pointermove", (ev) => {
      if (dragging) { setPos(pct(ev)); return; }
      if (!lens || !canHover || ev.pointerType !== "mouse") return;
      const r = root.getBoundingClientRect();
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      if (px < 0 || py < 0 || px > r.width || py > r.height) { root.classList.remove("lens-on"); return; }
      const img = (px / r.width) * 100 < pos ? top : base;
      const L = lens.offsetWidth || 190;
      lens.style.left = px + "px";
      lens.style.top = py + "px";
      lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
      lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
      lens.style.backgroundPosition = `${-(px * Z - L / 2)}px ${-(py * Z - L / 2)}px`;
      root.classList.add("lens-on");
    });
    const end = () => { dragging = false; };
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
    root.addEventListener("pointerleave", () => root.classList.remove("lens-on"));
    divider.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft") { setPos(pos - 4); ev.preventDefault(); }
      if (ev.key === "ArrowRight") { setPos(pos + 4); ev.preventDefault(); }
    });
    setPos(50);
    return {
      set({ left, right, w, h, at }) {
        if (at != null) setPos(at);
        base.width = w; base.height = h;
        base.src = right.src; base.alt = right.label;
        top.src = left.src; top.alt = left.label;
        tagL.textContent = left.label; tagR.textContent = right.label;
      },
      root,
    };
  }

  /* ---------------------------------------------------------- count-up */
  (function countUp() {
    const nums = $$("[data-count]");
    if (reduceMotion || !nums.length) return;
    const ob = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        ob.unobserve(e.target);
        const target = parseFloat(e.target.dataset.count), d = parseInt(e.target.dataset.dec || "0", 10);
        const suffix = e.target.dataset.suffix || "";
        const t0 = performance.now(), dur = 900;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - k, 3));
          e.target.textContent = v.toFixed(d) + suffix;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach((n) => ob.observe(n));
  })();

  /* ------------------------------------------------- pipeline stepper */
  (function pipeline() {
    const svg = $(".pipeline-overlay"), out = $("#step-text");
    if (!svg) return;
    const B = {
      images: [3.6, 7.7, 113, 90], extract: [122.4, 15.9, 203.1, 78.5], dense: [212.5, 15.9, 280.6, 78.5],
      aLabel: [140, 97, 238, 148], aPanel: [286.5, 89.3, 406.7, 150.5],
      pool: [290, 16.2, 403.2, 78.1], attn: [412.6, 2.5, 485.9, 78.5], feat: [495.3, 15.9, 571.9, 78.5],
      refine: [474.12, 92.88, 588.12, 150.48], unitFlow: [486.7, 164.3, 575.5, 225.5],
      broadcast: [290, 158, 398.2, 214.9], flow: [171.3, 164.3, 275.5, 225.5],
      gt: [3.6, 164.3, 108, 225.5], supervision: [110, 166, 170, 190],
    };
    const steps = [
      { n: "", name: "Overview", text: "Assignments \\(A\\) feed both adaptive pooling and broadcasting. The lighter branch processes Image 2 separately with shared network weights, extracting its own features and predicting its own assignments. The assignment and token-flow panels enlarge the same moving-blade region. Pick a step to highlight it.", boxes: [] },
      { n: 1, name: "Dense features", text: "A shared backbone extracts dense features from each image.",
        boxes: ["images", "extract", "dense"] },
      { n: 2, name: "Soft assignments", text: "A compact head predicts how strongly each pixel belongs to the \\(3\\times3\\) token anchors around its cell. These weights form the assignment matrix \\(A\\): a row holds one pixel's weights, a column one token's support.",
        boxes: ["dense", "aLabel", "aPanel"] },
      { n: 3, name: "Token matching features", text: "Pooling with \\(P_q\\) averages dense features over each token's learned support. The pooled feature then queries nearby dense features through local attention, so a token can draw on broader context.",
        boxes: ["dense", "aPanel", "pool", "attn", "feat"] },
      { n: 4, name: "Matching and refinement", text: "WAFT's iterative matching and refinement framework estimates token flow \\(F_q\\) from the two images' token features. Each image's assignments are predicted once and reused across the \\(T\\) updates.",
        boxes: ["feat", "refine", "unitFlow"] },
      { n: 5, name: "Adaptive broadcasting", text: "Each pixel blends nearby token motions using its learned assignment weights: \\(F_x = P_x F_q\\).",
        boxes: ["unitFlow", "aPanel", "broadcast", "flow"] },
      { n: "", name: "Supervision", text: "The dashed link marks ground-truth flow supervision of both token predictions and assignments. Expand ‘How we supervise matching, assignments, and reconstruction’ below to see where each objective acts.",
        boxes: ["gt", "supervision", "flow"] },
    ];
    const { width: VW, height: VH } = svg.viewBox.baseVal;
    const defs = el("defs", {}, svg);
    const mask = el("mask", { id: "pipe-mask" }, defs);
    const dim = el("rect", { class: "dim", x: 0, y: 0, width: VW, height: VH, mask: "url(#pipe-mask)" }, svg);
    const hl = el("g", {}, svg);
    function show(i) {
      const st = steps[i];
      mask.textContent = "";
      hl.textContent = "";
      el("rect", { x: 0, y: 0, width: VW, height: VH, fill: "#fff" }, mask);
      st.boxes.map((k) => B[k]).forEach(([x0, y0, x1, y1]) => {
        el("rect", { x: x0 - 2, y: y0 - 2, width: x1 - x0 + 4, height: y1 - y0 + 4, rx: 5, fill: "#000" }, mask);
        el("rect", { x: x0 - 2, y: y0 - 2, width: x1 - x0 + 4, height: y1 - y0 + 4, rx: 5, class: "hl" }, hl);
      });
      dim.style.opacity = st.boxes.length ? 1 : 0;
      out.innerHTML = (st.n ? `<span class="step-n">${st.n}</span>` : "") + `<span class="step-name">${st.name}.</span> ${st.text}`;
      if (window.renderMathInElement) window.renderMathInElement(out, { delimiters: [{ left: "\\(", right: "\\)", display: false }], throwOnError: false });
      $$("[data-step]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.step === i)));
    }
    $$("[data-step]").forEach((b) => b.addEventListener("click", () => show(+b.dataset.step)));
    show(0);
    window.addEventListener("load", () => show(+($("[data-step][aria-pressed='true']") || { dataset: { step: 0 } }).dataset.step));
  })();

  /* ------------------------------------------- controlled comparisons */
  (function controls() {
    const root = $("#fig-controls");
    if (!root) return;
    const title = $("#ctl-title", root);
    $$("[data-ctl]", root).forEach((b) => b.addEventListener("click", () => {
      $$("[data-ctl]", root).forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      $$(".ctl-panel", root).forEach((p) => {
        p.hidden = p.dataset.panel !== b.dataset.ctl;
        if (!p.hidden) title.textContent = p.dataset.title;
      });
    }));
  })();

  /* --------------------------------------------- assignment explorer */
  (function assignments() {
    const svg = $("#assign-svg");
    if (!svg) return;
    const L = 120, O = 210;
    const st = { mx: 0.25, my: -0.15, spread: 0.75, elong: 1, rot: 0 };
    const offs = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) offs.push([dx, dy]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      el("rect", { class: "cell" + (r === 1 && c === 1 ? " center" : ""), x: O - 1.5 * L + c * L + 3, y: O - 1.5 * L + r * L + 3, width: L - 6, height: L - 6, rx: 8 }, svg);
    }
    const note = el("text", { x: O - 0.5 * L + 11, y: O - 0.5 * L + 20, class: "cell-note" }, svg);
    note.textContent = "pixel x's cell";
    const gLinks = el("g", {}, svg);
    const outer = el("ellipse", { class: "contour outer" }, svg), inner = el("ellipse", { class: "contour" }, svg);
    const bubbles = offs.map(() => el("circle", { class: "anchor-bubble" }, svg));
    offs.forEach(([dx, dy]) => el("circle", { class: "anchor-dot", cx: O + dx * L, cy: O + dy * L, r: 3 }, svg));
    const labels = offs.map(([dx, dy]) => el("text", { class: "pct", x: O + dx * L, y: O + dy * L + 46, "text-anchor": "middle" }, svg));
    const mu = el("circle", { class: "mu", r: 9 }, svg);
    const muLabel = el("text", { class: "mu-label" }, svg);
    muLabel.textContent = "\u03bc";
    el("tspan", { "baseline-shift": "sub", "font-size": "70%" }, muLabel).textContent = "x";

    const sl = { spread: $("#s-spread"), elong: $("#s-elong"), rot: $("#s-rot") };
    const vOut = { spread: $("#v-spread"), elong: $("#v-elong"), rot: $("#v-rot") };
    function update() {
      const s1 = st.spread * Math.sqrt(st.elong), s2 = st.spread / Math.sqrt(st.elong), th = (st.rot * Math.PI) / 180;
      const c = Math.cos(th), s = Math.sin(th);
      const g11 = (c * c) / (s1 * s1) + (s * s) / (s2 * s2);
      const g22 = (s * s) / (s1 * s1) + (c * c) / (s2 * s2);
      const g12 = c * s * (1 / (s1 * s1) - 1 / (s2 * s2));
      const a = offs.map(([dx, dy]) => { const ex = dx - st.mx, ey = dy - st.my; return -0.5 * (g11 * ex * ex + 2 * g12 * ex * ey + g22 * ey * ey); });
      const amax = Math.max(...a), e = a.map((v) => Math.exp(v - amax)), z = e.reduce((p, q) => p + q, 0), A = e.map((v) => v / z);
      const H = -A.reduce((p, q) => p + (q > 1e-12 ? q * Math.log(q) : 0), 0) / Math.log(9);
      const mx = O + st.mx * L, my = O + st.my * L;
      [[inner, 1], [outer, 2]].forEach(([n, k]) => {
        n.setAttribute("cx", mx); n.setAttribute("cy", my);
        n.setAttribute("rx", k * s1 * L); n.setAttribute("ry", k * s2 * L);
        n.setAttribute("transform", `rotate(${st.rot} ${mx} ${my})`);
      });
      gLinks.textContent = "";
      offs.forEach(([dx, dy], i) => {
        const ax = O + dx * L, ay = O + dy * L;
        if (A[i] > 0.004) el("line", { class: "link", x1: mx, y1: my, x2: ax, y2: ay, "stroke-width": 0.6 + 9 * A[i], "stroke-opacity": 0.15 + 0.6 * A[i] }, gLinks);
        bubbles[i].setAttribute("cx", ax); bubbles[i].setAttribute("cy", ay);
        bubbles[i].setAttribute("r", 4 + 30 * Math.sqrt(A[i]));
        bubbles[i].setAttribute("fill-opacity", 0.18 + 0.6 * A[i]);
        labels[i].textContent = A[i] >= 0.995 ? "100%" : A[i] < 0.005 ? "0%" : (100 * A[i]).toFixed(A[i] < 0.1 ? 1 : 0) + "%";
        labels[i].setAttribute("opacity", A[i] < 0.005 ? 0.35 : 1);
      });
      mu.setAttribute("cx", mx); mu.setAttribute("cy", my);
      muLabel.setAttribute("x", mx + 12); muLabel.setAttribute("y", my - 10);
      vOut.spread.textContent = st.spread.toFixed(2);
      vOut.elong.textContent = st.elong.toFixed(1) + "\u00d7";
      vOut.rot.textContent = Math.round(st.rot) + "\u00b0";
      $("#v-entropy").textContent = H.toFixed(2);
      $("#entropy-mark").style.left = (H * 100).toFixed(1) + "%";
      let msg;
      if (H < 0.15) msg = "<b>Concentrated.</b> The pixel puts most of its weight on one token, as near a motion boundary.";
      else if (H > 0.6) msg = "<b>Broad.</b> Several tokens share the pixel\u2019s weight, as inside a coherent region.";
      else msg = "<b>In between.</b> A few nearby tokens share the pixel.";
      if (st.elong > 2) msg += " Elongation spreads its weight along one direction.";
      $("#assign-msg").innerHTML = msg;
    }
    Object.keys(sl).forEach((k) => sl[k].addEventListener("input", () => {
      st[k] = parseFloat(sl[k].value);
      $$("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      update();
    }));
    let drag = false;
    const toLattice = (ev) => {
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      st.mx = Math.max(-1.45, Math.min(1.45, (p.x - O) / L));
      st.my = Math.max(-1.45, Math.min(1.45, (p.y - O) / L));
      $$("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      update();
    };
    svg.addEventListener("pointerdown", (ev) => { drag = true; svg.setPointerCapture(ev.pointerId); toLattice(ev); });
    svg.addEventListener("pointermove", (ev) => { if (drag) toLattice(ev); });
    svg.addEventListener("pointerup", () => { drag = false; });
    svg.addEventListener("pointercancel", () => { drag = false; });
    const presets = {
      interior: { mx: 0.1, my: -0.05, spread: 1.0, elong: 1, rot: 0 },
      boundary: { mx: 0.92, my: 0.05, spread: 0.24, elong: 1, rot: 0 },
      edge: { mx: 0.05, my: 0.5, spread: 0.6, elong: 4, rot: 0 },
    };
    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      Object.assign(st, presets[b.dataset.preset]);
      sl.spread.value = st.spread; sl.elong.value = st.elong; sl.rot.value = st.rot;
      $$("[data-preset]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      update();
    }));
    update();
  })();

  /* --------------------------------------------------- crop connectors */
  // As in the paper: lines join a locator box to corners of its enlargement, plain between panels,
  // lighter with a darker casing over the panel they cross, and broken around the label they pass.
  (function connectors() {
    const COLOR = { context: ["#EDBC32", "#7A5A0E"], detail: ["#56B4E9", "#1D5A85"] };
    const PT = 2.4 / 1.4;  // CSS px per paper pt, the scale of the panels' painted marks
    let uid = 0;
    function draw(root) {
      const R = root.getBoundingClientRect();
      if (!R.width) return;
      const rel = (r) => ({ x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height });
      const panel = (n) => $(`[data-panel="${n}"]`, root);
      const at = (r, c) => [r.x + (c[1] === "e" ? r.w : 0), r.y + (c[0] === "s" ? r.h : 0)];
      const rect = (r, attrs, parent) => el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, ...attrs }, parent);
      const svg = $(":scope > .connectors", root) || el("svg", { class: "connectors", "aria-hidden": "true" }, root);
      svg.textContent = "";
      const defs = el("defs", {}, svg);
      JSON.parse(root.dataset.connectors).forEach((s) => {
        const src = rel($("img", panel(s.from)).getBoundingClientRect());
        const dst = rel($("img", panel(s.to)).getBoundingClientRect());
        const [l, t, r, b] = s.box;
        const box = { x: src.x + l * src.w, y: src.y + t * src.h, w: (r - l) * src.w, h: (b - t) * src.h };
        const d = s.fc.map((c, i) => `M${at(box, c)}L${at(dst, s.tc[i])}`).join("");
        const id = `cx${++uid}`;
        const mask = el("mask", { id: `${id}m`, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: R.width, height: R.height }, defs);
        rect({ x: 0, y: 0, w: R.width, h: R.height }, { fill: "#fff" }, mask);
        rect(src, { fill: "#000" }, mask);
        if (s.knock) {
          const range = document.createRange();
          range.selectNodeContents($("figcaption", panel(s.knock)));
          const k = rel(range.getBoundingClientRect());
          rect({ x: k.x - 0.9 * PT, y: k.y - 0.3 * PT, w: k.w + 1.8 * PT, h: k.h + 0.6 * PT }, { fill: "#000" }, mask);
        }
        rect(src, {}, el("clipPath", { id: `${id}c` }, defs));
        const [core, edge] = COLOR[s.c];
        el("path", { d, stroke: core, "stroke-width": 0.5 * PT, mask: `url(#${id}m)` }, svg);
        const cased = el("g", { "clip-path": `url(#${id}c)` }, svg);
        el("path", { d, stroke: edge, "stroke-width": 1.1 * PT, opacity: 0.45 }, cased);
        el("path", { d, stroke: core, "stroke-width": 0.5 * PT, opacity: 0.75 }, cased);
      });
    }
    $$("[data-connectors]").forEach((root) => {
      const redraw = () => draw(root);
      new ResizeObserver(redraw).observe(root);
      $$("img", root).forEach((img) => img.addEventListener("load", redraw));
      redraw();
    });
  })();

  /* ------------------------------------------------------------ gallery */
  (function gallery() {
    const root = $("#gallery");
    if (!root) return;
    const EX = [
      { id: "sintel-ambush2", ds: "Sintel", name: "ambush 2", title: "An occluded cape", w: 1024, h: 436,
        caption: "Much of the cape is hidden in Image\u00a02, so it has no visible match. FATE recovers its motion; WAFT gives it the wrong motion." },
      { id: "sintel-ambush5", ds: "Sintel", name: "ambush 5", title: "Blurred hair", w: 1024, h: 436, at: 22,
        caption: "Motion blur obscures the moving hair. FATE recovers its motion; WAFT gives it the wrong direction." },
      { id: "kitti-45", ds: "KITTI", name: "000045", title: "A vehicle leaving the image", w: 1242, h: 375, at: 86, tokens: true,
        caption: "Part of the vehicle has left the image in Image\u00a02. FATE better separates its motion from the surrounding road." },
      { id: "kitti-182", ds: "KITTI", name: "000182", title: "An approaching vehicle", w: 1241, h: 376, at: 22,
        caption: "FATE better separates the approaching vehicle\u2019s motion from the road; WAFT spreads it into the road at the bottom left." },
      { id: "sintel-cave2", ds: "Sintel", name: "cave 2", title: "A wing behind crossing limbs", w: 1024, h: 436, tokens: true,
        caption: "WAFT assigns incorrect motion to the wing behind the crossing limbs; FATE recovers the wing\u2019s motion." },
      { id: "sintel-ambush4", ds: "Sintel", name: "ambush 4", title: "A broad sleeve", w: 1024, h: 436, tokens: true,
        caption: "The sleeve moves differently across its extent. FATE recovers this spatially varying motion; WAFT gives much of it the wrong motion." },
    ];
    const minis = $$(".mini", root), thumbs = $(".thumbs", root);
    const cmpRoot = $("#gallery-compare"), cmp = Compare(cmpRoot);
    const viewToggle = $("#gallery-views");
    const src = (ex, layer) => `${IMG}examples/${ex.id}/${layer}.webp`;
    let cur = EX.find((ex) => ex.id === root.dataset.initial) || EX[0], view = "flow";

    EX.forEach((ex) => {
      const b = document.createElement("button");
      b.className = "thumb"; b.type = "button";
      b.innerHTML = `<img src="${src(ex, "thumb")}" alt="" width="360" height="${Math.round((360 * ex.h) / ex.w)}"><span><b>${ex.ds}</b>${ex.title}</span>`;
      b.addEventListener("click", () => { cur = ex; render(); });
      thumbs.appendChild(b);
      if (ex.tokens) { const i = new Image(); i.src = src(ex, "tokens"); }
    });
    $$("[data-gallery-view]", viewToggle).forEach((b) => b.addEventListener("click", () => {
      view = b.dataset.galleryView;
      render();
    }));

    /* Hovering any view marks the same image position in all of them. */
    const views = minis.map((m) => $(".mini-img", m)).concat([cmpRoot]);
    const unmark = () => root.classList.remove("marking");
    views.forEach((v) => {
      v.addEventListener("pointermove", (ev) => {
        if (!canHover || ev.pointerType !== "mouse") return;
        const r = v.getBoundingClientRect();
        const fx = (ev.clientX - r.left) / r.width, fy = (ev.clientY - r.top) / r.height;
        if (fx < 0 || fy < 0 || fx > 1 || fy > 1) { unmark(); return; }
        root.style.setProperty("--fx", fx * 100 + "%");
        root.style.setProperty("--fy", fy * 100 + "%");
        views.forEach((o) => o.classList.toggle("here", o === v));
        root.classList.add("marking");
      });
      v.addEventListener("pointerleave", unmark);
    });

    function render() {
      $$(".thumb", thumbs).forEach((b, i) => b.setAttribute("aria-pressed", String(EX[i] === cur)));
      $("#ex-title").textContent = cur.title;
      $("#ex-meta").textContent = `${cur.ds} \u00b7 ${cur.name}`;
      $("#ex-caption").textContent = cur.caption;
      if (!cur.tokens && view === "tokens") view = "flow";
      viewToggle.hidden = !cur.tokens;
      $$("[data-gallery-view]", viewToggle).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.galleryView === view)));
      minis.forEach((m) => {
        const img = $("img", m);
        img.width = cur.w; img.height = cur.h;
        img.src = src(cur, m.dataset.layer);
      });
      const tokens = view === "tokens";
      cmpRoot.classList.toggle("tokens", tokens);
      const hint = tokens ? "Drag to compare the image and the token map." : "Drag to compare WAFT and FATE.";
      $("#gallery-hint").textContent = hint;
      $(".divider", cmpRoot).setAttribute("aria-label", hint.replace(/\.$/, ""));
      cmp.set({
        left: tokens ? { src: src(cur, "image1"), label: "Image 1" } : { src: src(cur, "waft"), label: "WAFT" },
        right: tokens ? { src: src(cur, "tokens"), label: "Token map" } : { src: src(cur, "fate"), label: "FATE (ours)" },
        w: cur.w, h: cur.h, at: cur.at ?? 50,
      });
    }
    render();
  })();

  $$('a[href="#flow-colors"]').forEach((a) => a.addEventListener("click", () => { $("#flow-colors").open = true; }));

  /* -------------------------------------------------------- color wheel */
  (function wheel() {
    const cv = $("#colorwheel");
    if (!cv) return;
    const n = 132, dpr = Math.min(2, window.devicePixelRatio || 1), N = Math.round(n * dpr);
    cv.width = N; cv.height = N;
    const ctx = cv.getContext("2d"), im = ctx.createImageData(N, N);
    const RY = 15, YG = 6, GC = 4, CB = 11, BM = 13, MR = 6, cw = [];
    for (let i = 0; i < RY; i++) cw.push([1, i / RY, 0]);
    for (let i = 0; i < YG; i++) cw.push([1 - i / YG, 1, 0]);
    for (let i = 0; i < GC; i++) cw.push([0, 1, i / GC]);
    for (let i = 0; i < CB; i++) cw.push([0, 1 - i / CB, 1]);
    for (let i = 0; i < BM; i++) cw.push([i / BM, 0, 1]);
    for (let i = 0; i < MR; i++) cw.push([1, 0, 1 - i / MR]);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const u = (px + 0.5) / N * 2 - 1, v = (py + 0.5) / N * 2 - 1, r = Math.hypot(u, v), o = (py * N + px) * 4;
      if (r > 1) { im.data[o + 3] = 0; continue; }
      const a = Math.atan2(-v, -u) / Math.PI, fk = ((a + 1) / 2) * (cw.length - 1);
      const k0 = Math.floor(fk), k1 = (k0 + 1) % cw.length, t = fk - k0;
      for (let ch = 0; ch < 3; ch++) {
        const c = (1 - t) * cw[k0][ch] + t * cw[k1][ch];
        im.data[o + ch] = Math.round(255 * (1 - r * (1 - c)));
      }
      im.data[o + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
  })();

  /* ------------------------------------------------------------- bibtex */
  (function bib() {
    const btn = $("#copy-bib");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const t = $("#bibtex").innerText;
      try { await navigator.clipboard.writeText(t); } catch (e) {
        const r = document.createRange(); r.selectNodeContents($("#bibtex"));
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand("copy"); s.removeAllRanges();
      }
      btn.textContent = "Copied"; btn.classList.add("done");
      setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
    });
  })();
})();
