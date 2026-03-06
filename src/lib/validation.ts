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
import { keyFromSourceUrl } from "./keys";
import { SOURCES } from "../data/sources";
import type { Source } from "../types";

export type RefreshRequest =
  | { kind: "all" }
  | { kind: "source"; source: Source }
  | { kind: "custom"; url: string; key: string; id: string };

export function validateRefreshRequest(
  body: unknown,
): { ok: true; value: RefreshRequest } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: true, value: { kind: "all" } };
  }

  const hasRefreshKey = "source" in body || "rir" in body || "url" in body;
  if (!hasRefreshKey) {
    return { ok: true, value: { kind: "all" } };
  }

  const requestedSource = body.source ?? body.rir;
  if (requestedSource !== undefined) {
    if (typeof requestedSource !== "string" || !requestedSource.trim()) {
      return {
        ok: false,
        error: "Invalid source; expected a non-empty string",
      };
    }
    const match = SOURCES.find((source) => source.id === requestedSource);
    if (!match) {
      return { ok: false, error: "Unknown source" };
    }
    return { ok: true, value: { kind: "source", source: match } };
  }

  if (typeof body.url !== "string" || !body.url.trim()) {
    return { ok: false, error: "Invalid url; expected a non-empty string" };
  }
  const url = body.url.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Invalid url; must be a valid absolute URL" };
  }
  if (typeof body.key === "string" && !body.key.trim()) {
    return { ok: false, error: "Invalid key; expected a non-empty string" };
  }
  const knownSource = SOURCES.find((source) => source.url === parsed.toString());
  if (knownSource && body.key) {
    return {
      ok: false,
      error: "Key override not allowed; URL maps to a known source",
    };
  }
  if (typeof body.id === "string" && !body.id.trim()) {
    return { ok: false, error: "Invalid id; expected a non-empty string" };
  }
  if (knownSource && typeof body.id === "string" && body.id.trim() !== knownSource.id) {
    return {
      ok: false,
      error: "Id override not allowed; URL maps to a known source",
    };
  }

  const normalizedUrl = parsed.toString();
  const key =
    typeof body.key === "string" && body.key.trim()
      ? body.key.trim()
      : keyFromSourceUrl(normalizedUrl, "custom");
  const id =
    typeof body.id === "string" && body.id.trim() ? body.id.trim() : "custom";
  return { ok: true, value: { kind: "custom", url: normalizedUrl, key, id } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
