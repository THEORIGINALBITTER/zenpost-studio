#include "zen_engine_v2_c.h"

#include <sstream>
#include <string>
#include "rule_loader.h"
#include "zen_engine_v2.h"

using zen_engine_v2::EngineConfig;
using zen_engine_v2::JSONRuleLoader;
using zen_engine_v2::ZenEngineV2;

// Minimal JSON-String-Escaping (nur für autocorrect-Ergebnis benötigt)
static std::string json_esc(const std::string& s) {
  std::string out;
  out.reserve(s.size());
  for (unsigned char c : s) {
    if      (c == '"')  out += "\\\"";
    else if (c == '\\') out += "\\\\";
    else if (c == '\n') out += "\\n";
    else if (c == '\r') out += "\\r";
    else if (c == '\t') out += "\\t";
    else                out += static_cast<char>(c);
  }
  return out;
}

struct zen_engine_v2_handle {
  ZenEngineV2 engine;
  std::string last_json;
  std::string last_error;
};

zen_engine_v2_handle* zen_engine_v2_create() {
  return new zen_engine_v2_handle();
}

void zen_engine_v2_destroy(zen_engine_v2_handle* handle) {
  delete handle;
}

void zen_engine_v2_configure(zen_engine_v2_handle* handle, const zen_engine_v2_config* config) {
  if (!handle || !config) return;
  EngineConfig cfg;
  cfg.chunk_bytes = config->chunk_bytes;
  cfg.max_threads = config->max_threads;
  cfg.enable_regex = config->enable_regex != 0;
  cfg.enable_autocorrect = config->enable_autocorrect != 0;
  cfg.enable_jit_regex = config->enable_jit_regex != 0;
  handle->engine.Configure(cfg);
}

int zen_engine_v2_load_rules_json(zen_engine_v2_handle* handle, const char* json, const char** error) {
  if (!handle || !json) return 0;
  JSONRuleLoader loader(json);
  std::string err;
  const bool ok = handle->engine.LoadRulesFromLoader(loader, &err);
  handle->last_error = err;
  if (error) *error = handle->last_error.c_str();
  return ok ? 1 : 0;
}

zen_engine_v2_result zen_engine_v2_analyze(zen_engine_v2_handle* handle, const char* text) {
  zen_engine_v2_result result{};
  if (!handle || !text) return result;
  const auto analysis = handle->engine.Analyze(text);
  handle->last_json = handle->engine.ToJson(analysis);
  result.json = handle->last_json.c_str();
  return result;
}

void zen_engine_v2_free_result(zen_engine_v2_handle* handle, zen_engine_v2_result result) {
  (void)result;
  if (!handle) return;
  handle->last_json.clear();
}

zen_engine_v2_result zen_engine_v2_autocorrect(zen_engine_v2_handle* handle, const char* text) {
  zen_engine_v2_result result{};
  if (!handle || !text) return result;
  const auto analysis      = handle->engine.Analyze(text);
  const auto ac            = handle->engine.Autocorrect(text, analysis);
  // Serialize as {"text":"...","fix_count":N} so Rust can read both values
  std::ostringstream o;
  o << "{\"text\":\"" << json_esc(ac.text)
    << "\",\"fix_count\":" << ac.fix_count << "}";
  handle->last_json = o.str();
  result.json       = handle->last_json.c_str();
  return result;
}
