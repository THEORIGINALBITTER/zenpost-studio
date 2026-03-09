// Rule Engine — Rust-Bridge zur C++ zen_engine.cpp
// Kapselt alle unsafe FFI-Aufrufe sicher

use serde::{Deserialize, Serialize};
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_uint};

// FFI Structs (müssen exakt zu zen_engine.h passen)
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

extern "C" {
    fn zen_rules_analyze(text: *const c_char, rules_json: *const c_char) -> *mut CZenRuleResult;
    fn zen_rules_result_free(result: *mut CZenRuleResult);
}

// Rust-API

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
