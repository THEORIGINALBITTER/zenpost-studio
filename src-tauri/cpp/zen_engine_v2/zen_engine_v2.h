#pragma once

#include <string>
#include "analyzer.h"
#include "autocorrect.h"
#include "output.h"
#include "rule_index.h"
#include "rule_loader.h"
#include "types.h"

namespace zen_engine_v2 {

class ZenEngineV2 {
public:
  ZenEngineV2();
  ~ZenEngineV2();

  void Configure(const EngineConfig& config);
  bool LoadRules(const RuleSet& rules, std::string* error);
  bool LoadRulesFromLoader(RuleLoader& loader, std::string* error);
  AnalysisResult Analyze(const std::string& text) const;
  AutocorrectResult Autocorrect(const std::string& text, const AnalysisResult& analysis) const;
  std::string ToJson(const AnalysisResult& analysis) const;
  std::string FormatMatches(const AnalysisResult& analysis) const;
  void Clear();

private:
  EngineConfig config_;
  RuleSet rules_;
  RuleIndex index_;
  Analyzer* analyzer_ = nullptr;
  ReplacementEngine replacement_;
  SuggestionBuilder suggestions_;
  JsonBuilder json_;
  MatchFormatter formatter_;
};

} // namespace zen_engine_v2
