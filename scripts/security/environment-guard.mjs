import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repository = resolve(process.argv[2] || ".");
const allowedTemplates = new Set([".env.example", ".env.sample", ".env.template"]);
const result = spawnSync("git", ["-C", repository, "ls-files", "-z"], {
  encoding: "buffer",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error || result.status !== 0) {
  if (result.stderr?.length) process.stderr.write(result.stderr);
  console.error("Environment Guard could not enumerate tracked files with git ls-files -z.");
  process.exit(2);
}

const violations = result.stdout
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter((file) => {
    const name = basename(file).toLowerCase();
    return !allowedTemplates.has(name) && (name === ".env" || name.startsWith(".env."));
  });

if (violations.length > 0) {
  console.error("Environment Guard blocked tracked environment files:");
  for (const file of violations) console.error(`- ${JSON.stringify(file)}`);
  console.error(`Environment Guard found ${violations.length} policy violation(s). File contents were not inspected.`);
  process.exit(1);
}

console.log("Environment Guard passed: no prohibited tracked environment files were found.");
