import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNetworkStatus } from "../useNetworkStatus";

describe("Network Status Logic", () => {
  it("determines online status correctly when navigator is online", () => {
    const status = getNetworkStatus({ onLine: true });
    expect(status.isOnline).toBe(true);
    expect(status.isOffline).toBe(false);
  });

  it("determines offline status correctly when navigator is offline", () => {
    const status = getNetworkStatus({ onLine: false });
    expect(status.isOnline).toBe(false);
    expect(status.isOffline).toBe(true);
  });

  it("defaults to online when navigator.onLine is undefined (e.g. during SSR)", () => {
    const status = getNetworkStatus(undefined);
    expect(status.isOnline).toBe(true);
    expect(status.isOffline).toBe(false);
  });
});
