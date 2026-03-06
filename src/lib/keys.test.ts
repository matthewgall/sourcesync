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
