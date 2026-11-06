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
  fitPadding: 60,
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

// Category labels slant down under the bottom row so all of them fit side by side.
function drawLabel(group, label, ctx, scale, opts, radius) {
  ctx.font = `${opts.fontSize / scale}px ${opts.font}`;
  ctx.fillStyle = opts.textColor;
  if (group.kind === "category") {
    ctx.save();
    ctx.translate(group.x, group.y + radius + 3 / scale);
    ctx.rotate(Math.PI / 4);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, group.x, group.y + radius + 2 / scale);
  }
}

// force-graph input: groups pinned at the payload's positions, flows as links.
const toGraphData = (/** @type {SimpleView} */ view) => ({
  nodes: view.groups.map((g) => ({ ...g, fx: g.x, fy: g.y })),
  links: view.flows.map((f) => ({ ...f, source: f.from, target: f.to })),
});

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
  const flowWidth = (f) => 1 + Math.log2(f.count);
  const tooltipOf = (g) => opts.tooltip?.(g) ?? defaultTooltip(g, labelOf(g));
  // Dot area (force-graph's nodeVal). Default: all equal, so totals don't mislead.
  const size = (g) => opts.size?.(g) ?? (g.kind === "tracker" ? 8 : 6);
  const radius = (g) => Math.sqrt(size(g)) * 4 + 1; // force-graph draws r = sqrt(val) * 4

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
    graph.centerAt(c.x + 40 / graph.zoom(), c.y + 60 / graph.zoom(), 400);
    graph.zoom(graph.zoom() * 0.8, 400);
  };

  const graph = ForceGraph()(element)
    .backgroundColor(opts.background)
    .nodeVal(size)
    .nodeColor(colorOf)
    .nodeLabel(tooltipOf)
    .nodeCanvasObjectMode(() => "after")
    .nodeCanvasObject((g, ctx, scale) => { drawLabel(g, labelOf(g), ctx, scale, opts, radius(g)); drawPulse(g, ctx, scale); })
    .nodeVisibility((g) => !focus || focus.has(g.id))
    .linkVisibility((l) => !focus || (focus.has(l.source.id) && focus.has(l.target.id)))
    .onNodeHover((g) => { focus = g ? neighbors(g) : null; })
    .onNodeClick((g) => opts.onGroupClick?.(g))
    .linkColor(flowColorOf)
    .linkWidth(flowWidth)
    .linkCanvasObjectMode((l) => (opts.flowGradient?.(l) ? "replace" : undefined))
    .linkCanvasObject((l, ctx, scale) => {
      if (!Number.isFinite(l.source.x) || !Number.isFinite(l.target.x)) return; // not laid out yet
      const [from, to] = opts.flowGradient(l);
      const gradient = ctx.createLinearGradient(l.source.x, l.source.y, l.target.x, l.target.y);
      gradient.addColorStop(0, from);
      gradient.addColorStop(1, to);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = flowWidth(l) / scale;
      ctx.beginPath();
      ctx.moveTo(l.source.x, l.source.y);
      ctx.lineTo(l.target.x, l.target.y);
      ctx.stroke();
    })
    .linkLabel((l) => (opts.flowLabel ? opts.flowLabel(l) : `${l.count}`))
    .linkDirectionalArrowLength(3)
    .linkDirectionalArrowRelPos(1)
    .autoPauseRedraw(false) // redraw on hover; nothing moves, so this is cheap
    .cooldownTicks(0) // positions come from the payload: no simulation
    .onEngineStop(() => { if (pendingFit) { pendingFit = false; fit(); } });

  graph.graphData(toGraphData(view));

  const resize = new ResizeObserver(() => graph.width(element.clientWidth).height(element.clientHeight));
  resize.observe(element);

  return {
    /** Replace the data (e.g. after polling the API again). Positions are stable, so nothing jumps. */
    update(/** @type {SimpleView} */ next) {
      graph.graphData(toGraphData(next));
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
