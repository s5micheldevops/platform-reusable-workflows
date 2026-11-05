// Regression tests for the Direct Push Guard RELEASE PATH only.
// Scope: the DPG reusable workflow pin, pin-composites.sh behavior, and the
// documented caller permissions. Does NOT police unrelated historical workflows.
// Run with: node --test tests/direct-push-guard/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const WF = ".github/workflows/reusable-direct-push-guard.yml";
const SCRIPT = join(ROOT, "scripts/release/pin-composites.sh");

const dpgUses = () => {
  const line = read(WF).split("\n").find((l) => l.includes("actions/direct-push-guard@"));
  assert.ok(line, "composite 'uses:' line not found");
  return line.trim();
};

// 1. The DPG composite is pinned to a full-length (40 hex) immutable SHA.
test("release-1 composite pinned to a 40-hex immutable SHA", () => {
  const m = dpgUses().match(/actions\/direct-push-guard@([0-9a-f]{40})\b/);
  assert.ok(m, `expected a 40-hex SHA pin, got: ${dpgUses()}`);
});

// 3. No mutable reference (@main/@master/@develop/@<branch>) on the DPG release path.
test("release-3 no mutable composite reference", () => {
  const uses = dpgUses();
  for (const bad of ["@main", "@master", "@develop", "@staging"]) {
    assert.ok(!uses.includes(bad), `composite must not use mutable ref ${bad}`);
  }
  // reject any non-hex ref after '@'
  assert.ok(!/actions\/direct-push-guard@(?![0-9a-f]{40}\b)\S+/.test(uses), "composite ref must be a 40-hex SHA");
});

// 8. Caller example declares required permissions and no nonexistent release as real.
test("release-8 caller example declares required permissions", () => {
  const ex = read("docs/examples/direct-push-guard.caller.yml");
  assert.match(ex, /contents: read/);
  assert.match(ex, /pull-requests: read/);
  // v0.6.0 must be marked as a placeholder / future release, not a live tag.
  assert.match(ex, /PLACEHOLDER|future release|not published/i);
});

// 8b. Docs state the required permissions block.
test("release-8b docs state required caller permissions", () => {
  const d = read("docs/direct-push-guard.md");
  assert.match(d, /contents: read/);
  assert.match(d, /pull-requests: read/);
  assert.match(d, /startup_failure/);
});

// Helper: current pinned SHA (used for idempotency without mutating content).
const currentSha = () => dpgUses().match(/@([0-9a-f]{40})\b/)[1];
const runPin = (args) => {
  try {
    const out = execFileSync("bash", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
};

// 6. Invalid SHA is rejected (non-zero, no file change).
test("release-6 invalid SHA rejected", () => {
  const before = read(WF);
  const r = runPin(["--only", "direct-push-guard", "not-a-sha"]);
  assert.notEqual(r.code, 0, "expected non-zero exit for invalid SHA");
  assert.equal(read(WF), before, "file must be unchanged on invalid SHA");
});

// 5. Dry-run (default) does not modify files.
test("release-5 dry-run does not modify files", () => {
  const before = read(WF);
  const r = runPin(["--only", "direct-push-guard", currentSha()]);
  assert.equal(r.code, 0, `dry-run should succeed: ${r.out}`);
  assert.match(r.out, /DRY-RUN|would pin/i);
  assert.equal(read(WF), before, "dry-run must not change the file");
});

// 4. --apply is idempotent: re-applying the current SHA leaves the file identical.
test("release-4 apply is idempotent (re-pin current SHA = no change)", () => {
  const before = read(WF);
  const r = runPin(["--apply", "--only", "direct-push-guard", currentSha()]);
  assert.equal(r.code, 0, `apply should succeed: ${r.out}`);
  assert.equal(read(WF), before, "re-applying the current SHA must not change the file");
});

// 7. --only preserves unrelated composite pins (dry-run reports only DPG).
test("release-7 only-flag scopes to the named composite", () => {
  const r = runPin(["--only", "direct-push-guard", currentSha()]);
  assert.doesNotMatch(r.out, /\bdependency-scan\b|\bsast-javascript-typescript\b|\benvironment-file-guard\b/);
});
