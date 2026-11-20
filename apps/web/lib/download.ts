/** How long the object URL stays valid after the click, so the browser has started the download. */
export const REVOKE_DELAY_MS = 1000;

/**
 * Saves `data` as a pretty-printed JSON file through a temporary anchor element. The object URL is
 * revoked after a short delay rather than immediately: revoking synchronously after `click()` can
 * cancel the download in some browsers before it starts.
 */
export function downloadJson(
  filename: string,
  data: unknown,
  options: { revokeDelayMs?: number } = {},
): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), options.revokeDelayMs ?? REVOKE_DELAY_MS);
}
