mod engine;

use tauri::Emitter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use engine::{markdown, image_proc, rules};

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

/// Generic HTTP fetch command - bypasses JS HTTP plugin scope issues
#[tauri::command]
async fn http_fetch(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();

    let mut req_builder = match request.method.to_uppercase().as_str() {
        "GET" => client.get(&request.url),
        "POST" => client.post(&request.url),
        "PUT" => client.put(&request.url),
        "DELETE" => client.delete(&request.url),
        "PATCH" => client.patch(&request.url),
        _ => return Err(format!("Unsupported HTTP method: {}", request.method)),
    };

    // Add headers
    for (key, value) in request.headers {
        req_builder = req_builder.header(&key, &value);
    }

    // Add body if present
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    // Execute request
    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok(HttpResponse { status, body })
}

#[tauri::command]
fn print_current_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| format!("Print failed: {}", e))
}

// ─── ZenEngine Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn engine_version() -> String {
    engine::engine_version()
}

#[tauri::command]
fn engine_render_markdown(
    input: String,
    options: Option<markdown::MarkdownOptions>,
) -> Result<markdown::MarkdownResult, String> {
    Ok(markdown::render_markdown(&input, options))
}

#[tauri::command]
fn engine_markdown_to_plain(input: String) -> String {
    markdown::markdown_to_plain(&input)
}

#[tauri::command]
fn engine_image_info(data: Vec<u8>) -> Result<image_proc::ImageInfo, String> {
    image_proc::get_image_info(&data)
}

#[tauri::command]
fn engine_image_resize(
    data: Vec<u8>,
    options: image_proc::ResizeOptions,
) -> Result<image_proc::ProcessedImage, String> {
    image_proc::resize_image(&data, options)
}

#[tauri::command]
fn engine_image_convert(
    data: Vec<u8>,
    format: String,
    quality: Option<u8>,
) -> Result<image_proc::ProcessedImage, String> {
    image_proc::convert_image(&data, &format, quality)
}

#[tauri::command]
fn engine_image_optimize(
    data: Vec<u8>,
    options: image_proc::OptimizeOptions,
) -> Result<image_proc::ProcessedImage, String> {
    image_proc::optimize_image(&data, options)
}

#[tauri::command]
fn engine_analyze_text(
    text: String,
    rules_json: Option<String>,
) -> Result<rules::RuleAnalysisResult, String> {
    rules::analyze_text(&text, rules_json.as_deref())
}

// ─────────────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
        http_fetch,
        print_current_window,
        // ZenEngine
        engine_version,
        engine_render_markdown,
        engine_markdown_to_plain,
        engine_image_info,
        engine_image_resize,
        engine_image_convert,
        engine_image_optimize,
        engine_analyze_text,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Setup menu event handler for About
      #[cfg(target_os = "macos")]
      {
        let app_handle = app.handle().clone();
        app.on_menu_event(move |_app, event| {
          if event.id().as_ref() == "about" {
            let _ = app_handle.emit("show-about", ());
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
