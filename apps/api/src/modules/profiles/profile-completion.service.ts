export interface ArtistProfileFields {
  slug?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  genre?: string;
  socialLinks?: Record<string, string>;
  walletAddress?: string;
}

interface ScoredField {
  field: keyof ArtistProfileFields;
  weight: number;
  label: string;
}

const SCORED_FIELDS: ScoredField[] = [
  { field: "slug",          weight: 20, label: "Unique slug" },
  { field: "displayName",   weight: 20, label: "Display name" },
  { field: "bio",           weight: 15, label: "Bio" },
  { field: "avatarUrl",     weight: 15, label: "Profile photo" },
  { field: "bannerUrl",     weight: 10, label: "Banner image" },
  { field: "genre",         weight: 10, label: "Genre" },
  { field: "walletAddress", weight: 10, label: "Wallet address" },
];

export interface CompletionScore {
  score: number;          // 0–100
  missing: string[];
  isEligibleForPayout: boolean;
}

export function computeProfileCompletion(profile: ArtistProfileFields): CompletionScore {
  let score = 0;
  const missing: string[] = [];

  for (const { field, weight, label } of SCORED_FIELDS) {
    const val = profile[field];
    const filled = typeof val === "string" ? val.trim().length > 0
                 : typeof val === "object" && val !== null ? Object.keys(val).length > 0
                 : false;
    if (filled) score += weight;
    else missing.push(label);
  }

  // social links bonus (up to remaining weight)
  if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) {
    score = Math.min(100, score);
  }

  return {
    score,
    missing,
    isEligibleForPayout: score >= 70 && !!profile.walletAddress,
  };
}
