import { Hono } from "hono";

interface Env {
  R2: R2Bucket;
  API_KEY?: string;
}

type Source = {
  id: string;
  url: string;
};

type RefreshResult = {
  id: string;
  url: string;
  key: string;
  status: "updated" | "not_modified" | "error";
  fetchedAt: string;
  detail?: string;
  sizeBytes?: number;
  sourceEtag?: string;
  sourceLastModified?: string;
};

const SOURCES: Source[] = [
  {
    id: "afrinic",
    url: "https://ftp.afrinic.net/pub/stats/afrinic/delegated-afrinic-extended-latest",
  },
  {
    id: "apnic",
    url: "https://ftp.apnic.net/pub/stats/apnic/delegated-apnic-extended-latest",
  },
  {
    id: "arin",
    url: "https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest",
  },
  {
    id: "iana.asn",
    url: "https://data.iana.org/rdap/asn.json",
  },
  {
    id: "iana.dns",
    url: "https://data.iana.org/rdap/dns.json",
  },
  {
    id: "iana.ipv4",
    url: "https://data.iana.org/rdap/ipv4.json",
  },
  {
    id: "iana.ipv6",
    url: "https://data.iana.org/rdap/ipv6.json",
  },
  {
    id: "iana.rootzone",
    url: "https://www.internic.net/domain/root.zone",
  },
  {
    id: "iana.tlds",
    url: "https://data.iana.org/TLD/tlds-alpha-by-domain.txt",
  },
  {
    id: "lacnic",
    url: "https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest",
  },
  {
    id: "publicsuffix",
    url: "https://publicsuffix.org/list/public_suffix_list.dat",
  },
  {
    id: "ripe",
    url: "https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest",
  },
];

const STORAGE_PREFIX = "sources";
const LEGACY_STORAGE_PREFIX = "rir";
const STATE_KEY = `${STORAGE_PREFIX}/state.json`;
const LEGACY_STATE_KEY = `${LEGACY_STORAGE_PREFIX}/state.json`;
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;
const USER_AGENT = "sources/0.1.0";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) =>
  c.json({
    ok: true,
    endpoints: {
      status: "GET /status",
      refresh: "POST /refresh",
    },
  }),
);

app.get("/status", (c) => handleStatus(c.env));

app.get("/data", (c) => {
  const url = c.req.query("url");
  const key = c.req.query("key");
  return handleData(c.env, url ?? "", key ?? "");
});

app.post("/refresh", async (c) => {
  const authResponse = requireAuth(c.req.raw, c.env);
  if (authResponse) return authResponse;
  return handleRefresh(c.req.raw, c.env);
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
  if (!body || (!body.source && !body.rir && !body.url)) {
    const results = await refreshAll(env);
    return Response.json({ ok: true, results });
  }

  const requestedSource = body.source ?? body.rir;
  if (requestedSource) {
    const match = SOURCES.find((source) => source.id === requestedSource);
    if (!match) {
      return Response.json(
        { ok: false, error: "Unknown source" },
        { status: 400 },
      );
    }
    const result = await refreshOne(env, match);
    await storeState(env, [result]);
    return Response.json({ ok: true, results: [result] });
  }

  const url = String(body.url);
  const key = body.key ? String(body.key) : keyFromUrl(url, "custom");
  const result = await downloadAndStore(env, {
    id: body.id ? String(body.id) : "custom",
    url,
    key,
  });
  await storeState(env, [result]);
  return Response.json({ ok: result.status !== "error", results: [result] });
}

async function handleStatus(env: Env): Promise<Response> {
  const object = await env.R2.get(STATE_KEY);
  if (object) {
    return new Response(object.body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  const legacy = await env.R2.get(LEGACY_STATE_KEY);
  if (!legacy) {
    return Response.json({ ok: true, results: [] });
  }

  const payload = await legacy.text();
  await env.R2.put(STATE_KEY, payload, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
    },
  });

  return new Response(payload, {
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

    const source = SOURCES.find((item) => item.url === parsed.toString());
    const prefix = source ? source.id : "custom";
    key = keyFromUrl(parsed.toString(), prefix);
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

async function storeState(env: Env, results: RefreshResult[]): Promise<void> {
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

async function fetchWithBackoff(
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

function keyFromUrl(url: string, prefix: string): string {
  return buildKey(url, prefix, STORAGE_PREFIX);
}

function legacyKeyFromUrl(url: string, prefix: string): string {
  return buildKey(url, prefix, LEGACY_STORAGE_PREFIX);
}

function buildKey(url: string, prefix: string, rootPrefix: string): string {
  const parsed = new URL(url);
  const filename = parsed.pathname.split("/").pop() || "download";
  const normalizedPrefix = prefix.replace(/\.+/g, "/");
  return `${rootPrefix}/${normalizedPrefix}/${filename}`;
}

async function migrateLegacyObject(
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

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.body) return null;
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
