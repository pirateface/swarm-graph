// swarm-graph: draws the Pirate Face swarm pyramid from the swarm API's
// Simple-view payload (GET /api/v1/simple). The payload carries positions,
// labels, colors and the legend, so this module only draws; see README.md for
// the format.
//
//   import { renderSwarmGraph } from "swarm-graph";
//   const graph = renderSwarmGraph(element, payload);
//   graph.update(newPayload);  // later
//   graph.destroy();
//
// Browser only (needs a DOM and a canvas).

import ForceGraph from "force-graph";

/** @typedef {import("./types.mjs").SimpleView} SimpleView */
/** @typedef {import("./types.mjs").RenderOptions} RenderOptions */

const DEFAULTS = {
  background: "#0f172a",
  textColor: "#e2e8f0",
  font: "system-ui, sans-serif",
  fontSize: 12,
  fitZoom: 0.8,
  hoverFade: 0.15,
  fitPadding: 60,
  labelAngle: 45,
  markText: "You",
};

/** Escape text for use in tooltip HTML (for custom `tooltip` options too). */
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Default tooltip: the group's label, its detail lines and, for categories, the busiest models.
function defaultTooltip(group, label) {
  const { lines = [], topModels = [] } = group.details ?? {};
  return [
    `<b>${escapeHtml(label)}</b>`,
    ...lines.map(escapeHtml),
    ...(topModels.length ? ["", "Busiest models:", ...topModels.map(escapeHtml)] : []),
  ].join("<br>");
}

// Text, with a box in `labelHalo` just around the glyphs so lines don't cut through it.
function text(ctx, value, x, y, opts, scale) {
  if (opts.labelHalo) {
    const m = ctx.measureText(value);
    const pad = 2 / scale;
    ctx.save();
    ctx.fillStyle = opts.labelHalo;
    ctx.fillRect(x - m.actualBoundingBoxLeft - pad, y - m.actualBoundingBoxAscent - pad,
      m.actualBoundingBoxLeft + m.actualBoundingBoxRight + 2 * pad, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 2 * pad);
    ctx.restore();
  }
  ctx.fillText(value, x, y);
}

const isBand = (group, opts) => opts.bandBar && group.kind === "dht-band";

// Category labels slant down under the bottom row so all of them fit side by side.
// With bandBar, DHT band labels sit left of their tick.
function drawLabel(group, label, ctx, scale, opts, radius) {
  ctx.font = `${opts.fontSize / scale}px ${opts.font}`;
  ctx.fillStyle = opts.textColor;
  if (opts.marked?.(group)) {
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    text(ctx, opts.markText, group.x, group.y - radius - 3 / scale, opts, scale);
  }
  if (group.kind === "category") {
    ctx.save();
    ctx.translate(group.x, group.y + radius + 3 / scale);
    ctx.rotate((opts.labelAngle * Math.PI) / 180);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    text(ctx, label, 0, 0, opts, scale);
    ctx.restore();
  } else if (isBand(group, opts)) {
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    text(ctx, label, group.x - 9 / scale, group.y, opts, scale);
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    text(ctx, label, group.x, group.y + radius + 2 / scale, opts, scale);
  }
}

// force-graph input: groups pinned at the payload's positions, flows as links. With bandBar the
// band-to-band flows are left out: the bar stands for them. Nodes already drawn are updated in place
// and links point at node objects, so every frame between this call and force-graph's deferred
// update (a 1 ms debounce) still has positions and resolved links: an update never blanks the graph.
const toGraphData = (/** @type {SimpleView} */ view, opts, previous = []) => {
  const known = new Map(previous.map((n) => [n.id, n]));
  const nodes = view.groups.map((g) => Object.assign(known.get(g.id) ?? {}, g, { x: g.x, y: g.y, fx: g.x, fy: g.y }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes,
    links: view.flows
      .filter((f) => !(opts.bandBar && f.kind === "dht" && f.from.startsWith("b:") && f.to.startsWith("b:")))
      .map((f) => ({ ...f, source: byId.get(f.from) ?? f.from, target: byId.get(f.to) ?? f.to })),
  };
};

/**
 * @param {HTMLElement} element  container; the graph fills it
 * @param {SimpleView} view      payload from /api/v1/simple
 * @param {RenderOptions} [options]
 */
export function renderSwarmGraph(element, view, options = {}) {
  let opts = { ...DEFAULTS, ...options };
  // Hooks read `opts` at draw time, so setOptions() takes effect on the next frame.
  const labelOf = (g) => opts.label?.(g) ?? g.label;
  const colorOf = (g) => opts.groupColor?.(g) ?? g.color;
  const flowColorOf = (f) => opts.flowColor?.(f) ?? f.color;
  const flowWidth = (f) => opts.flowWidth?.(f) ?? 1 + Math.log2(f.count);
  // Custom widths or curves: every flow is drawn here (drawFlow), without arrows.
  const drawsFlows = () => Boolean(opts.flowWidth || opts.flowCurve);
  // While hovering, everything outside the hovered group's neighborhood stays visible but faint.
  const inFocus = (g) => !focus || focus.has(g.id);
  const flowInFocus = (l) => !focus || (focus.has(l.source.id) && focus.has(l.target.id));
  const scratch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const fadedColors = new Map();
  // Any CSS color with its alpha multiplied by `alpha` (cached).
  const withAlpha = (color, alpha) => {
    const key = `${color}|${alpha}`;
    if (!fadedColors.has(key)) {
      scratch.clearRect(0, 0, 1, 1);
      scratch.fillStyle = color;
      scratch.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = scratch.getImageData(0, 0, 1, 1).data;
      fadedColors.set(key, `rgba(${r}, ${g}, ${b}, ${(a / 255) * alpha})`);
    }
    return fadedColors.get(key);
  };
  const faded = (color) => withAlpha(color, opts.hoverFade);
  const tooltipOf = (g) => opts.tooltip?.(g) ?? defaultTooltip(g, labelOf(g));
  // Dot area (force-graph's nodeVal). Default: all equal, so totals don't mislead.
  const size = (g) => opts.size?.(g) ?? (g.kind === "tracker" ? 8 : 6);
  const radius = (g) => Math.sqrt(size(g)) * 4 + 1; // force-graph draws r = sqrt(val) * 4

  // flowCurve bows lines away from the vertical line through the middle of all groups.
  let centreX = 0;
  const setCentre = (/** @type {SimpleView} */ v) => {
    const xs = v.groups.map((g) => g.x);
    centreX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  };
  setCentre(view);

  // Pulses from pulse(): a fading ring and a rising text per group id.
  const PULSE_MS = 2500;
  const pulses = new Map();
  const drawPulse = (g, ctx, scale) => {
    const p = pulses.get(g.id);
    if (!p) return;
    const t = (performance.now() - p.start) / PULSE_MS;
    if (t >= 1) { pulses.delete(g.id); return; }
    const r = radius(g);
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = p.color ?? colorOf(g);
    ctx.lineWidth = 1 / scale;
    ctx.globalAlpha = 0.15 * (1 - t);
    ctx.beginPath();
    ctx.arc(g.x, g.y, r + 6 / scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.beginPath();
    ctx.arc(g.x, g.y, r + (3 + 8 * t) / scale, 0, 2 * Math.PI);
    ctx.stroke();
    if (p.text) {
      ctx.font = `${opts.fontSize / scale}px ${opts.font}`;
      ctx.fillStyle = opts.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(p.text, g.x, g.y - r - (4 + 8 * t) / scale);
    }
    ctx.restore();
  };

  // nodeStyle "ring": a low-alpha fill and a 1.5 px edge. With bandBar, DHT bands are 10 px ticks on
  // one vertical bar (drawn with the first band).
  const drawGroup = (g, ctx, scale) => {
    const color = colorOf(g);
    const edge = opts.groupStroke?.(g) ?? color;
    ctx.lineWidth = 1.5 / scale;
    if (isBand(g, opts)) {
      const bands = graph.graphData().nodes.filter((n) => n.kind === "dht-band");
      if (g.id === bands[0]?.id) {
        const ys = bands.map((n) => n.y);
        ctx.strokeStyle = withAlpha(edge, 0.55);
        ctx.beginPath();
        ctx.moveTo(g.x, Math.min(...ys));
        ctx.lineTo(g.x, Math.max(...ys));
        ctx.stroke();
      }
      ctx.strokeStyle = edge;
      ctx.beginPath();
      ctx.moveTo(g.x - 5 / scale, g.y);
      ctx.lineTo(g.x + 5 / scale, g.y);
      ctx.stroke();
      return;
    }
    if (opts.nodeStyle !== "ring") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(g.x, g.y, radius(g) - 1, 0, 2 * Math.PI);
      ctx.fill();
      return;
    }
    ctx.fillStyle = withAlpha(color, 0.1);
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.arc(g.x, g.y, Math.max(radius(g) - 0.75 / scale, 1 / scale), 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };
  const drawsGroups = () => opts.nodeStyle === "ring" || opts.bandBar;

  // A flow as a straight line or, with flowCurve, a quadratic curve bowing away from the centre
  // line; (nearly) vertical and horizontal flows stay straight. flowGradient colors it end to end.
  const drawFlow = (l, ctx, scale) => {
    if (!Number.isFinite(l.source.x) || !Number.isFinite(l.target.x)) return; // not laid out yet
    const { x: x0, y: y0 } = l.source;
    const { x: x1, y: y1 } = l.target;
    const gradient = opts.flowGradient?.(l);
    if (gradient) {
      const [from, to] = gradient.map((color) => (flowInFocus(l) ? color : faded(color)));
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, from);
      g.addColorStop(1, to);
      ctx.strokeStyle = g;
    } else {
      const color = flowColorOf(l);
      ctx.strokeStyle = flowInFocus(l) ? color : faded(color);
    }
    ctx.lineWidth = flowWidth(l) / scale;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const dx = x1 - x0, dy = y1 - y0;
    const bow = opts.flowCurve ?? 0;
    if (bow && Math.abs(dx) > 20 && Math.abs(dy) > 20) {
      const len = Math.hypot(dx, dy);
      let nx = -dy / len, ny = dx / len; // unit normal, turned away from the centre line
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (Math.sign(nx) !== Math.sign(mx - centreX || 1)) { nx = -nx; ny = -ny; }
      ctx.quadraticCurveTo(mx + nx * bow * len, my + ny * bow * len, x1, y1);
    } else {
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  };

  // Hovering a group shows only it and the groups it links to.
  let focus = null;
  let pendingFit = true; // fit once the first frame is laid out
  const neighbors = (group) => new Set([group.id, ...graph.graphData().links
    .filter((l) => l.source.id === group.id || l.target.id === group.id)
    .flatMap((l) => [l.source.id, l.target.id])]);

  const fit = () => {
    graph.zoomToFit(0, opts.fitPadding);
    // Slanted category labels hang below the bottom row: shift up and zoom out a little to show them.
    const c = graph.centerAt();
    graph.centerAt(c.x + 40 / graph.zoom(), c.y + 60 / graph.zoom());
    graph.zoom(graph.zoom() * opts.fitZoom);
  };

  const graph = ForceGraph()(element)
    .width(element.clientWidth) // before the first fit, which otherwise can use force-graph's window-sized default
    .height(element.clientHeight)
    .backgroundColor(opts.background)
    .enableZoomInteraction(!opts.locked)
    .enablePanInteraction(!opts.locked)
    .enableNodeDrag(!opts.locked)
    .nodeVal(size)
    .nodeColor((g) => (inFocus(g) ? colorOf(g) : faded(colorOf(g))))
    .nodeLabel(tooltipOf)
    .nodeCanvasObjectMode(() => (drawsGroups() ? "replace" : "after"))
    .nodeCanvasObject((g, ctx, scale) => {
      ctx.globalAlpha = inFocus(g) ? 1 : opts.hoverFade;
      if (drawsGroups()) drawGroup(g, ctx, scale);
      drawLabel(g, labelOf(g), ctx, scale, opts, isBand(g, opts) ? 0 : radius(g));
      ctx.globalAlpha = 1;
      drawPulse(g, ctx, scale);
    })
    .onNodeHover((g) => { focus = g ? neighbors(g) : null; })
    .onNodeClick((g) => opts.onGroupClick?.(g))
    .linkColor((l) => (flowInFocus(l) ? flowColorOf(l) : faded(flowColorOf(l))))
    .linkWidth(flowWidth)
    .linkCanvasObjectMode((l) => (drawsFlows() || opts.flowGradient?.(l) ? "replace" : undefined))
    .linkCanvasObject(drawFlow)
    .linkLabel((l) => (opts.flowLabel ? opts.flowLabel(l) : `${l.count}`))
    .linkDirectionalArrowLength(() => (drawsFlows() ? 0 : 3))
    .linkDirectionalArrowRelPos(1)
    .autoPauseRedraw(false) // redraw on hover; nothing moves, so this is cheap
    .cooldownTicks(0) // positions come from the payload: no simulation
    .onEngineStop(() => { if (pendingFit) { pendingFit = false; fit(); } });

  graph.graphData(toGraphData(view, opts));

  const resize = new ResizeObserver(() => graph.width(element.clientWidth).height(element.clientHeight));
  resize.observe(element);

  return {
    /** Replace the data (e.g. after polling the API again). Positions are stable, so nothing jumps. */
    update(/** @type {SimpleView} */ next) {
      setCentre(next);
      graph.graphData(toGraphData(next, opts, graph.graphData().nodes));
    },
    /** Light up a group for a moment: a fading ring, plus `text` (e.g. "+2") rising above it; `color` defaults to the group's. */
    pulse(/** @type {string} */ id, /** @type {string} */ text = "", /** @type {string | undefined} */ color) {
      pulses.set(id, { text, color, start: performance.now() });
    },
    /** Change options (e.g. colors after a light/dark theme switch); unchanged ones are kept. */
    setOptions(/** @type {RenderOptions} */ next) {
      opts = { ...opts, ...next };
      graph.backgroundColor(opts.background);
    },
    /** Re-fit the view to the container. */
    fit,
    /** Remove the graph and its listeners. */
    destroy() {
      resize.disconnect();
      graph._destructor?.();
      element.replaceChildren();
    },
  };
}

/** HTML for a legend (swatches + labels) from the payload. */
export function legendHtml(/** @type {SimpleView} */ view) {
  return view.legend
    .map((item) => `<span class="swarm-graph-legend-item"><span class="swarm-graph-swatch" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(item.label)}</span>`)
    .join(" ");
}
