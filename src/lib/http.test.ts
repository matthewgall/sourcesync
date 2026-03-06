import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithBackoff } from "./http";

describe("fetchWithBackoff", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns error for non-retryable status", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 400 }));

    const result = await fetchWithBackoff("https://example.com", new Headers());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unexpected status 400");
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 and succeeds", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const resultPromise = fetchWithBackoff(
      "https://example.com",
      new Headers(),
    );

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe(200);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns last error when fetch throws", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue("boom");

    const resultPromise = fetchWithBackoff(
      "https://example.com",
      new Headers(),
    );

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("boom");
    }
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("uses error.message when fetch throws Error", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network down"));

    const resultPromise = fetchWithBackoff(
      "https://example.com",
      new Headers(),
    );

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("network down");
    }
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("returns request failed when retries are disabled", async () => {
    vi.resetModules();
    vi.doMock("./constants", () => ({
      BASE_DELAY_MS: 1000,
      MAX_RETRIES: -1,
    }));
    const { fetchWithBackoff: mockedFetchWithBackoff } = await import("./http");

    const result = await mockedFetchWithBackoff(
      "https://example.com",
      new Headers(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Request failed");
    }
  });
});
