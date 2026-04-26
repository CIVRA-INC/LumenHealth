export enum AnalyticsEvent {
  SCREEN_VIEW = "SCREEN_VIEW",
  TAB_CHANGE = "TAB_CHANGE",
  BUTTON_PRESS = "BUTTON_PRESS",
  SESSION_START = "SESSION_START",
  ERROR = "ERROR",
}

const isDev = process.env.NODE_ENV === "development";

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): void {
  if (isDev) {
    console.log(`[Analytics] ${event}`, properties ?? {});
  } else {
    // TODO: replace with real SDK call, e.g. Segment, Amplitude, etc.
    // analyticsSDK.track(event, properties);
  }
}

export function trackScreen(screenName: string): void {
  track(AnalyticsEvent.SCREEN_VIEW, { screenName });
}
