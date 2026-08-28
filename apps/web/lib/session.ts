export function isSessionExpired(expiry: number): boolean {
  return Date.now() > expiry;
}
