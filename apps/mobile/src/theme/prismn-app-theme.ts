export interface PrismnTypographyToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: "400" | "500" | "600" | "700";
  letterSpacing?: number;
}

export interface PrismnTheme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    primary: string;
    onPrimary: string;
    border: string;
    danger: string;
  };
  spacing: Record<"xs" | "sm" | "md" | "lg" | "xl", number>;
  radii: Record<"sm" | "md" | "lg" | "pill", number>;
  typography: Record<"display" | "title" | "body" | "label" | "caption", PrismnTypographyToken>;
}

export const prismnLightTheme: PrismnTheme = {
  colors: {
    background: "#F7F9FC",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#475569",
    primary: "#0B6E99",
    onPrimary: "#FFFFFF",
    border: "#D7DFEA",
    danger: "#B42318",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 6, md: 10, lg: 16, pill: 999 },
  typography: {
    display: { fontSize: 32, lineHeight: 40, fontWeight: "700" },
    title: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
    body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  },
};

export function prismnScaledFontSize(base: number, fontScale: number, maxScale = 2): number {
  const clamped = Math.max(1, Math.min(fontScale, maxScale));
  return Math.round(base * clamped);
}

export function prismnContrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const ch = [16, 8, 0].map((s) => {
      const c = ((n >> s) & 0xff) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const l1 = lum(hex1);
  const l2 = lum(hex2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}
