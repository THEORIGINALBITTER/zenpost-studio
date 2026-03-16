mod engine;

use tauri::Emitter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use engine::{markdown, image_proc, rules};

// ─── SFTP Upload ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SftpUploadRequest {
    pub host: String,
    pub port: Option<u16>,
    pub user: String,
    pub password: String,
    pub local_path: String,
    pub remote_path: String, // full remote path incl. filename
}

#[tauri::command]
async fn sftp_upload(req: SftpUploadRequest) -> Result<(), String> {
    use ssh2::Session;
    use std::net::TcpStream;
    use std::path::Path;

    let port = req.port.unwrap_or(22);
    let addr = format!("{}:{}", req.host, port);

    let tcp = TcpStream::connect(&addr)
        .map_err(|e| format!("Verbindung zu {} fehlgeschlagen: {}", addr, e))?;

    let mut sess = Session::new()
        .map_err(|e| format!("SSH Session konnte nicht erstellt werden: {}", e))?;
    sess.set_tcp_stream(tcp);
    sess.handshake()
        .map_err(|e| format!("SSH Handshake fehlgeschlagen: {}", e))?;
    sess.userauth_password(&req.user, &req.password)
        .map_err(|e| format!("SFTP Authentifizierung fehlgeschlagen: {}", e))?;

    if !sess.authenticated() {
        return Err("SFTP: Authentifizierung abgelehnt (falsches Passwort oder Benutzer)".into());
    }

    let sftp = sess.sftp()
        .map_err(|e| format!("SFTP Subsystem konnte nicht gestartet werden: {}", e))?;

    // Ensure remote directory exists
    let remote = Path::new(&req.remote_path);
    if let Some(parent) = remote.parent() {
        let _ = sftp.mkdir(parent, 0o755); // ignore error if already exists
    }

    let content = std::fs::read(&req.local_path)
        .map_err(|e| format!("Lokale Datei konnte nicht gelesen werden: {}", e))?;

    let mut remote_file = sftp.create(remote)
        .map_err(|e| format!("Remote-Datei konnte nicht erstellt werden ({}): {}", req.remote_path, e))?;

    use std::io::Write;
    remote_file.write_all(&content)
        .map_err(|e| format!("Upload fehlgeschlagen: {}", e))?;

    Ok(())
}

/// Persistenter ZenEngine-V2-Handle — einmal beim App-Start erzeugt,
/// wird als Tauri-State gehalten. Rules werden nur bei Änderung neu geladen.
pub struct ZenEngineState(pub Mutex<rules::EngineHandleV2>);

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

#[tauri::command]
fn engine_autofix_text(
    text: String,
    rules_json: Option<String>,
) -> Result<rules::AutofixResult, String> {
    rules::autofix_text(&text, rules_json.as_deref())
}

#[tauri::command]
fn engine_analyze_text_v2(
    state: tauri::State<ZenEngineState>,
    text: String,
    rules_json: Option<String>,
) -> Result<rules::AnalysisResultV2, String> {
    let mut handle = state.0.lock().map_err(|_| "ZenEngine state poisoned".to_string())?;
    handle.analyze(&text, rules_json.as_deref().unwrap_or("[]"))
}

#[tauri::command]
fn engine_autofix_text_v2(
    state: tauri::State<ZenEngineState>,
    text: String,
    rules_json: Option<String>,
) -> Result<rules::AutofixResultV2, String> {
    let mut handle = state.0.lock().map_err(|_| "ZenEngine state poisoned".to_string())?;
    handle.autocorrect(&text, rules_json.as_deref().unwrap_or("[]"))
}

// ─────────────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Persistenten V2-Engine-Handle einmalig erzeugen (lädt Builtin-Rules)
  let zen_engine = rules::EngineHandleV2::new()
      .expect("ZenEngine V2 init failed");

  tauri::Builder::default()
    .manage(ZenEngineState(Mutex::new(zen_engine)))
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
        http_fetch,
        print_current_window,
        sftp_upload,
        // ZenEngine
        engine_version,
        engine_render_markdown,
        engine_markdown_to_plain,
        engine_image_info,
        engine_image_resize,
        engine_image_convert,
        engine_image_optimize,
        engine_analyze_text,
        engine_autofix_text,
        engine_analyze_text_v2,
        engine_autofix_text_v2,
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
