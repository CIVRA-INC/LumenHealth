export type PublicRuntimeConfig = {
  apiBaseUrl: string;
};

export const getPublicRuntimeConfig = (): PublicRuntimeConfig => ({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:4000",
});
