# Export Complex Test

This fixture is designed to stress all export formats with mixed structures.

## Section A: Rich Text

This paragraph contains **bold**, _italic_, `inline-code`, and a link to [OpenAI](https://openai.com).

Another paragraph with punctuation: äöü ß € emulation and mixed symbols.

## Section B: Nested-Like Lists

- Parent A
- Parent B
- Parent C

1. First ordered item
2. Second ordered item
3. Third ordered item

## Section C: Quote + Rule

> "Good exports are predictable exports."

---

## Section D: Code Samples

```json
{
  "name": "zenpost-export-test",
  "version": "1.0.0",
  "formats": ["html", "pdf", "md", "txt", "docx", "rtf", "odt", "epub"]
}
```

```bash
npm run build
npm run release -- v1.0.6
```

## Section E: Table

| Format   | Status | Notes                  |
|----------|--------|------------------------|
| HTML     | OK     | Rendered in browser    |
| PDF      | OK     | Pagination checked     |
| DOCX     | TODO   | Verify heading styles  |
| RTF      | TODO   | Verify bullet output   |
| ODT      | TODO   | Verify LibreOffice     |
| EPUB     | TODO   | Verify TOC/navigation  |

## Section F: Closing

Final paragraph to ensure trailing content is not truncated in any export format.

