#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Cleanup stuck DMG mounts (if any)"
while read -r dev; do
  echo "Detaching $dev"
  hdiutil detach "$dev" || true
done < <(hdiutil info | grep -E "rw\\..*\\.dmg|ZenPost Studio" -B 2 -A 1 | awk '/^\/dev\//{print $1}' || true)

echo "==> Remove old DMG temp images"
rm -f src-tauri/target/universal-apple-darwin/release/bundle/macos/rw.*.dmg || true

echo "==> Full clean build artifacts"
rm -rf dist src-tauri/target

echo "==> Rust targets (once is enough)"
rustup target add aarch64-apple-darwin x86_64-apple-darwin

echo "==> Install & build frontend"
npm ci
npm run build

echo "==> Build Tauri universal macOS"
if ! npm run tauri build -- --target universal-apple-darwin; then
  echo "WARN: DMG bundle failed. Falling back to app-only bundle..."
  npm run tauri build -- --target universal-apple-darwin --bundles app
fi

echo "==> Done"
ls -la src-tauri/target/universal-apple-darwin/release/bundle || true
