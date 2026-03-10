#pragma once

#include <string>
#include "types.h"

namespace zen_engine_v2 {

class JsonBuilder {
public:
  std::string Build(const AnalysisResult& result) const;
};

class MatchFormatter {
public:
  std::string Format(const AnalysisResult& result) const;
};

} // namespace zen_engine_v2
