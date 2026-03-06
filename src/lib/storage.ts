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
import { LEGACY_STATE_KEY, STATE_KEY } from "./constants";
import type { Env, RefreshResult } from "../types";

export async function storeState(
  env: Env,
  results: RefreshResult[],
): Promise<void> {
  const payload = JSON.stringify({
    updatedAt: new Date().toISOString(),
    results,
  });
  await env.R2.put(STATE_KEY, payload, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
    },
  });
}

export async function migrateLegacyObject(
  env: Env,
  legacyKey: string,
  newKey: string,
): Promise<void> {
  const legacy = await env.R2.get(legacyKey);
  if (!legacy) return;
  const body = await legacy.arrayBuffer();
  await env.R2.put(newKey, body, {
    httpMetadata: legacy.httpMetadata,
    customMetadata: legacy.customMetadata,
  });
}

export async function readState(
  env: Env,
): Promise<{ payload: string; migrated: boolean } | null> {
  const object = await env.R2.get(STATE_KEY);
  if (object) {
    return { payload: await object.text(), migrated: false };
  }

  const legacy = await env.R2.get(LEGACY_STATE_KEY);
  if (!legacy) return null;

  return { payload: await legacy.text(), migrated: true };
}
