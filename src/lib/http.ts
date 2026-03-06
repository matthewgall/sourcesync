/*
 * MIT License
 *
 * Copyright (c) 2026 Matthew Gall <me@matthewgall.dev>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
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
