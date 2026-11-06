// The data swarm-graph draws: the Pirate Face swarm API's Simple-view payload
// (GET /api/v1/simple, version 1). JSDoc only.

/**
 * A labelled group, drawn as one dot at (x, y).
 * @typedef {object} Group
 * @property {string} id
 * @property {"tracker" | "dht-band" | "peer-state" | "category"} kind
 * @property {string} label
 * @property {number} x            graph units; the renderer fits the view to all groups
 * @property {number} y
 * @property {string} color        any CSS color
 * @property {GroupDetails} [details]  shown on hover
 */

/**
 * Hover details. Categories also carry `models` and structured `counts`, so a
 * client can localize or tabulate them instead of using the English `lines`.
 * @typedef {object} GroupDetails
 * @property {string[]} [lines]       English text lines
 * @property {string[]} [topModels]   busiest models (categories)
 * @property {number} [models]        models with peers (categories)
 * @property {{ state: string, peers: number, sources: { tracker: number, dht: number, both: number } }[]} [counts]
 *   peers per state, best state first (categories)
 */

/**
 * A flow of peers between two groups, drawn as an arrow; wider = more.
 * @typedef {object} Flow
 * @property {string} from         Group id
 * @property {string} to           Group id
 * @property {"tracker" | "dht" | "swarm"} kind
 * @property {number} count
 * @property {string} color
 */

/**
 * @typedef {object} SimpleView
 * @property {1} version
 * @property {string} generatedAt  ISO 8601
 * @property {number} hours        time window the counts cover
 * @property {{ models: number, peers: number, categories: number }} totals
 * @property {Group[]} groups
 * @property {Flow[]} flows
 * @property {{ color: string, label: string }[]} legend
 */

/**
 * @typedef {object} RenderOptions
 * @property {string} [background]   canvas color (default "#0f172a")
 * @property {string} [textColor]    label color (default "#e2e8f0")
 * @property {string} [font]         label font family (default "system-ui, sans-serif")
 * @property {number} [fontSize]     label size in px at zoom 1 (default 12)
 * @property {number} [fitPadding]   px around the groups when fitting (default 60)
 * @property {number} [labelAngle]   slant of category labels in degrees (default 45)
 * @property {(group: Group) => boolean} [marked]  groups that keep `markText` above their dot
 * @property {string} [markText]     text above marked groups (default "You")
 * @property {(group: Group) => string} [label]       label text (e.g. translated); default group.label
 * @property {(group: Group) => string} [groupColor]  dot color; default group.color
 * @property {(group: Group) => number} [size]        dot area (radius grows with its square root); default 6, tracker 8
 * @property {number} [hoverFade]                    opacity of everything else while hovering a group; default 0.15
 * @property {number} [fitZoom]                      scale after fitting; default 0.8 leaves room for slanted labels
 * @property {boolean} [locked]                       no zoom, pan or drag; hover still works and the page scrolls past
 * @property {(flow: Flow) => string} [flowColor]     line color; default flow.color
 * @property {(flow: Flow) => [string, string] | undefined} [flowGradient]  from and to colors for a two-color line, drawn without an arrow
 * @property {(group: Group) => string} [tooltip]     tooltip HTML; escape text with escapeHtml()
 * @property {(flow: Flow) => string} [flowLabel]     flow hover text; default its count, "" shows none
 * @property {(group: Group) => void} [onGroupClick]
 */

export {};
