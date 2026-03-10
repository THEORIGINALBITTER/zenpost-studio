#include "output.h"

#include <sstream>

namespace zen_engine_v2 {

namespace {

static std::string esc(const std::string& s) {
  std::string out;
  out.reserve(s.size());
  for (unsigned char c : s) {
    if      (c == '"')  out += "\\\"";
    else if (c == '\\') out += "\\\\";
    else if (c == '\n') out += "\\n";
    else if (c == '\r') out += "\\r";
    else if (c == '\t') out += "\\t";
    else                out += static_cast<char>(c);
  }
  return out;
}

} // anonymous namespace

// ─── JsonBuilder ─────────────────────────────────────────────────────────────
//
// Serialises AnalysisResult to the V2 JSON wire format:
//
// {
//   "matches":     [{ "rule_id", "snippet", "start", "end", "score", "replacement" }],
//   "suggestions": [{ "rule_id", "text", "score" }],
//   "warnings":    ["..."],
//   "match_count": N
// }

std::string JsonBuilder::Build(const AnalysisResult& result) const {
  std::ostringstream o;
  o << "{";

  // matches
  o << "\"matches\":[";
  bool first = true;
  for (const auto& m : result.matches) {
    if (!first) o << ",";
    o << "{"
      << "\"rule_id\":\""     << esc(m.rule_id)     << "\","
      << "\"snippet\":\""     << esc(m.snippet)      << "\","
      << "\"start\":"         << m.start             << ","
      << "\"end\":"           << m.end               << ","
      << "\"score\":"         << m.score             << ","
      << "\"replacement\":\"" << esc(m.replacement)  << "\""
      << "}";
    first = false;
  }
  o << "],";

  // suggestions
  o << "\"suggestions\":[";
  first = true;
  for (const auto& s : result.suggestions) {
    if (!first) o << ",";
    o << "{"
      << "\"rule_id\":\"" << esc(s.rule_id) << "\","
      << "\"text\":\""    << esc(s.text)    << "\","
      << "\"score\":"     << s.score
      << "}";
    first = false;
  }
  o << "],";

  // warnings
  o << "\"warnings\":[";
  first = true;
  for (const auto& w : result.warnings) {
    if (!first) o << ",";
    o << "\"" << esc(w) << "\"";
    first = false;
  }
  o << "],";

  o << "\"match_count\":" << result.matches.size();
  o << "}";
  return o.str();
}

// ─── MatchFormatter ───────────────────────────────────────────────────────────
// Human-readable one-line-per-match output (for CLI / debug use).

std::string MatchFormatter::Format(const AnalysisResult& result) const {
  std::ostringstream o;
  for (const auto& m : result.matches) {
    o << "[" << m.start << "-" << m.end << "] "
      << m.rule_id << ": \"" << m.snippet << "\"";
    if (!m.replacement.empty())
      o << " → \"" << m.replacement << "\"";
    o << " (score=" << m.score << ")\n";
  }
  return o.str();
}

} // namespace zen_engine_v2
