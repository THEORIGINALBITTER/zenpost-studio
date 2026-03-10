#include "analyzer.h"

#include <algorithm>
#include <future>

namespace zen_engine_v2 {

// ─── TextChunker ─────────────────────────────────────────────────────────────
//
// Splits text at paragraph boundaries so chunks stay near chunk_bytes.
// Falls back to the whole text as one chunk if no boundary is found.

std::vector<std::string> TextChunker::Split(const std::string& text,
                                             std::size_t chunk_bytes) const {
  if (text.size() <= chunk_bytes) return {text};

  std::vector<std::string> chunks;
  std::size_t start = 0;
  while (start < text.size()) {
    std::size_t end = start + chunk_bytes;
    if (end >= text.size()) {
      chunks.push_back(text.substr(start));
      break;
    }
    // Walk back to the nearest paragraph break ("\n\n") so we don't cut mid-sentence
    std::size_t boundary = text.rfind("\n\n", end);
    if (boundary == std::string::npos || boundary <= start) {
      // No paragraph break found — cut at last newline instead
      boundary = text.rfind('\n', end);
    }
    if (boundary == std::string::npos || boundary <= start) {
      // No newline at all — hard cut at chunk_bytes
      boundary = end;
    } else {
      boundary += 1;  // include the newline in the current chunk
    }
    chunks.push_back(text.substr(start, boundary - start));
    start = boundary;
  }
  return chunks;
}

// ─── ACScanner ───────────────────────────────────────────────────────────────

std::vector<Match> ACScanner::Scan(const std::string& text) const {
  return trie_.Scan(text);
}

// ─── RegexScanner ─────────────────────────────────────────────────────────────

std::vector<Match> RegexScanner::Scan(const std::string& text) const {
  return index_.Scan(text);
}

// ─── MatchMerger ─────────────────────────────────────────────────────────────
//
// Flattens all batch results, sorts by position, then removes overlapping
// matches — keeping the highest-scoring match when two overlap.

std::vector<Match> MatchMerger::Merge(
    const std::vector<std::vector<Match>>& batches) const {
  std::vector<Match> all;
  for (const auto& batch : batches)
    all.insert(all.end(), batch.begin(), batch.end());

  if (all.size() <= 1) return all;

  // Sort: by start ascending, then by score descending (best match wins)
  std::sort(all.begin(), all.end(), [](const Match& a, const Match& b) {
    return a.start != b.start ? a.start < b.start : a.score > b.score;
  });

  // Remove overlapping matches (greedy, left-to-right)
  std::vector<Match> out;
  out.reserve(all.size());
  std::size_t last_end = 0;
  for (auto& m : all) {
    if (m.start >= last_end) {
      last_end = m.end;
      out.push_back(std::move(m));
    }
  }
  return out;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

Analyzer::Analyzer(const RuleIndex& index, const EngineConfig& config)
    : index_(index), config_(config) {}

AnalysisResult Analyzer::Analyze(const std::string& text) const {
  AnalysisResult result;
  const auto chunks = chunker_.Split(text, config_.chunk_bytes);

  ACScanner    ac_scanner(index_.StringIndex());
  RegexScanner re_scanner(index_.Regex());

  std::vector<std::vector<Match>> batch_matches;
  batch_matches.reserve(chunks.size());

  std::size_t offset = 0;
  for (const auto& chunk : chunks) {
    std::vector<Match> matches = ac_scanner.Scan(chunk);

    if (config_.enable_regex) {
      // Run regex in parallel when there are multiple large chunks
      if (chunks.size() > 1) {
        auto fut = std::async(std::launch::async,
            [&re_scanner, &chunk]() { return re_scanner.Scan(chunk); });
        // (AC result already computed above — overlap with regex thread)
        auto re_matches = fut.get();
        matches.insert(matches.end(), re_matches.begin(), re_matches.end());
      } else {
        const auto re_matches = re_scanner.Scan(chunk);
        matches.insert(matches.end(), re_matches.begin(), re_matches.end());
      }
    }

    // Adjust match positions for chunks that start at an offset in the full text
    if (offset > 0) {
      for (auto& m : matches) {
        m.start += offset;
        m.end   += offset;
      }
    }

    batch_matches.push_back(std::move(matches));
    offset += chunk.size();
  }

  result.matches = merger_.Merge(batch_matches);

  // Build suggestion list from matches (one suggestion per unique rule_id)
  std::unordered_map<std::string, bool> seen;
  for (const auto& m : result.matches) {
    if (seen.count(m.rule_id)) continue;
    seen[m.rule_id] = true;
    const Rule* r = index_.Lookup().Find(m.rule_id);
    if (!r) continue;
    Suggestion s;
    s.rule_id = r->id;
    s.text    = r->message;
    s.score   = r->score;
    result.suggestions.push_back(std::move(s));
  }

  return result;
}

} // namespace zen_engine_v2
