import { BASE_DELAY_MS, MAX_RETRIES } from "./constants";

export async function fetchWithBackoff(
  url: string,
  headers: Headers,
): Promise<{ ok: true; response: Response } | { ok: false; error: string }> {
  let lastError: string | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
    try {
      const response = await fetch(url, { headers });
      if (response.ok || response.status === 304) {
        return { ok: true, response };
      }
      if (!shouldRetry(response.status) || attempt === MAX_RETRIES) {
        return {
          ok: false,
          error: `Unexpected status ${response.status}`,
        };
      }
      lastError = `Unexpected status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_RETRIES) break;
    }
  }
  return {
    ok: false,
    error: lastError ?? "Request failed",
  };
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
