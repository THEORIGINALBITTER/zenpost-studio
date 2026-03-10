#include "zen_engine_v2.h"

namespace zen_engine_v2 {

// Lädt Builtin-Rules und baut den Index beim ersten Analyze() automatisch auf.
static void ensure_builtin(RuleSet& rules, RuleIndex& index,
                            const EngineConfig& config, Analyzer*& analyzer) {
  if (!rules.rules.empty()) return;
  BuiltinRuleLoader loader;
  loader.Load(rules, nullptr);
  index.Build(rules, config);
  delete analyzer;
  analyzer = new Analyzer(index, config);
}

ZenEngineV2::ZenEngineV2() {
  analyzer_ = new Analyzer(index_, config_);
}

ZenEngineV2::~ZenEngineV2() {
  delete analyzer_;
  analyzer_ = nullptr;
}

void ZenEngineV2::Configure(const EngineConfig& config) {
  config_ = config;
  if (analyzer_) {
    delete analyzer_;
    analyzer_ = nullptr;
  }
  analyzer_ = new Analyzer(index_, config_);
}

bool ZenEngineV2::LoadRules(const RuleSet& rules, std::string* error) {
  rules_ = rules;
  index_.Build(rules_, config_);
  if (analyzer_) {
    delete analyzer_;
    analyzer_ = nullptr;
  }
  analyzer_ = new Analyzer(index_, config_);
  if (error) *error = "";
  return true;
}

bool ZenEngineV2::LoadRulesFromLoader(RuleLoader& loader, std::string* error) {
  // 1. Builtins zuerst laden — stehen immer als Basis zur Verfügung
  RuleSet merged;
  BuiltinRuleLoader builtin;
  builtin.Load(merged, nullptr);

  // 2. User-Rules laden
  RuleSet user_rules;
  if (!loader.Load(user_rules, error)) return false;

  // 3. User-Rules obendrauf mergen — gleiche id überschreibt Builtin
  for (auto& r : user_rules.rules) {
    merged.by_id[r.id] = r;
    merged.rules.push_back(std::move(r));
  }

  return LoadRules(merged, error);
}

AnalysisResult ZenEngineV2::Analyze(const std::string& text) const {
  // const_cast: lazy init ist intern, nach außen hin unbeobachtbar
  ensure_builtin(const_cast<RuleSet&>(rules_),
                 const_cast<RuleIndex&>(index_),
                 config_,
                 const_cast<Analyzer*&>(analyzer_));
  if (!analyzer_) return {};
  return analyzer_->Analyze(text);
}

AutocorrectResult ZenEngineV2::Autocorrect(const std::string& text, const AnalysisResult& analysis) const {
  if (!config_.enable_autocorrect) return {text, 0};
  return replacement_.Apply(text, analysis.matches);
}

std::string ZenEngineV2::ToJson(const AnalysisResult& analysis) const {
  return json_.Build(analysis);
}

std::string ZenEngineV2::FormatMatches(const AnalysisResult& analysis) const {
  return formatter_.Format(analysis);
}

void ZenEngineV2::Clear() {
  rules_ = RuleSet{};
  index_.Clear();
}

} // namespace zen_engine_v2
