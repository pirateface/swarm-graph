/**
 * @param {HTMLElement} element  container; the graph fills it
 * @param {SimpleView} view      payload from /api/v1/simple
 * @param {RenderOptions} [options]
 */
export function renderSwarmGraph(element: HTMLElement, view: SimpleView, options?: RenderOptions): {
    /** Replace the data (e.g. after polling the API again). Positions are stable, so nothing jumps. */
    update(next: SimpleView): void;
    /**
     * Light up a group for a moment: a fading ring, plus `text` (e.g. "+2") rising above it; `color` defaults to the group's.
     * @param {string} id
     * @param {string} [text]
     * @param {string} [color]
     */
    pulse(id: string, text?: string, color?: string): void;
    /** Change options (e.g. colors after a light/dark theme switch); unchanged ones are kept. */
    setOptions(next: RenderOptions): void;
    /** Re-fit the view to the container. */
    fit: () => void;
    /** Remove the graph and its listeners. */
    destroy(): void;
};
/** HTML for a legend (swatches + labels) from the payload. */
export function legendHtml(view: SimpleView): string;
export function escapeHtml(text: any): string;
export type SimpleView = import("./types.mjs").SimpleView;
export type RenderOptions = import("./types.mjs").RenderOptions;
