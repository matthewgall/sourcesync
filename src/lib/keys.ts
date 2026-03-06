import { LEGACY_STORAGE_PREFIX, STORAGE_PREFIX } from "./constants";
import { SOURCES } from "../data/sources";

export function keyFromUrl(url: string, prefix: string): string {
  return buildKey(url, prefix, STORAGE_PREFIX);
}

export function legacyKeyFromUrl(url: string, prefix: string): string {
  return buildKey(url, prefix, LEGACY_STORAGE_PREFIX);
}

export function keyFromSourceUrl(url: string, defaultPrefix: string): string {
  const source = SOURCES.find((item) => item.url === url);
  const prefix = source ? source.id : defaultPrefix;
  return keyFromUrl(url, prefix);
}

function buildKey(url: string, prefix: string, rootPrefix: string): string {
  const parsed = new URL(url);
  const filename = parsed.pathname.split("/").pop() || "download";
  const normalizedPrefix = prefix.replace(/\.+/g, "/");
  return `${rootPrefix}/${normalizedPrefix}/${filename}`;
}
