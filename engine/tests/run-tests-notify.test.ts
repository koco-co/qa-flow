import { describe, it, expect } from "bun:test";
import {
  buildPhasePlans,
  extractTenantFromCookie,
} from "../src/run-tests-notify.ts";

describe("extractTenantFromCookie", () => {
  it("parses dt_tenant_name from a real DTStack cookie", () => {
    const cookie =
      "dt_user_id=1; dt_tenant_id=10481; dt_tenant_name=pw_test; dt_token=abc";
    expect(extractTenantFromCookie(cookie)).toBe("pw_test");
  });

  it("decodes URL-encoded tenant name", () => {
    const cookie = "dt_tenant_name=%E5%B2%9A%E5%9B%BE; foo=bar";
    expect(extractTenantFromCookie(cookie)).toBe("岚图");
  });

  it("returns undefined when cookie is missing the key", () => {
    expect(
      extractTenantFromCookie("foo=bar; baz=qux")).toBe(undefined);
  });

  it("returns undefined for empty/undefined input", () => {
    expect(extractTenantFromCookie(undefined)).toBe(undefined);
    expect(extractTenantFromCookie("")).toBe(undefined);
  });

  it("matches only full key (not suffix of another key)", () => {
    // `foo_dt_tenant_name=xxx` must NOT match
    const cookie = "foo_dt_tenant_name=other; dt_tenant_name=real";
    expect(extractTenantFromCookie(cookie)).toBe("real");
  });
});

describe("buildPhasePlans", () => {
  const baseArgs = [
    "workspace/dataAssets/tests/202604/x/full.spec.ts",
    "--project=chromium",
  ];

  it("returns a single phase with untouched args when two-phase is off", () => {
    const plans = buildPhasePlans(baseArgs, false);
    expect(plans.length).toBe(1);
    expect(plans[0].name).toBe("single");
    expect(plans[0].args).toEqual(baseArgs);
    expect(plans[0].envOverrides).toEqual({});
  });

  it("splits into parallel + serial phases when two-phase is on", () => {
    const plans = buildPhasePlans(baseArgs, true);
    expect(plans.length).toBe(2);

    const [parallel, serial] = plans;
    expect(parallel.name).toBe("parallel");
    expect(parallel.args.includes("--grep-invert=@serial").toBeTruthy());
    expect(parallel.args.includes("--pass-with-no-tests").toBeTruthy());
    expect(parallel.envOverrides.PW_FULLY_PARALLEL).toBe("1");

    expect(serial.name).toBe("serial");
    expect(serial.args.includes("--grep=@serial").toBeTruthy());
    expect(serial.args.includes("--pass-with-no-tests").toBeTruthy());
    expect(serial.envOverrides.PW_WORKERS).toBe("1");
    expect(serial.envOverrides.PW_FULLY_PARALLEL).toBe("");
  });

  it("preserves user args and only appends phase-specific flags", () => {
    const plans = buildPhasePlans(baseArgs, true);
    for (const plan of plans) {
      // 原 args 必须完整保留在前面
      for (let i = 0; i < baseArgs.length; i++) {
        expect(plan.args[i]).toBe(baseArgs[i]);
      }
    }
  });

  it("throws when user already passes --grep= in two-phase mode", () => {
    expect(() => buildPhasePlans([...baseArgs, "--grep=foo"], true)).toThrow(/与用户自带的 --grep/);
  });

  it("throws when user already passes --grep-invert= in two-phase mode", () => {
    expect(() => buildPhasePlans([...baseArgs, "--grep-invert=bar"], true)).toThrow(/与用户自带的 --grep/);
  });

  it("throws when user passes --grep as two separate tokens", () => {
    expect(() => buildPhasePlans([...baseArgs, "--grep", "foo"], true)).toThrow(/与用户自带的 --grep/);
  });

  it("does NOT throw when user passes unrelated args in two-phase mode", () => {
    expect(() =>
      buildPhasePlans([...baseArgs, "--reporter=line"], true)).not.toThrow();
  });
});
