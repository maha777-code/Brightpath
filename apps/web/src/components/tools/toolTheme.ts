/**
 * Shared look for every AI tool, taken from the Presentation Generator form.
 * Colours for both themes live in color-theme.css under the mv-pres-* classes.
 */

/** Outermost wrapper of a tool page. */
export const TOOL_PAGE = 'mv-presentation mv-tool-skin min-h-[780px] w-full px-4 py-8 md:px-8';

/** Breadcrumb row above the card. */
export const TOOL_BREADCRUMB = 'mb-6 flex w-full items-center gap-2 text-sm';
export const TOOL_BREADCRUMB_LINK = 'mv-pres-link no-underline';

/** Main form or result card. */
export const TOOL_CARD = 'mv-pres-card w-full rounded-2xl p-6 shadow-2xl md:p-8';
/** Smaller inset panel inside a card (option tiles, output blocks). */
export const TOOL_PANEL = 'mv-pres-field rounded-xl p-4';

export const TOOL_TITLE = 'flex items-center gap-2 text-2xl font-semibold';
export const TOOL_SUBTITLE = 'mv-pres-muted mt-2 text-sm';
export const TOOL_SECTION_TITLE = 'text-sm font-semibold';

/** Field label. First label after the header uses mt-6, later ones mt-5. */
export const TOOL_LABEL = 'mt-5 block text-sm font-semibold';
export const TOOL_FIELD = 'mv-pres-field mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400';
export const TOOL_TEXTAREA = `${TOOL_FIELD} min-h-36`;
export const TOOL_TEXTAREA_SHORT = `${TOOL_FIELD} min-h-24`;

export const TOOL_MUTED = 'mv-pres-muted';
export const TOOL_HINT = 'mv-pres-muted text-xs';
/** Text buttons such as "Show exemplar" and "Prompt assistant". */
export const TOOL_ACCENT_BUTTON = 'mv-pres-accent inline-flex items-center gap-1 text-sm font-semibold';
/** Icon-only buttons inside fields (microphone, favourite star). */
export const TOOL_ICON_BUTTON = 'mv-pres-muted';
/** Microphone pinned to the bottom-left of a textarea. */
export const TOOL_MIC = 'mv-pres-muted absolute bottom-3 left-3';
/** Outlined secondary button (Add File, History, Export, Copy). */
export const TOOL_SECONDARY = 'mv-pres-field inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold';
/** Selectable chip or tile; set data-active="true" on the chosen one. */
export const TOOL_CHOICE = 'mv-tool-choice rounded-xl p-4 text-left';

export const TOOL_GENERATE =
  'mv-pres-generate mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold disabled:opacity-50';

export const TOOL_ERROR = 'mt-4 text-sm text-rose-300';
