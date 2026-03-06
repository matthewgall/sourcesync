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
import { describe, expect, it } from "vitest";
import { keyFromSourceUrl, keyFromUrl, legacyKeyFromUrl } from "./keys";

describe("key helpers", () => {
  it("builds storage keys with normalized prefix", () => {
    const key = keyFromUrl(
      "https://data.iana.org/rdap/ipv4.json",
      "iana.ipv4",
    );
    expect(key).toBe("sources/iana/ipv4/ipv4.json");
  });

  it("builds legacy keys with legacy prefix", () => {
    const key = legacyKeyFromUrl(
      "https://data.iana.org/rdap/ipv4.json",
      "iana.ipv4",
    );
    expect(key).toBe("rir/iana/ipv4/ipv4.json");
  });

  it("uses known source prefix for source urls", () => {
    const key = keyFromSourceUrl(
      "https://data.iana.org/rdap/ipv4.json",
      "custom",
    );
    expect(key).toBe("sources/iana/ipv4/ipv4.json");
  });

  it("uses default prefix for unknown urls", () => {
    const key = keyFromSourceUrl(
      "https://example.com/file.txt",
      "custom",
    );
    expect(key).toBe("sources/custom/file.txt");
  });

  it("falls back to download filename when path is empty", () => {
    const key = keyFromUrl("https://example.com/", "custom");
    expect(key).toBe("sources/custom/download");
  });
});
