#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

namespace zen_engine_v2 {

enum class RuleType {
  kString = 0,
  kRegex = 1
};

enum class RuleSource {
  kBuiltin = 0,
  kJson = 1,
  kPlugin = 2
};

struct Rule {
  std::string id;
  RuleType type = RuleType::kString;
  RuleSource source = RuleSource::kBuiltin;
  std::string pattern;
  std::string message;
  std::string replacement;
  float score = 1.0f;
  bool word_boundary = false;  // only match at word boundaries (kString rules)
};

struct Match {
  std::string rule_id;
  std::size_t start = 0;
  std::size_t end = 0;
  float score = 1.0f;
  std::string snippet;
  std::string replacement;
};

struct Suggestion {
  std::string rule_id;
  std::string text;
  float score = 1.0f;
};

struct AnalysisResult {
  std::vector<Match> matches;
  std::vector<Suggestion> suggestions;
  std::vector<std::string> warnings;
};

struct EngineConfig {
  std::size_t chunk_bytes = 50 * 1024;
  std::size_t max_threads = 0; // 0 = auto
  bool enable_regex = true;
  bool enable_autocorrect = false;
  bool enable_jit_regex = false;
};

struct RuleSet {
  std::vector<Rule> rules;
  std::unordered_map<std::string, Rule> by_id;
};

} // namespace zen_engine_v2
