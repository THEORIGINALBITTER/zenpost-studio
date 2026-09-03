#!/bin/bash
# Baut ein macOS .pkg Installer für ZenPost Studio
# Verwendung: bash build_installer.sh
# Voraussetzung: `npm run tauri build` muss vorher gelaufen sein

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PAYLOAD_DIR="$SCRIPT_DIR/.pkg_build/payload/Applications"
SCRIPTS_DIR="$SCRIPT_DIR/.pkg_build/scripts"

# Universal-Build bevorzugen, sonst x64-Fallback
UNIVERSAL_APP="$SCRIPT_DIR/src-tauri/target/universal-apple-darwin/release/bundle/macos/ZenPost Studio.app"
X64_APP="$SCRIPT_DIR/src-tauri/target/release/bundle/macos/ZenPost Studio.app"

if [ -d "$UNIVERSAL_APP" ]; then
    APP_SOURCE="$UNIVERSAL_APP"
    OUTPUT_DIR="$SCRIPT_DIR/src-tauri/target/universal-apple-darwin/release/bundle"
    ARCH="universal"
else
    APP_SOURCE="$X64_APP"
    OUTPUT_DIR="$SCRIPT_DIR/src-tauri/target/release/bundle"
    ARCH="x64"
fi

# Version aus tauri.conf.json lesen
VERSION=$(grep '"version"' "$SCRIPT_DIR/src-tauri/tauri.conf.json" 2>/dev/null | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/' || echo "1.0.0")
PKG_NAME="ZenPost Studio_${VERSION}_${ARCH}.pkg"

echo "╔══════════════════════════════════════════╗"
echo "║   ZenPost Studio Installer Builder       ║"
echo "║   Version: $VERSION                       "
echo "╚══════════════════════════════════════════╝"
echo ""

# Prüfen ob App gebaut wurde
if [ ! -d "$APP_SOURCE" ]; then
    echo "FEHLER: App nicht gefunden unter:"
    echo "  $APP_SOURCE"
    echo ""
    echo "Bitte zuerst bauen: npm run tauri build"
    exit 1
fi

echo "App gefunden: $(du -sh "$APP_SOURCE" | cut -f1)"
echo ""

# Build-Verzeichnisse vorbereiten
rm -rf "$SCRIPT_DIR/.pkg_build"
mkdir -p "$PAYLOAD_DIR"
mkdir -p "$SCRIPTS_DIR"

# App als Payload kopieren
echo "Kopiere App..."
cp -R "$APP_SOURCE" "$PAYLOAD_DIR/"

# postinstall Skript schreiben
cat > "$SCRIPTS_DIR/postinstall" << 'POSTINSTALL'
#!/bin/bash
APP_PATH="/Applications/ZenPost Studio.app"
if [ -d "$APP_PATH" ]; then
    xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
    xattr -dr com.apple.metadata:kMDItemWhereFroms "$APP_PATH" 2>/dev/null || true
fi
exit 0
POSTINSTALL

chmod +x "$SCRIPTS_DIR/postinstall"

# .pkg bauen
echo "Baue Installer Package..."
pkgbuild \
    --root "$PAYLOAD_DIR/.." \
    --scripts "$SCRIPTS_DIR" \
    --identifier "de.denisbitter.zenpoststudio" \
    --version "$VERSION" \
    --install-location "/" \
    "$OUTPUT_DIR/$PKG_NAME"

# Aufräumen
rm -rf "$SCRIPT_DIR/.pkg_build"

echo ""
echo "✓ Installer fertig:"
echo "  $OUTPUT_DIR/$PKG_NAME"
echo "  Größe: $(du -sh "$OUTPUT_DIR/$PKG_NAME" | cut -f1)"
echo ""
echo "Der Nutzer doppelklickt das .pkg → App wird nach /Applications"
echo "installiert und sofort freigeschaltet."
