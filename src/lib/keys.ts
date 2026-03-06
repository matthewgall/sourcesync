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
