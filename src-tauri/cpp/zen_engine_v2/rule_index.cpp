#include "rule_index.h"

#include <algorithm>
#include <queue>

namespace zen_engine_v2 {

// ─── AhoCorasickTrie ──────────────────────────────────────────────────────────

void AhoCorasickTrie::Build(const std::vector<Rule>& rules) {
  nodes_.clear();
  rules_.clear();
  nodes_.emplace_back();  // root = state 0

  // Insert all kString patterns into the trie
  for (const auto& r : rules) {
    if (r.type != RuleType::kString || r.pattern.empty()) continue;
    const uint32_t rule_idx = static_cast<uint32_t>(rules_.size());
    rules_.push_back(r);

    int cur = 0;
    for (unsigned char c : r.pattern) {
      auto it = nodes_[cur].ch.find(c);
      if (it == nodes_[cur].ch.end()) {
        nodes_[cur].ch[c] = static_cast<int>(nodes_.size());
        nodes_.emplace_back();
        cur = static_cast<int>(nodes_.size()) - 1;
      } else {
        cur = it->second;
      }
    }
    nodes_[cur].out.push_back(rule_idx);
  }

  // BFS: build failure links + merge outputs (standard Aho-Corasick)
  std::queue<int> q;
  for (auto& [c, v] : nodes_[0].ch) {
    nodes_[v].fail = 0;
    q.push(v);
  }
  while (!q.empty()) {
    int u = q.front(); q.pop();
    for (auto& [c, v] : nodes_[u].ch) {
      q.push(v);
      int f = nodes_[u].fail;
      while (f != 0 && nodes_[f].ch.find(c) == nodes_[f].ch.end())
        f = nodes_[f].fail;
      auto it = nodes_[f].ch.find(c);
      nodes_[v].fail = (it != nodes_[f].ch.end() && it->second != v)
                       ? it->second : 0;
      // Inherit output of failure state (handles overlapping patterns)
      for (auto o : nodes_[nodes_[v].fail].out)
        nodes_[v].out.push_back(o);
    }
  }
}

void AhoCorasickTrie::Clear() {
  nodes_.clear();
  rules_.clear();
}

// ASCII alnum + underscore + UTF-8 continuation/lead bytes = word character
static bool is_word_char(unsigned char c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
         (c >= '0' && c <= '9') || c == '_' || c >= 0x80;
}

std::vector<Match> AhoCorasickTrie::Scan(const std::string& text) const {
  std::vector<Match> out;
  if (nodes_.size() <= 1) return out;
  out.reserve(32);

  int cur = 0;
  for (std::size_t i = 0; i < text.size(); ++i) {
    const unsigned char c = static_cast<unsigned char>(text[i]);
    while (cur != 0 && nodes_[cur].ch.find(c) == nodes_[cur].ch.end())
      cur = nodes_[cur].fail;
    auto it = nodes_[cur].ch.find(c);
    if (it != nodes_[cur].ch.end()) cur = it->second;

    for (uint32_t ri : nodes_[cur].out) {
      const Rule& r = rules_[ri];
      const std::size_t plen  = r.pattern.size();
      const std::size_t start = i + 1 - plen;

      // Word boundary check (identical to V1 logic)
      if (r.word_boundary) {
        const bool left_ok  = (start == 0) ||
                              !is_word_char(static_cast<unsigned char>(text[start - 1]));
        const bool right_ok = (i + 1 >= text.size()) ||
                              !is_word_char(static_cast<unsigned char>(text[i + 1]));
        if (!left_ok || !right_ok) continue;
      }

      Match m;
      m.rule_id     = r.id;
      m.start       = start;
      m.end         = i + 1;
      m.score       = r.score;
      m.snippet     = text.substr(start, plen);
      m.replacement = r.replacement;
      out.push_back(std::move(m));
    }
  }
  return out;
}

bool AhoCorasickTrie::Empty() const {
  return nodes_.size() <= 1;
}

// ─── RegexIndex ───────────────────────────────────────────────────────────────

void RegexIndex::Build(const std::vector<Rule>& rules, bool enable_jit) {
  (void)enable_jit;  // placeholder for future PCRE2/JIT support
  compiled_.clear();

  for (const auto& r : rules) {
    if (r.type != RuleType::kRegex || r.pattern.empty()) continue;
    try {
      compiled_.emplace_back(r,
          std::regex(r.pattern, std::regex::ECMAScript));
    } catch (const std::regex_error&) { /* skip invalid patterns */ }
  }
}

void RegexIndex::Clear() {
  compiled_.clear();
}

std::vector<Match> RegexIndex::Scan(const std::string& text) const {
  std::vector<Match> out;
  for (const auto& [rule, re] : compiled_) {
    try {
      const auto end = std::sregex_iterator();
      for (auto it = std::sregex_iterator(text.begin(), text.end(), re);
           it != end; ++it) {
        Match m;
        m.rule_id     = rule.id;
        m.start       = static_cast<std::size_t>(it->position());
        m.end         = m.start + static_cast<std::size_t>(it->length());
        m.score       = rule.score;
        m.snippet     = it->str();
        m.replacement = rule.replacement;
        out.push_back(std::move(m));
      }
    } catch (const std::regex_error&) {}
  }
  return out;
}

bool RegexIndex::Empty() const {
  return compiled_.empty();
}

// ─── RuleLookup ───────────────────────────────────────────────────────────────

void RuleLookup::Build(const std::vector<Rule>& rules) {
  rules_.clear();
  rules_.reserve(rules.size());
  for (const auto& rule : rules) rules_[rule.id] = rule;
}

const Rule* RuleLookup::Find(const std::string& rule_id) const {
  const auto it = rules_.find(rule_id);
  return (it == rules_.end()) ? nullptr : &it->second;
}

void RuleLookup::Clear() {
  rules_.clear();
}

// ─── RuleIndex ────────────────────────────────────────────────────────────────

void RuleIndex::Build(const RuleSet& rules, const EngineConfig& config) {
  lookup_.Build(rules.rules);
  ac_trie_.Build(rules.rules);
  if (config.enable_regex)
    regex_index_.Build(rules.rules, config.enable_jit_regex);
}

void RuleIndex::Clear() {
  lookup_.Clear();
  ac_trie_.Clear();
  regex_index_.Clear();
}

} // namespace zen_engine_v2
