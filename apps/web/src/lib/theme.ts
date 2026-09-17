export const APP_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", Inter, system-ui, sans-serif';

export const APP_FONT_STYLE = { fontFamily: APP_FONT } as const;

/** @deprecated Use APP_FONT — kept so existing imports keep compiling. */
export const CYBER_FONT = APP_FONT;
export const CYBER_FONT_STYLE = APP_FONT_STYLE;
