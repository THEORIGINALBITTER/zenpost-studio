# Export QA Checklist

## Scope

This checklist validates export quality for all supported formats in `ZenExportModal`:

- HTML
- PDF
- Markdown
- Text
- DOCX
- RTF
- ODT
- EPUB

## Test Data

Use these fixtures:

- `docs/fixtures/export-smoke.md`
- `docs/fixtures/export-complex.md`

## Flow

1. Open Doc Studio.
2. Load fixture content into editor.
3. Open `Export & Veröffentlichen`.
4. Export each format once.
5. Open exported files in native apps:
   - HTML: browser
   - PDF: Preview/Acrobat
   - MD/TXT: text editor
   - DOCX: Word/LibreOffice
   - RTF: TextEdit/Word
   - ODT: LibreOffice/OnlyOffice
   - EPUB: Books/Calibre

## Global Acceptance

- Export does not fail.
- Filename uses source name (not generic `EXPORT` if a source name exists).
- File extension is correct.
- Text encoding is readable (no mojibake).

## Format-Specific Checks

### HTML

- Headings render as headings.
- Lists render as `<ul>/<ol>`.
- Code blocks render in `pre/code`.
- Links are clickable.
- Tables are rendered as tables.

### PDF

- No clipped text on normal pages.
- Headings visibly distinct.
- Lists and code blocks readable.
- Table content readable.

### Markdown

- Source markdown preserved.
- No unexpected mutation.

### Text

- Markdown markers removed (`#`, `**`, list bullets syntax, backticks).
- Content remains readable plain text.

### DOCX

- Opens without repair dialog.
- Headings become heading styles.
- Bullet lists visible.
- Code blocks readable monospaced.

### RTF

- Opens in TextEdit/Word.
- Heading emphasis visible.
- Bullets readable.
- No broken control characters.

### ODT

- Opens in LibreOffice without warnings.
- Paragraphs/headings/lists preserved.
- Blockquotes/code blocks remain readable.

### EPUB

- Opens in EPUB reader.
- TOC/nav works.
- Main chapter displays all content.
- Styling is readable on light/dark reader themes.

## Regression Notes

Capture issues as:

- Format
- Fixture
- Symptom
- Expected
- Screenshot/file sample

