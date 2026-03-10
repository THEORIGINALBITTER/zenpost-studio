// Rule Engine — Rust-Bridge zur C++ zen_engine.cpp + zen_engine_v2
// Kapselt alle unsafe FFI-Aufrufe sicher

use serde::{Deserialize, Serialize};
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_uint};

// ── V1 FFI Structs (müssen exakt zu zen_engine.h passen) ─────────────────────

#[repr(C)]
struct CZenRuleMatch {
    rule_id:      *const c_char,
    matched_text: *const c_char,
    start:        c_uint,
    end:          c_uint,
    confidence:   f32,
}

#[repr(C)]
struct CZenRuleResult {
    matches:     *mut CZenRuleMatch,
    count:       c_uint,
    suggestions: *mut c_char,
}

#[repr(C)]
struct CZenAutofixResult {
    text:      *mut c_char,
    fix_count: c_uint,
}

extern "C" {
    fn zen_rules_analyze(text: *const c_char, rules_json: *const c_char) -> *mut CZenRuleResult;
    fn zen_rules_result_free(result: *mut CZenRuleResult);
    fn zen_rules_autofix(text: *const c_char, rules_json: *const c_char) -> *mut CZenAutofixResult;
    fn zen_rules_autofix_free(result: *mut CZenAutofixResult);
}

// ── V1 Rust-API ───────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RuleMatch {
    pub rule_id:      String,
    pub matched_text: String,
    pub start:        u32,
    pub end:          u32,
    pub confidence:   f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RuleAnalysisResult {
    pub matches:     Vec<RuleMatch>,
    pub suggestions: serde_json::Value,
    pub match_count: usize,
}

pub fn analyze_text(text: &str, rules_json: Option<&str>) -> Result<RuleAnalysisResult, String> {
    let c_text = CString::new(text)
        .map_err(|e| format!("Text-Encoding-Fehler: {}", e))?;

    let rules_str = rules_json.unwrap_or("[]");
    let c_rules = CString::new(rules_str)
        .map_err(|e| format!("Rules-Encoding-Fehler: {}", e))?;

    unsafe {
        let raw = zen_rules_analyze(c_text.as_ptr(), c_rules.as_ptr());

        if raw.is_null() {
            return Err("zen_rules_analyze gab null zurück".to_string());
        }

        let mut matches = Vec::new();
        let count = (*raw).count as usize;

        for i in 0..count {
            let m = &*(*raw).matches.add(i);
            matches.push(RuleMatch {
                rule_id:      cstr_to_string(m.rule_id),
                matched_text: cstr_to_string(m.matched_text),
                start:        m.start,
                end:          m.end,
                confidence:   m.confidence,
            });
        }

        let suggestions_str = if (*raw).suggestions.is_null() {
            "[]".to_string()
        } else {
            CStr::from_ptr((*raw).suggestions)
                .to_string_lossy()
                .into_owned()
        };

        zen_rules_result_free(raw);

        let suggestions: serde_json::Value = serde_json::from_str(&suggestions_str)
            .unwrap_or(serde_json::Value::Array(vec![]));

        let match_count = matches.len();
        Ok(RuleAnalysisResult { matches, suggestions, match_count })
    }
}

unsafe fn cstr_to_string(ptr: *const c_char) -> String {
    if ptr.is_null() {
        return String::new();
    }
    CStr::from_ptr(ptr).to_string_lossy().into_owned()
}

// ── Autofix (V1) ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct AutofixResult {
    pub text:      String,
    pub fix_count: u32,
}

pub fn autofix_text(text: &str, rules_json: Option<&str>) -> Result<AutofixResult, String> {
    let c_text = CString::new(text)
        .map_err(|e| format!("Text-Encoding-Fehler: {}", e))?;

    let rules_str = rules_json.unwrap_or("");
    let c_rules = CString::new(rules_str)
        .map_err(|e| format!("Rules-Encoding-Fehler: {}", e))?;

    unsafe {
        let raw = zen_rules_autofix(c_text.as_ptr(), c_rules.as_ptr());
        if raw.is_null() {
            return Err("zen_rules_autofix gab null zurück".to_string());
        }
        let text_out  = cstr_to_string((*raw).text);
        let fix_count = (*raw).fix_count;
        zen_rules_autofix_free(raw);
        Ok(AutofixResult { text: text_out, fix_count })
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// V2 FFI — zen_engine_v2_c.h
// ═════════════════════════════════════════════════════════════════════════════

/// Opaque handle — entspricht `zen_engine_v2_handle*` auf C-Seite.
enum OpaqueEngineV2 {}

/// Entspricht `zen_engine_v2_config`.
#[repr(C)]
struct CEngineV2Config {
    chunk_bytes:        usize,
    max_threads:        usize,
    enable_regex:       c_int,
    enable_autocorrect: c_int,
    enable_jit_regex:   c_int,
}

/// Entspricht `zen_engine_v2_result`.
#[repr(C)]
struct CEngineV2Result {
    json: *const c_char,
}

extern "C" {
    fn zen_engine_v2_create() -> *mut OpaqueEngineV2;
    fn zen_engine_v2_destroy(handle: *mut OpaqueEngineV2);
    fn zen_engine_v2_configure(handle: *mut OpaqueEngineV2, config: *const CEngineV2Config);
    fn zen_engine_v2_load_rules_json(
        handle: *mut OpaqueEngineV2,
        json:   *const c_char,
        error:  *mut *const c_char,
    ) -> c_int;
    fn zen_engine_v2_analyze(handle: *mut OpaqueEngineV2, text: *const c_char) -> CEngineV2Result;
    fn zen_engine_v2_autocorrect(handle: *mut OpaqueEngineV2, text: *const c_char) -> CEngineV2Result;
    fn zen_engine_v2_free_result(handle: *mut OpaqueEngineV2, result: CEngineV2Result);
}

// ── V2 Rust-Typen (entsprechen dem JSON-Format aus JsonBuilder::Build) ────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MatchV2 {
    pub rule_id:     String,
    pub snippet:     String,
    pub start:       usize,
    pub end:         usize,
    pub score:       f32,
    pub replacement: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SuggestionV2 {
    pub rule_id: String,
    pub text:    String,
    pub score:   f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResultV2 {
    pub matches:     Vec<MatchV2>,
    pub suggestions: Vec<SuggestionV2>,
    pub warnings:    Vec<String>,
    pub match_count: usize,
}

// ── V2 Rust-Typen (Autocorrect) ───────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct AutofixResultV2 {
    pub text:      String,
    pub fix_count: usize,
}

// ── Persistenter Engine-Handle ────────────────────────────────────────────────
//
// Wird einmal beim App-Start erzeugt und als Tauri-State gehalten.
// Builtins werden beim ersten `new()` geladen (Aho-Corasick-Trie aufgebaut).
// User-Rules: `ensure_rules()` vergleicht einen Hash — nur bei Änderung
// wird `zen_engine_v2_load_rules_json` erneut aufgerufen.

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

fn hash_str(s: &str) -> u64 {
    let mut h = DefaultHasher::new();
    s.hash(&mut h);
    h.finish()
}

pub struct EngineHandleV2 {
    ptr:          *mut OpaqueEngineV2,
    rules_hash:   u64,
}

// SAFETY: Der Mutex in ZenEngineState stellt sicher, dass immer nur ein
// Thread gleichzeitig auf den Handle zugreift.
unsafe impl Send for EngineHandleV2 {}

impl Drop for EngineHandleV2 {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe { zen_engine_v2_destroy(self.ptr); }
        }
    }
}

impl EngineHandleV2 {
    /// Erzeugt den C++-Handle, konfiguriert ihn und lädt die Builtin-Rules.
    pub fn new() -> Result<Self, String> {
        unsafe {
            let ptr = zen_engine_v2_create();
            if ptr.is_null() {
                return Err("zen_engine_v2_create returned null".to_string());
            }
            let cfg = CEngineV2Config {
                chunk_bytes:        50 * 1024,
                max_threads:        0,
                enable_regex:       1,
                enable_autocorrect: 1,
                enable_jit_regex:   0,
            };
            zen_engine_v2_configure(ptr, &cfg);

            // Builtins laden (leeres User-Rules-Array → C++ lädt nur Builtins)
            let empty = CString::new("[]").unwrap();
            let mut err_ptr: *const c_char = std::ptr::null();
            zen_engine_v2_load_rules_json(ptr, empty.as_ptr(), &mut err_ptr);

            Ok(Self { ptr, rules_hash: hash_str("[]") })
        }
    }

    /// Lädt User-Rules neu, wenn sich der Inhalt seit dem letzten Aufruf geändert hat.
    fn ensure_rules(&mut self, rules_json: &str) -> Result<(), String> {
        let h = hash_str(rules_json);
        if h == self.rules_hash {
            return Ok(());
        }
        let c_rules = CString::new(rules_json)
            .map_err(|e| format!("V2 Rules-Encoding-Fehler: {}", e))?;
        unsafe {
            let mut err_ptr: *const c_char = std::ptr::null();
            let ok = zen_engine_v2_load_rules_json(self.ptr, c_rules.as_ptr(), &mut err_ptr);
            if ok == 0 {
                let err = if err_ptr.is_null() {
                    "unbekannter Fehler".to_string()
                } else {
                    CStr::from_ptr(err_ptr).to_string_lossy().into_owned()
                };
                return Err(format!("V2 Rules-Ladefehler: {}", err));
            }
        }
        self.rules_hash = h;
        Ok(())
    }

    /// Text analysieren — lädt Rules nur neu wenn nötig.
    pub fn analyze(&mut self, text: &str, rules_json: &str) -> Result<AnalysisResultV2, String> {
        self.ensure_rules(rules_json)?;
        let c_text = CString::new(text)
            .map_err(|e| format!("V2 Text-Encoding-Fehler: {}", e))?;
        unsafe {
            let result = zen_engine_v2_analyze(self.ptr, c_text.as_ptr());
            let json_str = if result.json.is_null() {
                "{}".to_string()
            } else {
                CStr::from_ptr(result.json).to_string_lossy().into_owned()
            };
            zen_engine_v2_free_result(self.ptr, result);
            serde_json::from_str::<AnalysisResultV2>(&json_str).map_err(|e| {
                format!("V2 JSON-Parsefehler: {} | Raw: {}", e, &json_str[..json_str.len().min(200)])
            })
        }
    }

    /// Auto-Korrektur — lädt Rules nur neu wenn nötig.
    pub fn autocorrect(&mut self, text: &str, rules_json: &str) -> Result<AutofixResultV2, String> {
        self.ensure_rules(rules_json)?;
        let c_text = CString::new(text)
            .map_err(|e| format!("V2 Text-Encoding-Fehler: {}", e))?;
        unsafe {
            let result = zen_engine_v2_autocorrect(self.ptr, c_text.as_ptr());
            let json_str = if result.json.is_null() {
                format!("{{\"text\":\"{}\",\"fix_count\":0}}", text.replace('"', "\\\""))
            } else {
                CStr::from_ptr(result.json).to_string_lossy().into_owned()
            };
            zen_engine_v2_free_result(self.ptr, result);
            // C++ liefert {"text":"...","fix_count":N}
            #[derive(serde::Deserialize)]
            struct AcJson { text: String, fix_count: usize }
            let ac: AcJson = serde_json::from_str(&json_str).map_err(|e| {
                format!("V2 Autocorrect JSON-Parsefehler: {} | Raw: {}", e, &json_str[..json_str.len().min(200)])
            })?;
            Ok(AutofixResultV2 { text: ac.text, fix_count: ac.fix_count })
        }
    }
}
