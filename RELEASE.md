# Release Guide

This repo ships releases via GitHub Actions on tag push.

## Quick Release
1. Ensure `package.json` version is updated if needed.
2. Create and push a tag:

```bash
npm run release -- v1.0.2
```

## What Happens
- GitHub Actions builds:
  - macOS universal
  - Windows MSI
  - Linux AppImage
- All artifacts are uploaded to the GitHub Release for the tag.

## Notes
- The workflow is defined in `.github/workflows/release-tauri.yml`.
- CI builds (Artifacts only) are in `.github/workflows/tauri-build.yml`.
