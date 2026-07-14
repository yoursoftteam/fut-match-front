import { describe, it, expect } from "vitest";
import { urlB64ToUint8Array } from "./pwa-register";

describe("urlB64ToUint8Array", () => {
  it("converts base64url to Uint8Array", () => {
    const b64 =
      "BBQxpV_k5MxA1JqkQwDgC_zO8M6QHJ-DjRQ_JXz9m-U5QkZ5GqZGmH0qZ3JYQHx_gZ7YHl0G0G0q9X5s0Fz8iHw";
    const result = urlB64ToUint8Array(b64);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(65);
  });

  it("handles padding correctly", () => {
    const b64 = "ABC";
    const result = urlB64ToUint8Array(b64);
    expect(result.length).toBe(2);
  });

  it("handles standard base64 characters", () => {
    const b64 = "AQID"; // 1, 2, 3 in base64
    const result = urlB64ToUint8Array(b64);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
  });
});
