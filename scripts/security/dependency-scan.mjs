import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const allowedSeverities = new Set(["low", "moderate", "high", "critical"]);
const [severity = "high", directory = "."] = process.argv.slice(2);
const workingDirectory = resolve(directory);

function fail(message, code = 2) {
  console.error(`Dependency Scan configuration error: ${message}`);
  process.exit(code);
}

if (!allowedSeverities.has(severity)) {
  fail(`fail_on_severity must be one of: ${[...allowedSeverities].join(", ")}. Received: ${severity}`);
}

if (!existsSync(workingDirectory) || !statSync(workingDirectory).isDirectory()) {
  fail(`working_directory does not exist or is not a directory: ${directory}`);
}

if (!existsSync(resolve(workingDirectory, "package.json"))) {
  fail(`package.json was not found in working_directory: ${directory}`);
}

const hasLockfile = ["package-lock.json", "npm-shrinkwrap.json"].some((file) =>
  existsSync(resolve(workingDirectory, file)),
);

if (!hasLockfile) {
  fail(`No npm lockfile was found in working_directory: ${directory}. Expected package-lock.json or npm-shrinkwrap.json.`);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npmCommand,
  ["audit", "--package-lock-only", "--ignore-scripts", `--audit-level=${severity}`, "--json"],
  {
    cwd: workingDirectory,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: process.platform === "win32",
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) fail(`npm audit could not start: ${result.error.message}`);

let report;
try {
  report = JSON.parse(result.stdout || "");
} catch {
  fail(`npm audit returned an unreadable report (exit code ${result.status ?? "unknown"}).`);
}

if (!report?.metadata?.vulnerabilities) {
  const scannerMessage = report?.error?.summary || report?.error?.detail || "npm audit did not return vulnerability metadata.";
  fail(`scanner failure: ${scannerMessage}`);
}

if (result.status === 0) {
  console.log(`Dependency Scan passed: no vulnerabilities met or exceeded the '${severity}' threshold.`);
  process.exit(0);
}

if (result.status === 1) {
  console.error(`Dependency Scan blocked: at least one vulnerability met or exceeded the '${severity}' threshold.`);
  process.exit(1);
}

fail(`npm audit failed technically with exit code ${result.status ?? "unknown"}.`);
