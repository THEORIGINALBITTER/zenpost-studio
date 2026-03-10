#pragma once

#include <string>
#include <vector>
#include "rule_index.h"
#include "types.h"

namespace zen_engine_v2 {

class TextChunker {
public:
  std::vector<std::string> Split(const std::string& text, std::size_t chunk_bytes) const;
};

class ACScanner {
public:
  explicit ACScanner(const AhoCorasickTrie& trie) : trie_(trie) {}
  std::vector<Match> Scan(const std::string& text) const;

private:
  const AhoCorasickTrie& trie_;
};

class RegexScanner {
public:
  explicit RegexScanner(const RegexIndex& index) : index_(index) {}
  std::vector<Match> Scan(const std::string& text) const;

private:
  const RegexIndex& index_;
};

class MatchMerger {
public:
  std::vector<Match> Merge(const std::vector<std::vector<Match>>& batches) const;
};

class Analyzer {
public:
  Analyzer(const RuleIndex& index, const EngineConfig& config);
  AnalysisResult Analyze(const std::string& text) const;

private:
  const RuleIndex& index_;
  EngineConfig config_;
  TextChunker chunker_;
  MatchMerger merger_;
};

} // namespace zen_engine_v2
