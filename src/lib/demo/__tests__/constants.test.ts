import { describe, it, expect } from "vitest";
import { DEMO_USER, isDemoModeEnabled } from "../constants";

describe("DEMO_USER", () => {
  it("has a valid UUID format id", () => {
    expect(DEMO_USER.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("has a valid email", () => {
    expect(DEMO_USER.email).toMatch(/@/);
  });

  it("has fullName and orgName set", () => {
    expect(DEMO_USER.fullName.length).toBeGreaterThan(0);
    expect(DEMO_USER.orgName.length).toBeGreaterThan(0);
  });
});

describe("isDemoModeEnabled", () => {
  it("returns false when DEV_DEMO_MODE is not true", () => {
    const orig = process.env.DEV_DEMO_MODE;
    delete process.env.DEV_DEMO_MODE;
    expect(isDemoModeEnabled()).toBe(false);
    process.env.DEV_DEMO_MODE = orig;
  });

  it("returns false when DEV_DEMO_MODE is undefined regardless of env", () => {
    const orig = process.env.DEV_DEMO_MODE;
    delete process.env.DEV_DEMO_MODE;
    expect(isDemoModeEnabled()).toBe(false);
    if (orig !== undefined) process.env.DEV_DEMO_MODE = orig;
  });
});
