export type AbdulrcrtwLocale = "en";

export interface AbdulrcrtwMessages {
  loginTitle: string;
  logout: string;
  networkOffline: string;
  retry: string;
  dateLabel: (iso: string) => string;
  numberLabel: (n: number) => string;
}

const en: AbdulrcrtwMessages = {
  loginTitle: "Sign in",
  logout: "Sign out",
  networkOffline: "You're offline",
  retry: "Retry",
  dateLabel: (iso) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)),
  numberLabel: (n) => new Intl.NumberFormat("en-US").format(n),
};

const catalogs: Record<AbdulrcrtwLocale, AbdulrcrtwMessages> = { en };

export function getAbdulrcrtwMessages(locale: string): AbdulrcrtwMessages {
  const key = (locale.split("-")[0] || "en") as AbdulrcrtwLocale;
  return catalogs[key] ?? catalogs.en;
}

export function formatClinicalDate(iso: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatClinicalNumber(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}
