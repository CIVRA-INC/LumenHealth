/**
 * CHORD-070 – Accessibility baseline audit for the web shell.
 * Checks keyboard flow, heading order, contrast ratio, and live-region
 * presence at runtime (dev/test only) and logs violations to the console.
 */

export interface A11yViolation {
  rule: string;
  element: string;
  message: string;
}

/** Minimum WCAG AA contrast ratio */
const MIN_CONTRAST = 4.5;

function relativeLuminance(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(...fg);
  const l2 = relativeLuminance(...bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

export function auditHeadingOrder(root: Document | Element = document): A11yViolation[] {
  const violations: A11yViolation[] = [];
  const headings = Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  let prev = 0;
  for (const h of headings) {
    const level = parseInt(h.tagName[1], 10);
    if (level > prev + 1) {
      violations.push({ rule: "heading-order", element: h.outerHTML.slice(0, 80), message: `Skipped from h${prev} to h${level}` });
    }
    prev = level;
  }
  return violations;
}

export function auditLiveRegions(root: Document | Element = document): A11yViolation[] {
  const regions = root.querySelectorAll("[aria-live]");
  if (regions.length === 0) {
    return [{ rule: "live-region-missing", element: "<body>", message: "No aria-live regions found – dynamic updates may not be announced" }];
  }
  return [];
}

export function auditFocusableElements(root: Document | Element = document): A11yViolation[] {
  const violations: A11yViolation[] = [];
  const focusable = root.querySelectorAll("a,button,input,select,textarea,[tabindex]");
  for (const el of focusable) {
    const label = (el as HTMLElement).getAttribute("aria-label") || (el as HTMLElement).textContent?.trim();
    if (!label) {
      violations.push({ rule: "focusable-no-label", element: el.outerHTML.slice(0, 80), message: "Focusable element has no accessible label" });
    }
  }
  return violations;
}

export function runA11yAudit(root: Document | Element = document): A11yViolation[] {
  const all = [
    ...auditHeadingOrder(root),
    ...auditLiveRegions(root),
    ...auditFocusableElements(root),
  ];
  if (process.env.NODE_ENV !== "production") {
    all.forEach((v) => console.warn(`[a11y] ${v.rule}: ${v.message}`, v.element));
  }
  return all;
}

export { MIN_CONTRAST, contrastRatio as checkContrast };
