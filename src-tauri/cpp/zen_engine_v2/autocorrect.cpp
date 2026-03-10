#include "autocorrect.h"

#include <algorithm>

namespace zen_engine_v2 {

// ─── ReplacementEngine ───────────────────────────────────────────────────────
//
// Wendet alle Matches mit nicht-leerem replacement-Feld auf den Text an.
// Verarbeitet Matches von rechts nach links, damit Positionen durch frühere
// Ersetzungen nicht verschoben werden.

AutocorrectResult ReplacementEngine::Apply(const std::string& text,
                                            const std::vector<Match>& matches) const {
  // Nur Matches mit Replacement + innerhalb des Textes
  std::vector<const Match*> fixable;
  fixable.reserve(matches.size());
  for (const auto& m : matches) {
    if (!m.replacement.empty() && m.start <= text.size() && m.end <= text.size())
      fixable.push_back(&m);
  }
  if (fixable.empty()) return {text, 0};

  // Absteigend nach start sortieren → rechts-nach-links ersetzen
  std::sort(fixable.begin(), fixable.end(),
            [](const Match* a, const Match* b) { return a->start > b->start; });

  std::string result = text;
  std::size_t guard = std::string::npos;  // Anfang des zuletzt bearbeiteten Matches
  std::size_t applied = 0;

  for (const Match* m : fixable) {
    // Überlappende Matches überspringen (end des aktuellen > start des letzten)
    if (guard != std::string::npos && m->end > guard) continue;
    result.replace(m->start, m->end - m->start, m->replacement);
    guard = m->start;
    ++applied;
  }
  return {result, applied};
}

// ─── SuggestionBuilder ────────────────────────────────────────────────────────
// Baut deduplizierte Suggestions aus einem Match-Array.
// (Im normalen Analyse-Pfad übernimmt der Analyzer diese Aufgabe;
//  SuggestionBuilder dient als eigenständiger Hilfspfad z.B. für Tests.)

std::vector<Suggestion> SuggestionBuilder::Build(
    const std::vector<Match>& matches) const {
  std::vector<Suggestion> out;
  std::unordered_map<std::string, bool> seen;
  for (const auto& m : matches) {
    if (seen.count(m.rule_id)) continue;
    seen[m.rule_id] = true;
    Suggestion s;
    s.rule_id = m.rule_id;
    s.score   = m.score;
    // message ist nicht im Match gespeichert — hier leer, Analyzer füllt es via RuleLookup
    out.push_back(std::move(s));
  }
  return out;
}

} // namespace zen_engine_v2
