#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Cleanup stuck DMG mounts (if any)"
hdiutil info | grep -E "rw\\..*\\.dmg|ZenPost Studio" -B 2 -A 1 | awk '/^\\/dev\\//{print $1}' | while read -r dev; do
  echo "Detaching $dev"
  hdiutil detach "$dev" || true
done

echo "==> Remove old DMG temp images"
rm -f src-tauri/target/universal-apple-darwin/release/bundle/macos/rw.*.dmg || true

echo "==> Rust targets (once is enough)"
rustup target add aarch64-apple-darwin x86_64-apple-darwin

echo "==> Install & build frontend"
npm ci
npm run build

echo "==> Build Tauri universal macOS"
npm run tauri build -- --target universal-apple-darwin

echo "==> Done"
ls -la src-tauri/target/universal-apple-darwin/release/bundle || true
