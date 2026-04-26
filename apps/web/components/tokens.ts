/**
 * CHORD-062 – Design token system for Chordially brand primitives.
 * Covers color, typography, spacing, elevation, motion, and breakpoints.
 */

export const color = {
  brand:   { primary: "#6C3BFF", secondary: "#FF6B6B", accent: "#00D4AA" },
  neutral: { 0: "#FFFFFF", 100: "#F5F5F5", 500: "#9E9E9E", 900: "#121212" },
  status:  { success: "#22C55E", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6" },
} as const;

export const typography = {
  family: { sans: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  size:   { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem" },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  leading:{ tight: 1.25, normal: 1.5, relaxed: 1.75 },
} as const;

export const spacing = {
  0: "0",    1: "0.25rem", 2: "0.5rem",  3: "0.75rem",
  4: "1rem", 6: "1.5rem",  8: "2rem",    12: "3rem",
  16: "4rem", 24: "6rem",  32: "8rem",
} as const;

export const elevation = {
  none: "none",
  sm:   "0 1px 2px rgba(0,0,0,.08)",
  md:   "0 4px 12px rgba(0,0,0,.12)",
  lg:   "0 8px 24px rgba(0,0,0,.16)",
  xl:   "0 16px 48px rgba(0,0,0,.20)",
} as const;

export const motion = {
  duration: { fast: "100ms", base: "200ms", slow: "400ms" },
  easing:   { standard: "cubic-bezier(0.4,0,0.2,1)", enter: "cubic-bezier(0,0,0.2,1)", exit: "cubic-bezier(0.4,0,1,1)" },
} as const;

export const breakpoint = {
  sm:  "640px",
  md:  "768px",
  lg:  "1024px",
  xl:  "1280px",
  "2xl": "1536px",
} as const;

export type ColorToken     = typeof color;
export type TypographyToken = typeof typography;
export type SpacingToken   = typeof spacing;
