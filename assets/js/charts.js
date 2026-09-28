// Small hand-built SVG charts (no library). Single accent colour; ink for text.

const NS = "http://www.w3.org/2000/svg";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * Line chart of one 0–10 measure across sessions.
 * points: [{ x: sessionNumber, y: value|null, label }]
 */
export function lineChart(host, points, { height = 200, yLabel = "" } = {}) {
  const W = Math.max(280, host.clientWidth || 320), H = height;
  const pad = { l: 28, r: 12, t: 12, b: 26 };
  const n = Math.max(points.length, 2);
  const xs = (i) => pad.l + (i * (W - pad.l - pad.r)) / (n - 1);
  const ys = (v) => pad.t + (1 - v / 10) * (H - pad.t - pad.b);
  const valid = points.map((p, i) => ({ ...p, i })).filter((p) => typeof p.y === "number");

  let grid = "";
  for (const v of [0, 5, 10]) {
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${ys(v)}" y2="${ys(v)}" class="c-grid"/>`;
    grid += `<text x="${pad.l - 8}" y="${ys(v) + 4}" class="c-tick" text-anchor="end">${v}</text>`;
  }
  let xt = "";
  const step = n > 14 ? Math.ceil(n / 7) : n > 8 ? 2 : 1;
  points.forEach((p, i) => {
    if (i % step === 0 || i === points.length - 1) xt += `<text x="${xs(i)}" y="${H - 6}" class="c-tick" text-anchor="middle">${p.x}</text>`;
  });

  // break the line where a value is missing
  let path = "", pen = false;
  points.forEach((p, i) => {
    if (typeof p.y !== "number") { pen = false; return; }
    path += `${pen ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.y).toFixed(1)}`;
    pen = true;
  });
  const area = valid.length > 1
    ? `M${xs(valid[0].i)},${ys(0)} ` + valid.map((p) => `L${xs(p.i).toFixed(1)},${ys(p.y).toFixed(1)}`).join(" ") + ` L${xs(valid.at(-1).i)},${ys(0)} Z`
    : "";
  const dots = valid.map((p) => `<circle cx="${xs(p.i)}" cy="${ys(p.y)}" r="4" class="c-dot"/>`).join("");

  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(yLabel)} by session">
      <defs><linearGradient id="cfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${grid}${xt}
      ${area ? `<path d="${area}" fill="url(#cfill)"/>` : ""}
      <path d="${path}" class="c-line"/>
      ${dots}
      <line class="c-cross" y1="${pad.t}" y2="${H - pad.b}" x1="0" x2="0" visibility="hidden"/>
      <circle class="c-hot" r="6" visibility="hidden"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" class="c-hit"/>
    </svg>
    <div class="c-tip" hidden></div>`;

  if (!valid.length) return;
  const svg = host.querySelector("svg"), tip = host.querySelector(".c-tip");
  const cross = svg.querySelector(".c-cross"), hot = svg.querySelector(".c-hot");
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    let best = valid[0];
    for (const p of valid) if (Math.abs(xs(p.i) - x) < Math.abs(xs(best.i) - x)) best = p;
    const cx = xs(best.i), cy = ys(best.y);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
    hot.setAttribute("cx", cx); hot.setAttribute("cy", cy); hot.setAttribute("visibility", "visible");
    tip.hidden = false;
    tip.innerHTML = `<b>${best.y}</b> <span>Session ${best.x}${best.label ? " · " + esc(best.label) : ""}</span>`;
    const px = (cx / W) * r.width;
    tip.style.left = Math.min(Math.max(px, 60), r.width - 60) + "px";
    tip.style.top = ((cy / H) * r.height - 12) + "px";
  };
  const leave = () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); hot.setAttribute("visibility", "hidden"); };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", leave);
}

/** Tiny trend line for the small-multiples grid. */
export function sparkline(values, { w = 120, h = 34 } = {}) {
  const v = values.map((x) => (typeof x === "number" ? x : null));
  const n = Math.max(v.length, 2);
  const xs = (i) => 3 + (i * (w - 6)) / (n - 1);
  const ys = (y) => 3 + (1 - y / 10) * (h - 6);
  let d = "", pen = false;
  v.forEach((y, i) => { if (y === null) { pen = false; return; } d += `${pen ? "L" : "M"}${xs(i).toFixed(1)},${ys(y).toFixed(1)}`; pen = true; });
  const lastI = v.map((y, i) => (y === null ? -1 : i)).filter((i) => i >= 0).at(-1);
  const end = lastI !== undefined ? `<circle cx="${xs(lastI)}" cy="${ys(v[lastI])}" r="3" class="c-dot"/>` : "";
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true" preserveAspectRatio="none"><line x1="0" x2="${w}" y1="${ys(5)}" y2="${ys(5)}" class="c-grid"/><path d="${d}" class="c-line thin" vector-effect="non-scaling-stroke"/>${end}</svg>`;
}

/**
 * Scatter: x = Alteration index (0–10), y = Confidence in interpretation (0–10).
 * pts: [{x, y, n}]
 */
export function scatter(host, pts, { size = 260 } = {}) {
  const W = Math.max(260, host.clientWidth || 300), H = size;
  const pad = { l: 34, r: 12, t: 12, b: 36 };
  const xs = (v) => pad.l + (v / 10) * (W - pad.l - pad.r);
  const ys = (v) => pad.t + (1 - v / 10) * (H - pad.t - pad.b);
  let g = "";
  for (const v of [0, 5, 10]) {
    g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${ys(v)}" y2="${ys(v)}" class="c-grid"/><text x="${pad.l - 8}" y="${ys(v) + 4}" class="c-tick" text-anchor="end">${v}</text>`;
    g += `<line y1="${pad.t}" y2="${H - pad.b}" x1="${xs(v)}" x2="${xs(v)}" class="c-grid"/><text x="${xs(v)}" y="${H - pad.b + 16}" class="c-tick" text-anchor="middle">${v}</text>`;
  }
  // diagonal: certainty rising exactly as fast as alteration
  g += `<line x1="${xs(0)}" y1="${ys(0)}" x2="${xs(10)}" y2="${ys(10)}" class="c-diag"/>`;
  const dots = pts.map((p, i) => `<circle cx="${xs(p.x)}" cy="${ys(p.y)}" r="6" class="c-dot ring" data-i="${i}"/>`).join("");
  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Confidence in interpretation versus alteration index">
      ${g}
      <text x="${W - pad.r}" y="${H - 4}" class="c-axis" text-anchor="end">Alteration index →</text>
      <text x="${pad.l + 4}" y="${pad.t + 12}" class="c-axis">↑ Confidence in interpretation</text>
      ${dots}
    </svg><div class="c-tip" hidden></div>`;
  const tip = host.querySelector(".c-tip"), svg = host.querySelector("svg");
  svg.querySelectorAll("circle[data-i]").forEach((c) => {
    const show = () => {
      const p = pts[+c.dataset.i];
      const r = svg.getBoundingClientRect();
      tip.hidden = false;
      tip.innerHTML = `<b>Session ${p.n}</b> <span>alteration ${p.x.toFixed(1)} · confidence ${p.y}</span>`;
      tip.style.left = Math.min(Math.max((xs(p.x) / W) * r.width, 80), r.width - 80) + "px";
      tip.style.top = ((ys(p.y) / H) * r.height - 14) + "px";
    };
    c.addEventListener("pointerenter", show);
    c.addEventListener("pointerdown", show);
    c.addEventListener("pointerleave", () => (tip.hidden = true));
  });
}

/** Pearson correlation, or null if not enough data. */
export function correlation(pairs) {
  const p = pairs.filter(([a, b]) => typeof a === "number" && typeof b === "number");
  if (p.length < 4) return null;
  const mx = p.reduce((s, [a]) => s + a, 0) / p.length;
  const my = p.reduce((s, [, b]) => s + b, 0) / p.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [a, b] of p) { sxy += (a - mx) * (b - my); sxx += (a - mx) ** 2; syy += (b - my) ** 2; }
  if (!sxx || !syy) return null;
  return sxy / Math.sqrt(sxx * syy);
}
