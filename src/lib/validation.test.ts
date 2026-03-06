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
import { validateRefreshRequest } from "./validation";

describe("validateRefreshRequest", () => {
  it("returns all when body is null", () => {
    const result = validateRefreshRequest(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("all");
    }
  });

  it("returns all when body has no refresh fields", () => {
    const result = validateRefreshRequest({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("all");
    }
  });

  it("accepts a known source", () => {
    const result = validateRefreshRequest({ source: "iana.ipv4" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("source");
      if (result.value.kind === "source") {
        expect(result.value.source.id).toBe("iana.ipv4");
      }
    }
  });

  it("rejects non-string source", () => {
    const result = validateRefreshRequest({ source: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid source");
    }
  });

  it("rejects unknown source", () => {
    const result = validateRefreshRequest({ source: "does.not.exist" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown source");
    }
  });

  it("rejects invalid url", () => {
    const result = validateRefreshRequest({ url: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid url");
    }
  });

  it("rejects malformed url", () => {
    const result = validateRefreshRequest({ url: "not-a-url" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("valid absolute URL");
    }
  });

  it("rejects empty key", () => {
    const result = validateRefreshRequest({
      url: "https://example.com/file.txt",
      key: "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid key");
    }
  });

  it("rejects key override for known source url", () => {
    const result = validateRefreshRequest({
      url: "https://data.iana.org/rdap/ipv4.json",
      key: "custom/override",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Key override not allowed");
    }
  });

  it("rejects id override for known source url", () => {
    const result = validateRefreshRequest({
      url: "https://data.iana.org/rdap/ipv4.json",
      id: "custom",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Id override not allowed");
    }
  });

  it("rejects empty id", () => {
    const result = validateRefreshRequest({
      url: "https://example.com/file.txt",
      id: " ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid id");
    }
  });

  it("uses known source key for known source url", () => {
    const result = validateRefreshRequest({
      url: "https://data.iana.org/rdap/ipv4.json",
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.kind === "custom") {
      expect(result.value.key).toContain("sources/iana/ipv4/ipv4.json");
    }
  });

  it("accepts custom url with optional key and id", () => {
    const result = validateRefreshRequest({
      url: "https://example.com/file.txt",
      key: "custom/path",
      id: "example",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("custom");
      if (result.value.kind === "custom") {
        expect(result.value.key).toBe("custom/path");
        expect(result.value.id).toBe("example");
      }
    }
  });
});
