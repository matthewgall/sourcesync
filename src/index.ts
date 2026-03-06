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
import { Hono } from "hono";
import {
  LEGACY_STORAGE_PREFIX,
  STATE_KEY,
  STORAGE_PREFIX,
  USER_AGENT,
  fetchWithBackoff,
  keyFromSourceUrl,
  keyFromUrl,
  legacyKeyFromUrl,
  migrateLegacyObject,
  readState,
  storeState,
  validateRefreshRequest,
} from "./lib";
import { SOURCES } from "./data";
import { registerRoutes } from "./routes";
import type { Env, RefreshResult, Source } from "./types";

const app = new Hono<{ Bindings: Env }>();
registerRoutes(app, {
  requireAuth,
  handleStatus,
  handleData,
  handleRefresh,
});

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(refreshAll(env));
  },
};

function requireAuth(request: Request, env: Env): Response | null {
  if (!env.API_KEY) return null;
  const provided = request.headers.get("x-api-key");
  if (provided !== env.API_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  const body = await safeJson(request);
  const validation = validateRefreshRequest(body);
  if (!validation.ok) {
    return Response.json({ ok: false, error: validation.error }, { status: 400 });
  }

  if (validation.value.kind === "all") {
    const results = await refreshAll(env);
    return Response.json({ ok: true, results });
  }

  if (validation.value.kind === "source") {
    const result = await refreshOne(env, validation.value.source);
    await storeState(env, [result]);
    return Response.json({ ok: true, results: [result] });
  }

  const result = await downloadAndStore(env, validation.value);
  await storeState(env, [result]);
  return Response.json({ ok: result.status !== "error", results: [result] });
}

async function handleStatus(env: Env): Promise<Response> {
  const state = await readState(env);
  if (!state) {
    return Response.json({ ok: true, results: [] });
  }

  if (state.migrated) {
    await env.R2.put(STATE_KEY, state.payload, {
      httpMetadata: {
        contentType: "application/json; charset=utf-8",
        cacheControl: "no-store",
      },
    });
  }

  return new Response(state.payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

async function handleData(env: Env, url: string, keyOverride: string): Promise<Response> {
  if (!url && !keyOverride) {
    return Response.json(
      { ok: false, error: "Missing url or key query parameter" },
      { status: 400 },
    );
  }

  let key = keyOverride.trim();
  if (!key) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return Response.json(
        { ok: false, error: "Invalid url" },
        { status: 400 },
      );
    }

    key = keyFromSourceUrl(parsed.toString(), "custom");
  }
  let object = await env.R2.get(key);
  if (!object && key.startsWith(`${STORAGE_PREFIX}/`)) {
    const legacyKey = `${LEGACY_STORAGE_PREFIX}/${key.slice(STORAGE_PREFIX.length + 1)}`;
    object = await env.R2.get(legacyKey);
  } else if (!object && key.startsWith(`${LEGACY_STORAGE_PREFIX}/`)) {
    const migratedKey = `${STORAGE_PREFIX}/${key.slice(LEGACY_STORAGE_PREFIX.length + 1)}`;
    object = await env.R2.get(migratedKey);
  }
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }
  if (object.httpMetadata?.cacheControl) {
    headers.set("cache-control", object.httpMetadata.cacheControl);
  }
  if (object.etag) {
    headers.set("etag", object.etag);
  }

  return new Response(object.body, { headers });
}

async function refreshAll(env: Env): Promise<RefreshResult[]> {
  const results = await Promise.allSettled(
    SOURCES.map((source) => refreshOne(env, source)),
  );
  const resolved = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const source = SOURCES[index];
    return {
      id: source.id,
      url: source.url,
      key: keyFromUrl(source.url, source.id),
      status: "error",
      fetchedAt: new Date().toISOString(),
      detail: result.reason ? String(result.reason) : "Unknown error",
    } satisfies RefreshResult;
  });
  await storeState(env, resolved);
  return resolved;
}

async function refreshOne(env: Env, source: Source): Promise<RefreshResult> {
  return downloadAndStore(env, {
    id: source.id,
    url: source.url,
    key: keyFromUrl(source.url, source.id),
    legacyKey: legacyKeyFromUrl(source.url, source.id),
  });
}

async function downloadAndStore(
  env: Env,
  request: { id: string; url: string; key: string; legacyKey?: string },
): Promise<RefreshResult> {
  const fetchedAt = new Date().toISOString();
  let existing: R2Object | null = null;
  let existingFromLegacy = false;
  try {
    existing = await env.R2.head(request.key);
  } catch (error) {
    existing = null;
  }
  if (!existing && request.legacyKey) {
    try {
      existing = await env.R2.head(request.legacyKey);
      existingFromLegacy = existing !== null;
    } catch (error) {
      existing = null;
    }
  }

  const headers = new Headers();
  headers.set("User-Agent", USER_AGENT);
  if (existing?.customMetadata?.sourceEtag) {
    headers.set("If-None-Match", existing.customMetadata.sourceEtag);
  }
  if (existing?.customMetadata?.sourceLastModified) {
    headers.set("If-Modified-Since", existing.customMetadata.sourceLastModified);
  }

  const responseResult = await fetchWithBackoff(request.url, headers);
  if (!responseResult.ok) {
    return {
      id: request.id,
      url: request.url,
      key: request.key,
      status: "error",
      fetchedAt,
      detail: responseResult.error,
    };
  }
  const response = responseResult.response;

  if (response.status === 304) {
    if (existingFromLegacy && request.legacyKey) {
      await migrateLegacyObject(env, request.legacyKey, request.key);
    }
    return {
      id: request.id,
      url: request.url,
      key: request.key,
      status: "not_modified",
      fetchedAt,
      sourceEtag: existing?.customMetadata?.sourceEtag,
      sourceLastModified: existing?.customMetadata?.sourceLastModified,
    };
  }

  if (!response.ok || !response.body) {
    return {
      id: request.id,
      url: request.url,
      key: request.key,
      status: "error",
      fetchedAt,
      detail: `Unexpected status ${response.status}`,
    };
  }

  const sourceEtag = response.headers.get("etag") ?? undefined;
  const sourceLastModified = response.headers.get("last-modified") ?? undefined;
  const sizeHeader = response.headers.get("content-length");
  let body: ReadableStream | ArrayBuffer;
  let sizeBytes: number | undefined;
  if (sizeHeader) {
    body = response.body;
    sizeBytes = Number(sizeHeader);
  } else {
    const buffer = await response.arrayBuffer();
    body = buffer;
    sizeBytes = buffer.byteLength;
  }

  await env.R2.put(request.key, body, {
    httpMetadata: {
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
      cacheControl: "max-age=86400",
    },
    customMetadata: {
      sourceEtag: sourceEtag ?? "",
      sourceLastModified: sourceLastModified ?? "",
      fetchedAt,
      sourceUrl: request.url,
    },
  });

  return {
    id: request.id,
    url: request.url,
    key: request.key,
    status: "updated",
    fetchedAt,
    sizeBytes,
    sourceEtag,
    sourceLastModified,
  };
}


async function safeJson(request: Request): Promise<unknown> {
  if (!request.body) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}
