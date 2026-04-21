import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPhasePlans,
  extractTenantFromCookie,
} from "../run-tests-notify.ts";

describe("extractTenantFromCookie", () => {
  it("parses dt_tenant_name from a real DTStack cookie", () => {
    const cookie =
      "dt_user_id=1; dt_tenant_id=10481; dt_tenant_name=pw_test; dt_token=abc";
    assert.equal(extractTenantFromCookie(cookie), "pw_test");
  });

  it("decodes URL-encoded tenant name", () => {
    const cookie = "dt_tenant_name=%E5%B2%9A%E5%9B%BE; foo=bar";
    assert.equal(extractTenantFromCookie(cookie), "岚图");
  });

  it("returns undefined when cookie is missing the key", () => {
    assert.equal(
      extractTenantFromCookie("foo=bar; baz=qux"),
      undefined,
    );
  });

  it("returns undefined for empty/undefined input", () => {
    assert.equal(extractTenantFromCookie(undefined), undefined);
    assert.equal(extractTenantFromCookie(""), undefined);
  });

  it("matches only full key (not suffix of another key)", () => {
    // `foo_dt_tenant_name=xxx` must NOT match
    const cookie = "foo_dt_tenant_name=other; dt_tenant_name=real";
    assert.equal(extractTenantFromCookie(cookie), "real");
  });
});

describe("buildPhasePlans", () => {
  const baseArgs = [
    "workspace/dataAssets/tests/202604/x/full.spec.ts",
    "--project=chromium",
  ];

  it("returns a single phase with untouched args when two-phase is off", () => {
    const plans = buildPhasePlans(baseArgs, false);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].name, "single");
    assert.deepEqual(plans[0].args, baseArgs);
    assert.deepEqual(plans[0].envOverrides, {});
  });

  it("splits into parallel + serial phases when two-phase is on", () => {
    const plans = buildPhasePlans(baseArgs, true);
    assert.equal(plans.length, 2);

    const [parallel, serial] = plans;
    assert.equal(parallel.name, "parallel");
    assert.ok(parallel.args.includes("--grep-invert=@serial"));
    assert.ok(parallel.args.includes("--pass-with-no-tests"));
    assert.equal(parallel.envOverrides.PW_FULLY_PARALLEL, "1");

    assert.equal(serial.name, "serial");
    assert.ok(serial.args.includes("--grep=@serial"));
    assert.ok(serial.args.includes("--pass-with-no-tests"));
    assert.equal(serial.envOverrides.PW_WORKERS, "1");
    assert.equal(serial.envOverrides.PW_FULLY_PARALLEL, "");
  });

  it("preserves user args and only appends phase-specific flags", () => {
    const plans = buildPhasePlans(baseArgs, true);
    for (const plan of plans) {
      // 原 args 必须完整保留在前面
      for (let i = 0; i < baseArgs.length; i++) {
        assert.equal(plan.args[i], baseArgs[i]);
      }
    }
  });

  it("throws when user already passes --grep= in two-phase mode", () => {
    assert.throws(
      () => buildPhasePlans([...baseArgs, "--grep=foo"], true),
      /与用户自带的 --grep/,
    );
  });

  it("throws when user already passes --grep-invert= in two-phase mode", () => {
    assert.throws(
      () => buildPhasePlans([...baseArgs, "--grep-invert=bar"], true),
      /与用户自带的 --grep/,
    );
  });

  it("throws when user passes --grep as two separate tokens", () => {
    assert.throws(
      () => buildPhasePlans([...baseArgs, "--grep", "foo"], true),
      /与用户自带的 --grep/,
    );
  });

  it("does NOT throw when user passes unrelated args in two-phase mode", () => {
    assert.doesNotThrow(() =>
      buildPhasePlans([...baseArgs, "--reporter=line"], true),
    );
  });
});
