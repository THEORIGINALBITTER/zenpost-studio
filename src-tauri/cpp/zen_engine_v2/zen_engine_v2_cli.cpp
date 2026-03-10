#include <iostream>
#include <string>

#include "rule_loader.h"
#include "zen_engine_v2.h"

using zen_engine_v2::JSONRuleLoader;
using zen_engine_v2::ZenEngineV2;

int main(int argc, char** argv) {
  (void)argc;
  (void)argv;

  ZenEngineV2 engine;

  // TODO: parse args (rules path, input text, output format)
  const std::string rules_json = "{}";
  JSONRuleLoader loader(rules_json);
  std::string error;
  if (!engine.LoadRulesFromLoader(loader, &error)) {
    std::cerr << "Failed to load rules: " << error << "\n";
    return 1;
  }

  const std::string input = "Example text";
  const auto analysis = engine.Analyze(input);
  std::cout << engine.ToJson(analysis) << "\n";
  return 0;
}
