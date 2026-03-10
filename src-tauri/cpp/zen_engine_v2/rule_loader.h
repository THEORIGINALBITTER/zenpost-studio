#pragma once

#include <string>
#include "types.h"

namespace zen_engine_v2 {

class RuleLoader {
public:
  virtual ~RuleLoader() = default;
  virtual bool Load(RuleSet& out_rules, std::string* error) = 0;
};

class JSONRuleLoader final : public RuleLoader {
public:
  explicit JSONRuleLoader(std::string json_source);
  bool Load(RuleSet& out_rules, std::string* error) override;

private:
  std::string json_source_;
};

class PluginRuleLoader final : public RuleLoader {
public:
  explicit PluginRuleLoader(std::string plugin_path);
  bool Load(RuleSet& out_rules, std::string* error) override;

private:
  std::string plugin_path_;
};

class BuiltinRuleLoader final : public RuleLoader {
public:
  BuiltinRuleLoader() = default;
  bool Load(RuleSet& out_rules, std::string* error) override;
};

} // namespace zen_engine_v2
