# swarm-graph

Draws the Pirate Face swarm pyramid: where peers were found (tracker, DHT
closeness bands), what they have (peer states) and which kinds of models they
share (categories). Input is the payload of the Pirate Face swarm API,
`GET /api/v1/simple`; the payload carries positions, labels, colors and the
legend, so this package only draws.

## Use

With a bundler (ES modules, browser only):

```js
import { renderSwarmGraph, legendHtml } from "swarm-graph";

const view = await (await fetch(`${PEER_MAP_API}/api/v1/simple`)).json();
const graph = renderSwarmGraph(document.getElementById("graph"), view, { onGroupClick: console.log });
document.getElementById("legend").innerHTML = legendHtml(view);
// later: graph.update(newView); graph.fit(); graph.destroy();
```

Without a bundler, import the prebuilt file (force-graph included):

```html
<script type="module">
  import { renderSwarmGraph } from "./dist/swarm-graph.js";
</script>
```

In React, call `renderSwarmGraph` in a `useEffect` on a ref and `destroy()` in
its cleanup. It touches `window`, so with Next.js render it client-side only
(`"use client"` plus a dynamic import with `ssr: false`).

Options (all optional):

| Option | Default |
|---|---|
| `background`, `textColor` | `#0f172a`, `#e2e8f0` |
| `font`, `fontSize`, `fitPadding` | `system-ui, sans-serif`, `12`, `60` |
| `label(group)` | `group.label`; use it to translate |
| `groupColor(group)`, `flowColor(flow)` | the payload's colors; use them to match a site theme |
| `tooltip(group)` | label, detail lines, busiest models; build HTML with the exported `escapeHtml` |
| `onGroupClick(group)` | none |

`graph.setOptions({...})` changes options later, e.g. colors after a light/dark
switch. The container sets the size; the graph follows it when it resizes.

## Data (version 1)

Full JSDoc in `src/types.mjs`.

```jsonc
{
  "version": 1,
  "generatedAt": "2026-11-04T17:47:26.397Z",
  "hours": 24,                                   // time window of the counts
  "totals": { "models": 12606, "peers": 13220, "categories": 17 },
  "groups": [                                     // one dot each, pinned at (x, y)
    { "id": "s:seeder", "kind": "peer-state", "label": "Seeders", "x": -190, "y": 360,
      "color": "#22c55e", "details": { "lines": ["Has every piece of the model."] } },
    { "id": "c:Qwen", "kind": "category", "label": "Qwen", "x": -560, "y": 495, "color": "#a855f7",
      "details": { "lines": ["35 seeders (30 tracker, 5 both)"], "topModels": ["Qwen/Qwen3-8B"] } }
  ],
  "flows": [                                      // arrows; width grows with count
    { "from": "s:seeder", "to": "c:Qwen", "kind": "swarm", "count": 35, "color": "#a855f7aa" }
  ],
  "legend": [{ "color": "#22c55e", "label": "Seeders" }]
}
```

`kind` values: groups `tracker`, `dht-band`, `peer-state`, `category`; flows
`tracker`, `dht`, `swarm`. Text in labels and details is escaped before it is
shown.

## Develop

```sh
npm install
npm run build                       # dist/swarm-graph.js (commit it: plain pages use it)
python3 -m http.server 8096         # then open /demo/?api=<swarm API base URL>
```
