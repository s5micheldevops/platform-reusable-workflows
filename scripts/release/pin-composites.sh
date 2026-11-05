#!/usr/bin/env bash
#
# pin-composites.sh — pin reusable workflows to an immutable commit SHA of this
# repository.
#
# Why: a reusable workflow cannot discover its own repo/ref at runtime, and a
# floating @main reference lets the composite action (and its scripts) drift
# away from the workflow version. This script rewrites each workflow's
# "uses: .../actions/<name>@<ref> # pin:<name>" line to a 40-character commit
# SHA, and first proves that SHA actually contains the matching action.yml AND
# its script/config — so the workflow, the composite and the scripts stay
# coherent.
#
# Usage:
#   scripts/release/pin-composites.sh [--apply] [--only <name>] <40-hex-commit-sha>
#
# Safety:
#   * DEFAULT IS DRY-RUN: without --apply it only reports the intended changes.
#   * --only <name> pins a single composite (preserves every other pin); this
#     matters when different composites are pinned to different coherent SHAs.
#   * It never commits, pushes, tags or merges, and never rewrites tags.
#
# Typical flow (see the release runbook): commit the composites+scripts, read
# that commit SHA, run this script with --apply, commit the pinned workflows,
# then (separately) tag the release.

set -euo pipefail

die() { echo "pin-composites: ERROR: $*" >&2; exit 1; }

APPLY=0
ONLY=""
SHA=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --dry-run) APPLY=0; shift ;;
    --only) ONLY="${2:-}"; shift 2 ;;
    -h|--help) echo "Usage: $0 [--apply] [--only <name>] <40-hex-commit-sha>"; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) [ -z "${SHA}" ] && SHA="$1" || die "unexpected extra argument: $1"; shift ;;
  esac
done

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

# 1. The ref must be a full, immutable commit SHA (not a branch or short SHA).
[ -n "${SHA}" ] || die "missing SHA. Usage: $0 [--apply] [--only <name>] <40-hex-commit-sha>"
printf '%s' "${SHA}" | grep -Eq '^[0-9a-f]{40}$' \
  || die "ref must be a 40-character lowercase hex commit SHA. Received: '${SHA}'"
git -C "${ROOT}" rev-parse --verify --quiet "${SHA}^{commit}" >/dev/null \
  || die "commit ${SHA} does not exist in this repository (push it first)."

# Registry: name | workflow file | action.yml | the script/config the action runs
MAP="
dependency-scan|.github/workflows/reusable-dependency-scan.yml|actions/dependency-scan/action.yml|scripts/security/dependency-scan.mjs
sast-javascript-typescript|.github/workflows/reusable-sast-eslint.yml|actions/sast-javascript-typescript/action.yml|security/semgrep/javascript-typescript-security-v1.yml
environment-file-guard|.github/workflows/reusable-env-file-guard.yml|actions/environment-file-guard/action.yml|scripts/security/environment-guard.mjs
direct-push-guard|.github/workflows/reusable-direct-push-guard.yml|actions/direct-push-guard/action.yml|scripts/governance/collect-push-evidence.mjs
"

selected=0
[ "${APPLY}" -eq 1 ] && echo "pin-composites: APPLY mode (files will be edited)." || echo "pin-composites: DRY-RUN (no files changed; use --apply to write)."
[ -n "${ONLY}" ] && echo "pin-composites: restricted to --only '${ONLY}'."

# 2. Coherence guard + 3. rewrite (dry-run prints, --apply edits). Single shell
#    (no pipe-to-subshell) so die/exit propagate and counters survive.
while IFS='|' read -r name workflow action script; do
  [ -z "${name}" ] && continue
  [ -n "${ONLY}" ] && [ "${ONLY}" != "${name}" ] && continue
  selected=$((selected + 1))

  for path in "${action}" "${script}"; do
    git -C "${ROOT}" cat-file -e "${SHA}:${path}" 2>/dev/null \
      || die "commit ${SHA} does not contain '${path}' (required by ${name}); refusing to pin to an incoherent revision."
  done

  file="${ROOT}/${workflow}"
  [ -f "${file}" ] || die "workflow file not found: ${workflow}"
  current="$(grep -oE "actions/${name}@[0-9a-fA-F]+ # pin:${name}" "${file}" | head -1 || true)"
  [ -n "${current}" ] || die "pin anchor '# pin:${name}' not found in ${workflow}."

  if [ "${APPLY}" -eq 1 ]; then
    sed -i -E "s|(actions/${name}@)[0-9a-fA-F]+( # pin:${name})|\1${SHA}\2|" "${file}"
    grep -q "actions/${name}@${SHA} # pin:${name}" "${file}" \
      || die "failed to pin ${name} in ${workflow}."
    echo "pinned   ${name}: -> @${SHA}  (${workflow})"
  else
    echo "would pin ${name}: ${current}  ->  actions/${name}@${SHA} # pin:${name}  (${workflow})"
  fi
done <<EOF
${MAP}
EOF

[ "${selected}" -gt 0 ] || die "no composite matched --only '${ONLY}'."
if [ "${APPLY}" -eq 1 ]; then
  echo "pin-composites: done. Review 'git diff', commit, then (separately) tag the release."
else
  echo "pin-composites: dry-run complete (${selected} entr(y|ies) would change). Re-run with --apply to write."
fi
