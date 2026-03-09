// Markdown Engine — nutzt comrak (CommonMark-kompatibel, identisch zu cmark)
// comrak ist der Rust-Port von cmark mit Extensions

use comrak::{markdown_to_html, Options};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MarkdownOptions {
    /// GitHub Flavored Markdown Extensions aktivieren
    pub gfm: Option<bool>,
    /// Strikethrough (~~ ~~)
    pub strikethrough: Option<bool>,
    /// Tabellen
    pub tables: Option<bool>,
    /// Autolinks
    pub autolink: Option<bool>,
    /// Task-Listen [ ] [x]
    pub tasklists: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MarkdownResult {
    pub html: String,
    pub char_count: usize,
    pub word_count: usize,
    pub line_count: usize,
}

pub fn render_markdown(input: &str, opts: Option<MarkdownOptions>) -> MarkdownResult {
    let mut options = Options::default();

    let use_gfm = opts.as_ref().and_then(|o| o.gfm).unwrap_or(true);

    if use_gfm {
        options.extension.strikethrough = opts.as_ref().and_then(|o| o.strikethrough).unwrap_or(true);
        options.extension.table        = opts.as_ref().and_then(|o| o.tables).unwrap_or(true);
        options.extension.autolink     = opts.as_ref().and_then(|o| o.autolink).unwrap_or(true);
        options.extension.tasklist     = opts.as_ref().and_then(|o| o.tasklists).unwrap_or(true);
    }

    // Sicheres HTML-Rendering (unsafe HTML disabled by default in comrak)
    options.render.unsafe_ = false;

    let html = markdown_to_html(input, &options);

    let word_count = input
        .split_whitespace()
        .count();

    MarkdownResult {
        html,
        char_count: input.chars().count(),
        word_count,
        line_count: input.lines().count(),
    }
}

/// Extrahiert Plain-Text aus Markdown (entfernt alle Syntax-Zeichen)
pub fn markdown_to_plain(input: &str) -> String {
    // Einfache Strategie: render zu HTML, dann Tags strippen
    let mut opts = Options::default();
    opts.render.unsafe_ = false;
    let html = markdown_to_html(input, &opts);

    // HTML Tags entfernen
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(ch),
            _ => {}
        }
    }
    result.trim().to_string()
}
