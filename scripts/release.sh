#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == "" ]]; then
  echo "Usage: npm run release -- vX.Y.Z"
  exit 1
fi

TAG="$1"

if [[ "${TAG:0:1}" != "v" ]]; then
  echo "Tag must start with 'v' (example: v1.0.2)"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is dirty. Commit or stash changes before releasing."
  exit 1
fi

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "Tag ${TAG} already exists."
  exit 1
fi

if ! git rev-parse --verify HEAD >/dev/null; then
  echo "No commits found. Cannot create a release tag."
  exit 1
fi

echo "==> Creating tag ${TAG}"
git tag "${TAG}"

echo "==> Pushing tag ${TAG}"
git push origin "${TAG}"

echo "==> Done. GitHub Actions will build and attach release assets."
