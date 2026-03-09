// Image Processing Engine
// Rust `image` crate für Transformationen + C++ zen_engine für schnelle Header-Analyse

use image::{ImageFormat, DynamicImage, imageops::FilterType};
use serde::{Deserialize, Serialize};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use std::io::Cursor;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub size_bytes: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResizeOptions {
    pub width: u32,
    pub height: u32,
    /// "fit" (aspect-ratio erhalten) oder "fill" (exakt)
    pub mode: Option<String>,
    /// Output-Format: "jpeg", "png", "webp"
    pub output_format: Option<String>,
    /// JPEG Qualität 1-100
    pub quality: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizeOptions {
    /// Maximale Breite — nur resizen wenn Bild größer
    pub max_width: u32,
    /// Maximale Höhe — nur resizen wenn Bild größer
    pub max_height: u32,
    /// Output-Format: "jpeg", "png", "webp" (default: "jpeg")
    pub output_format: Option<String>,
    /// Qualität 1-100 (default: 82)
    pub quality: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessedImage {
    pub data_url: String,   // base64 data URL
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub size_bytes: usize,
}

fn detect_format(data: &[u8]) -> Option<ImageFormat> {
    image::guess_format(data).ok()
}

pub fn get_image_info(data: &[u8]) -> Result<ImageInfo, String> {
    let format = detect_format(data)
        .ok_or_else(|| "Unbekanntes Bildformat".to_string())?;

    let img = image::load_from_memory(data)
        .map_err(|e| format!("Bild-Ladefehler: {}", e))?;

    Ok(ImageInfo {
        width: img.width(),
        height: img.height(),
        format: format!("{:?}", format),
        size_bytes: data.len(),
    })
}

pub fn resize_image(data: &[u8], opts: ResizeOptions) -> Result<ProcessedImage, String> {
    let img = image::load_from_memory(data)
        .map_err(|e| format!("Bild-Ladefehler: {}", e))?;

    let resized = match opts.mode.as_deref().unwrap_or("fit") {
        "fill" => img.resize_exact(opts.width, opts.height, FilterType::Lanczos3),
        _      => img.resize(opts.width, opts.height, FilterType::Lanczos3),
    };

    encode_image(resized, opts.output_format.as_deref(), opts.quality)
}

pub fn convert_image(data: &[u8], target_format: &str, quality: Option<u8>) -> Result<ProcessedImage, String> {
    let img = image::load_from_memory(data)
        .map_err(|e| format!("Bild-Ladefehler: {}", e))?;

    encode_image(img, Some(target_format), quality)
}

/// Optimiert ein Bild: resize nur wenn nötig, dann mit Qualität encoden.
/// Ideal für Mobile-Import und Export-Pipeline.
pub fn optimize_image(data: &[u8], opts: OptimizeOptions) -> Result<ProcessedImage, String> {
    let img = image::load_from_memory(data)
        .map_err(|e| format!("Bild-Ladefehler: {}", e))?;

    let needs_resize = img.width() > opts.max_width || img.height() > opts.max_height;
    let processed = if needs_resize {
        img.resize(opts.max_width, opts.max_height, FilterType::Lanczos3)
    } else {
        img
    };

    encode_image(processed, opts.output_format.as_deref(), opts.quality)
}

fn encode_image(img: DynamicImage, format: Option<&str>, quality: Option<u8>) -> Result<ProcessedImage, String> {
    let (fmt_name, mime) = match format.unwrap_or("jpeg") {
        "png"  => ("png",  "image/png"),
        "webp" => ("webp", "image/webp"),
        _      => ("jpeg", "image/jpeg"),
    };

    let width  = img.width();
    let height = img.height();

    let mut buf = Cursor::new(Vec::new());

    match fmt_name {
        "jpeg" => {
            use image::codecs::jpeg::JpegEncoder;
            let q = quality.unwrap_or(85);
            let encoder = JpegEncoder::new_with_quality(&mut buf, q);
            img.write_with_encoder(encoder)
                .map_err(|e| format!("JPEG-Encoding-Fehler: {}", e))?;
        }
        "png" => {
            img.write_to(&mut buf, ImageFormat::Png)
                .map_err(|e| format!("PNG-Encoding-Fehler: {}", e))?;
        }
        _ => {
            // WebP — image 0.25 nutzt lossy WebP via write_to
            img.write_to(&mut buf, ImageFormat::WebP)
                .map_err(|e| format!("WebP-Encoding-Fehler: {}", e))?;
        }
    }

    let bytes = buf.into_inner();
    let size  = bytes.len();
    let b64   = BASE64.encode(&bytes);
    let data_url = format!("data:{};base64,{}", mime, b64);

    Ok(ProcessedImage {
        data_url,
        width,
        height,
        format: fmt_name.to_uppercase(),
        size_bytes: size,
    })
}
