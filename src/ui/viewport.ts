/**
 * The canvas is rendered at device resolution (CSS size × DPR) for crisp text.
 * Scenes therefore zoom their cameras by DPR; UI code works in CSS pixels.
 */
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

export function cssViewportSize(): { width: number; height: number } {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
  };
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Reads env(safe-area-inset-*) via the #safe-area-probe element in index.html. */
export function readSafeArea(): SafeArea {
  const probe = document.getElementById('safe-area-probe');
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

export const isTouchDevice = (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
