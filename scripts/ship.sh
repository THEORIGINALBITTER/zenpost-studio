#!/usr/bin/env bash
# npm run ship           → patch bump  (1.0.9 → 1.0.10)
# npm run ship -- minor  → minor bump  (1.0.9 → 1.1.0)
# npm run ship -- major  → major bump  (1.0.9 → 2.0.0)
# npm run ship -- v1.2.3 → exakte Version
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BUMP="${1:-patch}"

# ── Neue Version berechnen ─────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")

if [[ "$BUMP" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION="${BUMP#v}"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$BUMP" in
    major) NEW_VERSION="$((MAJOR+1)).0.0" ;;
    minor) NEW_VERSION="${MAJOR}.$((MINOR+1)).0" ;;
    patch) NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH+1))" ;;
    *) echo "Unbekannter Typ: $BUMP (patch | minor | major | vX.Y.Z)"; exit 1 ;;
  esac
fi

TAG="v${NEW_VERSION}"

echo "╔══════════════════════════════════════════╗"
echo "║   ZenPost Studio  Ship                   ║"
echo "║   ${CURRENT}  →  ${NEW_VERSION}"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Version in package.json + tauri.conf.json schreiben ───────────────────
npm version "$NEW_VERSION" --no-git-tag-version --silent

node -e "
  const fs = require('fs');
  const p = 'src-tauri/tauri.conf.json';
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.version = '${NEW_VERSION}';
  fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
"

echo "✓ Versionen aktualisiert"

# ── Alle Änderungen committen ──────────────────────────────────────────────
git add -A
git commit -m "release: ${TAG}"
echo "✓ Commit erstellt"

# ── Tag erstellen ──────────────────────────────────────────────────────────
if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null 2>&1; then
  echo "FEHLER: Tag ${TAG} existiert bereits"
  exit 1
fi

git tag "${TAG}"
echo "✓ Tag ${TAG} erstellt"

# ── Pushen ─────────────────────────────────────────────────────────────────
git push
git push origin "${TAG}"

echo ""
echo "✓ ${TAG} gepusht → GitHub Actions baut jetzt automatisch"
echo "  → https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/.git$//')/actions"
