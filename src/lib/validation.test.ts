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
