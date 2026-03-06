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
