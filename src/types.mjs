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
 * @property {{ lines?: string[], topModels?: string[] }} [details]  shown on hover
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
 * @property {(group: Group) => void} [onGroupClick]
 */

export {};
