#pragma once

#include <string>
#include <vector>
#include "types.h"

namespace zen_engine_v2 {

struct AutocorrectResult {
  std::string text;
  std::size_t fix_count = 0;
};

class ReplacementEngine {
public:
  AutocorrectResult Apply(const std::string& text, const std::vector<Match>& matches) const;
};

class SuggestionBuilder {
public:
  std::vector<Suggestion> Build(const std::vector<Match>& matches) const;
};

} // namespace zen_engine_v2
