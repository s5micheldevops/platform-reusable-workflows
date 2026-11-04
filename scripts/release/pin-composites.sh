#!/usr/bin/env bash
#
# pin-composites.sh — pin the security reusable workflows to an immutable
# commit SHA of this repository.
#
# Why: a reusable workflow cannot discover its own repo/ref at runtime, and a
# floating @main reference lets the composite action (and its scripts) drift
# away from the workflow version. This script rewrites each workflow's
# "uses: .../actions/<name>@<ref>" line to a 40-character commit SHA, and first
# proves that SHA actually contains the matching action.yml AND its script or
# config — so the workflow, the composite and the scripts stay coherent.
#
# Usage:
#   scripts/release/pin-composites.sh <40-hex-commit-sha>
#
# Typical flow (see docs): commit the composites+scripts, read that commit SHA,
# run this script, commit the pinned workflows, then tag the release.

set -euo pipefail

SHA="${1:-}"
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

die() { echo "pin-composites: ERROR: $*" >&2; exit 1; }

# 1. The ref must be a full, immutable commit SHA (not a branch or short SHA).
case "${SHA}" in
  "") die "missing argument. Usage: $0 <40-hex-commit-sha>" ;;
esac
if ! printf '%s' "${SHA}" | grep -Eq '^[0-9a-f]{40}$'; then
  die "ref must be a 40-character lowercase hex commit SHA. Received: '${SHA}'"
fi
git -C "${ROOT}" rev-parse --verify --quiet "${SHA}^{commit}" >/dev/null \
  || die "commit ${SHA} does not exist in this repository (push it first)."

# 2. Coherence guard: workflow <-> composite <-> scripts must share this SHA.
#    name | workflow file | action.yml | the script/config the action runs
MAP="
dependency-scan|.github/workflows/reusable-dependency-scan.yml|actions/dependency-scan/action.yml|scripts/security/dependency-scan.mjs
sast-javascript-typescript|.github/workflows/reusable-sast-eslint.yml|actions/sast-javascript-typescript/action.yml|security/semgrep/javascript-typescript-security-v1.yml
environment-file-guard|.github/workflows/reusable-env-file-guard.yml|actions/environment-file-guard/action.yml|scripts/security/environment-guard.mjs
"

echo "${MAP}" | while IFS='|' read -r name workflow action script; do
  [ -z "${name}" ] && continue
  for path in "${action}" "${script}"; do
    git -C "${ROOT}" cat-file -e "${SHA}:${path}" 2>/dev/null \
      || die "commit ${SHA} does not contain '${path}' (required by ${name}); refusing to pin to an incoherent revision."
  done
done

# 3. Rewrite each workflow's pinned "uses:" line, matched by its "# pin:<name>".
echo "${MAP}" | while IFS='|' read -r name workflow action script; do
  [ -z "${name}" ] && continue
  file="${ROOT}/${workflow}"
  [ -f "${file}" ] || die "workflow file not found: ${workflow}"
  sed -i -E "s|(actions/${name}@)[0-9a-fA-F]+( # pin:${name})|\1${SHA}\2|" "${file}"
  grep -q "actions/${name}@${SHA} # pin:${name}" "${file}" \
    || die "failed to pin ${name} in ${workflow} (anchor '# pin:${name}' not found?)."
  echo "pinned ${name} -> @${SHA}  (${workflow})"
done

echo "pin-composites: done. Review 'git diff', commit, then tag the release."
