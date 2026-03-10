#pragma once

#include <regex>
#include <string>
#include <unordered_map>
#include <vector>
#include "types.h"

namespace zen_engine_v2 {

// ─── AhoCorasickTrie ──────────────────────────────────────────────────────────
// Processes all kString rules in a single O(n) pass over the input text.

class AhoCorasickTrie {
public:
  void Build(const std::vector<Rule>& rules);
  void Clear();
  std::vector<Match> Scan(const std::string& text) const;
  bool Empty() const;

private:
  struct Node {
    std::unordered_map<unsigned char, int> ch;
    int fail = 0;
    std::vector<uint32_t> out;  // indices into rules_
  };
  std::vector<Node> nodes_;
  std::vector<Rule> rules_;  // only kString rules, indexed by out entries
};

// ─── RegexIndex ───────────────────────────────────────────────────────────────
// Compiles all kRegex rules once; scans each text with all compiled regexes.

class RegexIndex {
public:
  void Build(const std::vector<Rule>& rules, bool enable_jit);
  void Clear();
  std::vector<Match> Scan(const std::string& text) const;
  bool Empty() const;

private:
  std::vector<std::pair<Rule, std::regex>> compiled_;
};

// ─── RuleLookup ───────────────────────────────────────────────────────────────
// O(1) lookup of any Rule by its id.

class RuleLookup {
public:
  void Build(const std::vector<Rule>& rules);
  const Rule* Find(const std::string& rule_id) const;
  void Clear();

private:
  std::unordered_map<std::string, Rule> rules_;
};

// ─── RuleIndex ────────────────────────────────────────────────────────────────
// Top-level index: builds and owns AC trie, regex index, and lookup table.

class RuleIndex {
public:
  void Build(const RuleSet& rules, const EngineConfig& config);
  void Clear();

  const AhoCorasickTrie& StringIndex() const { return ac_trie_; }
  const RegexIndex& Regex() const { return regex_index_; }
  const RuleLookup& Lookup() const { return lookup_; }

private:
  AhoCorasickTrie ac_trie_;
  RegexIndex regex_index_;
  RuleLookup lookup_;
};

} // namespace zen_engine_v2
