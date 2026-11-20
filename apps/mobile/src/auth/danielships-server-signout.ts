export interface DanielshipsAuthClient {
  postLogout(accessToken: string): Promise<{ ok: boolean }>;
}

export interface DanielshipsSessionStore {
  getAccessToken(): string | null;
  clearSession(): void;
}

export interface DanielshipsSignoutResult {
  serverRevoked: boolean;
  localCleared: boolean;
  error?: string;
}

export async function signOutDanielships(
  client: DanielshipsAuthClient,
  store: DanielshipsSessionStore,
): Promise<DanielshipsSignoutResult> {
  const token = store.getAccessToken();
  let serverRevoked = false;
  let error: string | undefined;
  if (token) {
    try {
      const res = await client.postLogout(token);
      serverRevoked = res.ok;
    } catch (e) {
      error = e instanceof Error ? e.message : "logout_failed";
    }
  }
  store.clearSession();
  return { serverRevoked, localCleared: true, ...(error ? { error } : {}) };
}
