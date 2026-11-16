/**
 * A labelled group, drawn as one dot at (x, y).
 */
export type Group = {
    id: string;
    kind: "tracker" | "dht-band" | "peer-state" | "category";
    label: string;
    /**
     * graph units; the renderer fits the view to all groups
     */
    x: number;
    y: number;
    /**
     * any CSS color
     */
    color: string;
    /**
     * shown on hover
     */
    details?: GroupDetails;
};
/**
 * Hover details. Categories also carry `models` and structured `counts`, so a
 * client can localize or tabulate them instead of using the English `lines`.
 */
export type GroupDetails = {
    /**
     * English text lines
     */
    lines?: string[];
    /**
     * busiest models (categories)
     */
    topModels?: string[];
    /**
     * models with peers (categories)
     */
    models?: number;
    /**
     * peers per state, best state first (categories)
     */
    counts?: {
        state: string;
        peers: number;
        sources: {
            tracker: number;
            dht: number;
            both: number;
        };
    }[];
};
/**
 * A flow of peers between two groups, drawn as an arrow; wider = more.
 */
export type Flow = {
    /**
     * Group id
     */
    from: string;
    /**
     * Group id
     */
    to: string;
    kind: "tracker" | "dht" | "swarm";
    count: number;
    color: string;
};
export type SimpleView = {
    version: 1;
    /**
     * ISO 8601
     */
    generatedAt: string;
    /**
     * time window the counts cover
     */
    hours: number;
    totals: {
        models: number;
        peers: number;
        categories: number;
    };
    groups: Group[];
    flows: Flow[];
    legend: {
        color: string;
        label: string;
    }[];
};
export type RenderOptions = {
    /**
     * canvas color (default "#0f172a")
     */
    background?: string;
    /**
     * label color (default "#e2e8f0")
     */
    textColor?: string;
    /**
     * label font family (default "system-ui, sans-serif")
     */
    font?: string;
    /**
     * label size in px at zoom 1 (default 12)
     */
    fontSize?: number;
    /**
     * px between the drawing, labels included, and the container edge when fitting (default 60)
     */
    fitPadding?: number;
    /**
     * slant of category labels in degrees (default 45)
     */
    labelAngle?: number;
    /**
     * groups that keep `markText` above their dot
     */
    marked?: (group: Group) => boolean;
    /**
     * text above marked groups (default "You")
     */
    markText?: string;
    /**
     * label text (e.g. translated); default group.label
     */
    label?: (group: Group) => string;
    /**
     * dot color; default group.color
     */
    groupColor?: (group: Group) => string;
    /**
     * dot area (radius grows with its square root); default 6, tracker 8
     */
    size?: (group: Group) => number;
    /**
     * opacity of everything else while hovering a group; default 0.15
     */
    hoverFade?: number;
    /**
     * no zoom, pan or drag; hover still works and the page scrolls past
     */
    locked?: boolean;
    /**
     * line color; default flow.color
     */
    flowColor?: (flow: Flow) => string;
    /**
     * from and to colors for a two-color line, drawn without an arrow
     */
    flowGradient?: (flow: Flow) => [string, string] | undefined;
    /**
     * tooltip HTML; escape text with escapeHtml()
     */
    tooltip?: (group: Group) => string;
    /**
     * flow hover text; default its count, "" shows none
     */
    flowLabel?: (flow: Flow) => string;
    onGroupClick?: (group: Group) => void;
    /**
     * line width in screen px; default 1 + log2(count). Set (or flowCurve) = no arrowheads
     */
    flowWidth?: (flow: Flow) => number;
    /**
     * bow of each line as a fraction of its length, away from the graph's vertical centre line; default 0 (straight)
     */
    flowCurve?: number;
    /**
     * "ring": 10% fill and a 1.5 px edge in groupStroke; default "dot"
     */
    nodeStyle?: "dot" | "ring";
    /**
     * ring edge color; default the dot color
     */
    groupStroke?: (group: Group) => string;
    /**
     * color of a box just behind each label, so lines don't cut through text; default none
     */
    labelHalo?: string;
    /**
     * DHT bands as ticks on one vertical bar, labels on the left; band-to-band flows not drawn
     */
    bandBar?: boolean;
};
