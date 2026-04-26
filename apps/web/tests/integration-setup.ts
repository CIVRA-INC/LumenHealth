const DEFAULT_BASE_URL = 'http://localhost:3000';

export let TEST_BASE_URL: string;

export function setupIntegrationTests(): void {
  TEST_BASE_URL = process.env.TEST_BASE_URL ?? DEFAULT_BASE_URL;
  console.log(`[integration-setup] TEST_BASE_URL set to: ${TEST_BASE_URL}`);
}

export async function testFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${TEST_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, options);
}

export async function waitForSelector(
  selector: string,
  timeout = 5000,
): Promise<void> {
  // Stub: replace with actual DOM polling or Playwright locator logic.
  console.log(
    `[integration-setup] waitForSelector: "${selector}" (timeout: ${timeout}ms)`,
  );
}
