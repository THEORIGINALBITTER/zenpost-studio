#include "zen_engine.h"
#include <cstring>
#include <cstdlib>
#include <string>
#include <vector>
#include <algorithm>
#include <sstream>
#include <regex>
#include <unordered_map>
#include <queue>
#include <future>
#include <mutex>

// ─── Version ──────────────────────────────────────────────────────────────────

const char* zen_engine_version() {
    return "ZenEngine/2.0.0-aho-corasick";
}

// ─── Rule ─────────────────────────────────────────────────────────────────────

struct Rule {
    std::string              id;
    std::string              pattern;
    std::string              suggestion;
    float                    confidence    = 0.8f;
    std::vector<std::string> replacements;
    bool                     is_user_rule  = false;
    bool                     is_regex      = false;
    bool                     word_boundary = false;
};

// ─── MatchResult ──────────────────────────────────────────────────────────────

struct MatchResult {
    std::string rule_id;
    std::string matched_text;
    uint32_t    rule_idx   = 0;
    uint32_t    start      = 0;
    uint32_t    end        = 0;
    float       confidence = 0.f;
};

// ─── Aho-Corasick Multi-Pattern Matcher ───────────────────────────────────────
//
// Processes all non-regex rules in a single O(n) pass over the input text.
// Supports 10 000+ patterns with minimal memory by using unordered_map per node.

class AhoCorasick {
    struct Node {
        std::unordered_map<unsigned char, int> ch;
        int                  fail = 0;
        std::vector<uint32_t> out; // rule indices that end at this node
    };

    std::vector<Node> nodes_;

    static bool is_wchar(unsigned char c) {
        // Treat ASCII alnum, underscore, and UTF-8 continuation/lead bytes as word chars
        return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
               (c >= '0' && c <= '9') || c == '_' || c >= 0x80;
    }

public:
    void reset() {
        nodes_.clear();
        nodes_.emplace_back(); // root = state 0
    }

    void insert(const std::string& pat, uint32_t rule_idx) {
        int cur = 0;
        for (unsigned char c : pat) {
            auto it = nodes_[cur].ch.find(c);
            if (it == nodes_[cur].ch.end()) {
                nodes_[cur].ch[c] = (int)nodes_.size();
                nodes_.emplace_back();
                cur = (int)nodes_.size() - 1;
            } else {
                cur = it->second;
            }
        }
        nodes_[cur].out.push_back(rule_idx);
    }

    // BFS-build of failure links + output merging (standard Aho-Corasick)
    void build_failure() {
        std::queue<int> q;
        for (auto& [c, v] : nodes_[0].ch) {
            nodes_[v].fail = 0;
            q.push(v);
        }
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (auto& [c, v] : nodes_[u].ch) {
                q.push(v);
                // Walk failure chain of u to find longest proper suffix of u+c
                int f = nodes_[u].fail;
                while (f != 0 && nodes_[f].ch.find(c) == nodes_[f].ch.end())
                    f = nodes_[f].fail;
                auto it = nodes_[f].ch.find(c);
                nodes_[v].fail = (it != nodes_[f].ch.end() && it->second != v)
                               ? it->second : 0;
                // Inherit outputs from fail state (handles overlapping patterns)
                for (auto o : nodes_[nodes_[v].fail].out)
                    nodes_[v].out.push_back(o);
            }
        }
    }

    void search(const std::string& text,
                const std::vector<Rule>& rules,
                std::vector<MatchResult>& out) const {
        if (nodes_.size() <= 1) return;
        int cur = 0;
        for (size_t i = 0; i < text.size(); ++i) {
            unsigned char c = (unsigned char)text[i];
            // Follow failure links until we find a valid transition or root
            while (cur != 0 && nodes_[cur].ch.find(c) == nodes_[cur].ch.end())
                cur = nodes_[cur].fail;
            auto it = nodes_[cur].ch.find(c);
            if (it != nodes_[cur].ch.end()) cur = it->second;
            // Emit all patterns that end at position i
            for (uint32_t ri : nodes_[cur].out) {
                const Rule& r    = rules[ri];
                uint32_t   plen  = (uint32_t)r.pattern.size();
                uint32_t   s     = (uint32_t)(i + 1) - plen;
                // Word boundary check
                if (r.word_boundary) {
                    bool lb = (s == 0) || !is_wchar((unsigned char)text[s - 1]);
                    bool rb = (i + 1 >= text.size()) || !is_wchar((unsigned char)text[i + 1]);
                    if (!lb || !rb) continue;
                }
                out.push_back({ r.id, r.pattern, ri, s, (uint32_t)(i + 1), r.confidence });
            }
        }
    }

    bool empty() const { return nodes_.size() <= 1; }
};

// ─── RuleEngine ───────────────────────────────────────────────────────────────
//
// Combines Aho-Corasick (substring rules) + compiled-once regex rules.
// Regex rules are run in parallel when count > 4.

struct RuleEngine {
    std::vector<Rule>                          rules;
    AhoCorasick                                ac;
    std::vector<std::pair<uint32_t, std::regex>> compiled_re; // (rule_idx, regex)

    void build(std::vector<Rule> r) {
        rules = std::move(r);
        ac.reset();
        compiled_re.clear();
        compiled_re.reserve(16);

        for (uint32_t i = 0; i < (uint32_t)rules.size(); ++i) {
            const Rule& rule = rules[i];
            if (rule.is_regex) {
                try {
                    compiled_re.emplace_back(i,
                        std::regex(rule.pattern, std::regex::ECMAScript));
                } catch (const std::regex_error&) { /* skip invalid */ }
            } else if (!rule.pattern.empty()) {
                ac.insert(rule.pattern, i);
            }
        }
        ac.build_failure();
    }

    std::vector<MatchResult> analyze(const std::string& text) const {
        std::vector<MatchResult> results;
        results.reserve(64);

        // Pass 1: Aho-Corasick — all substring rules, one pass O(n)
        ac.search(text, rules, results);

        // Pass 2: Regex rules (compiled once, parallel if > 4)
        if (!compiled_re.empty()) {
            if (compiled_re.size() <= 4) {
                run_regex(text, 0, compiled_re.size(), results);
            } else {
                size_t half = compiled_re.size() / 2;
                std::vector<MatchResult> r2;
                auto fut = std::async(std::launch::async,
                    [this, &text, half]() -> std::vector<MatchResult> {
                        std::vector<MatchResult> r1;
                        run_regex(text, 0, half, r1);
                        return r1;
                    });
                run_regex(text, half, compiled_re.size(), r2);
                auto r1 = fut.get();
                results.insert(results.end(), r1.begin(), r1.end());
                results.insert(results.end(), r2.begin(), r2.end());
            }
        }

        // Pass 3: Sort + deduplicate overlapping matches
        deduplicate(results);
        return results;
    }

private:
    void run_regex(const std::string& text, size_t from, size_t to,
                   std::vector<MatchResult>& out) const {
        for (size_t ci = from; ci < to; ++ci) {
            const uint32_t    ri = compiled_re[ci].first;
            const std::regex& re = compiled_re[ci].second;
            const Rule&        r = rules[ri];
            try {
                auto begin = std::sregex_iterator(text.begin(), text.end(), re);
                auto end   = std::sregex_iterator();
                for (auto it = begin; it != end; ++it) {
                    out.push_back({
                        r.id, it->str(), ri,
                        (uint32_t)it->position(),
                        (uint32_t)(it->position() + it->length()),
                        r.confidence
                    });
                }
            } catch (const std::regex_error&) {}
        }
    }

    // Sort by position, remove overlapping matches (keep highest confidence first)
    static void deduplicate(std::vector<MatchResult>& m) {
        if (m.size() <= 1) return;
        std::sort(m.begin(), m.end(), [](const MatchResult& a, const MatchResult& b) {
            return a.start != b.start ? a.start < b.start : a.confidence > b.confidence;
        });
        std::vector<MatchResult> out;
        out.reserve(m.size());
        uint32_t last_end = 0;
        for (auto& r : m) {
            if (r.start >= last_end) {
                last_end = r.end;
                out.push_back(std::move(r));
            }
        }
        m = std::move(out);
    }
};

// ─── Global Engine Cache (rebuilt only when user rules change) ────────────────

static std::mutex  g_mutex;
static std::string g_user_key;
static RuleEngine  g_engine;

// ─── Built-in Rules ───────────────────────────────────────────────────────────
// Field order: {id, pattern, suggestion, confidence, replacements,
//               is_user_rule, is_regex, word_boundary}

static std::vector<Rule> built_in_rules() {
    return {
        // ── Passive Voice (word boundary) ──────────────────────────────────────
        { "passive_voice", "wurde",   "Aktive Formulierung bevorzugen", 0.75f, {}, false, false, true },
        { "passive_voice", "wurden",  "Aktive Formulierung bevorzugen", 0.75f, {}, false, false, true },
        { "passive_voice", "worden",  "Aktive Formulierung bevorzugen", 0.75f, {}, false, false, true },
        { "passive_voice", "wird",    "Aktive Formulierung bevorzugen", 0.70f, {}, false, false, true },
        { "passive_voice", "werden",  "Aktive Formulierung bevorzugen", 0.70f, {}, false, false, true },

        // ── Füllwörter (word boundary, trailing spaces entfernt) ───────────────
        { "filler_word", "eigentlich",       "Füllwort entfernen", 0.85f, {}, false, false, true },
        { "filler_word", "irgendwie",        "Füllwort entfernen", 0.85f, {}, false, false, true },
        { "filler_word", "halt",             "Füllwort entfernen", 0.80f, {}, false, false, true },
        { "filler_word", "eben",             "Füllwort entfernen", 0.80f, {}, false, false, true },
        { "filler_word", "sozusagen",        "Füllwort entfernen", 0.85f, {}, false, false, true },
        { "filler_word", "quasi",            "Füllwort entfernen", 0.80f, {}, false, false, true },
        { "filler_word", "gewissermaßen",    "Füllwort entfernen", 0.85f, {}, false, false, true },
        { "filler_word", "irgendwann",       "Konkreten Zeitpunkt nennen", 0.75f, {}, false, false, true },
        { "filler_word", "irgendein",        "Füllwort konkretisieren",    0.75f, {}, false, false, true },
        { "filler_word", "irgendwelch",      "Füllwort konkretisieren",    0.75f, {}, false, false, true },
        { "filler_word", "übrigens",         "Füllwort entfernen", 0.80f, {}, false, false, true },
        { "filler_word", "bekanntlich",      "Annahme nicht als selbstverständlich setzen", 0.80f, {}, false, false, true },
        { "filler_word", "selbstverständlich","Füllwort entfernen — konkret begründen", 0.75f, {}, false, false, true },
        { "filler_word", "natürlich",        "Füllwort entfernen — konkret begründen", 0.70f, {}, false, false, true },
        { "filler_word", "ja",               "Füllwort entfernen", 0.65f, {}, false, false, true },
        { "filler_word", "mal",              "Füllwort entfernen", 0.60f, {}, false, false, true },

        // ── Schwache Intensivierungen (word boundary) ──────────────────────────
        { "weak_word", "sehr",          "Stärkeres Wort wählen",          0.70f, {}, false, false, true },
        { "weak_word", "wirklich",      "Stärkeres Wort wählen",          0.70f, {}, false, false, true },
        { "weak_word", "tatsächlich",   "Konkreter formulieren",           0.65f, {}, false, false, true },
        { "weak_word", "einfach",       "Konkreter formulieren",           0.60f, {}, false, false, true },
        { "weak_word", "grundsätzlich", "Einschränkung konkretisieren",    0.60f, {}, false, false, true },
        { "weak_word", "prinzipiell",   "Einschränkung konkretisieren",    0.60f, {}, false, false, true },
        { "weak_word", "ziemlich",      "Stärkeres Wort wählen",          0.65f, {}, false, false, true },
        { "weak_word", "relativ",       "Konkreten Wert nennen",           0.60f, {}, false, false, true },

        // ── Nominalstil (word boundary) ────────────────────────────────────────
        { "nominal_style", "Durchführung",   "Aktiv formulieren: 'durchführen'",   0.75f, {}, false, false, true },
        { "nominal_style", "Verwendung",     "Aktiv formulieren: 'verwenden'",     0.75f, {}, false, false, true },
        { "nominal_style", "Umsetzung",      "Aktiv formulieren: 'umsetzen'",      0.75f, {}, false, false, true },
        { "nominal_style", "Bearbeitung",    "Aktiv formulieren: 'bearbeiten'",    0.75f, {}, false, false, true },
        { "nominal_style", "Erstellung",     "Aktiv formulieren: 'erstellen'",     0.75f, {}, false, false, true },
        { "nominal_style", "Überprüfung",    "Aktiv formulieren: 'überprüfen'",    0.75f, {}, false, false, true },
        { "nominal_style", "Optimierung",    "Aktiv formulieren: 'optimieren'",    0.70f, {}, false, false, true },
        { "nominal_style", "Verbesserung",   "Aktiv formulieren: 'verbessern'",    0.70f, {}, false, false, true },
        { "nominal_style", "Implementierung","Aktiv formulieren: 'implementieren'",0.70f, {}, false, false, true },
        { "nominal_style", "Bereitstellung", "Aktiv formulieren: 'bereitstellen'", 0.70f, {}, false, false, true },

        // ── Anglizismen (word boundary) ────────────────────────────────────────
        { "anglicism", "Deadline",     "'Frist' oder 'Abgabetermin' verwenden",    0.70f, {}, false, false, true },
        { "anglicism", "Meeting",      "'Besprechung' oder 'Treffen' verwenden",   0.60f, {}, false, false, true },
        { "anglicism", "Feedback",     "'Rückmeldung' erwägen",                    0.50f, {}, false, false, true },
        { "anglicism", "Workflow",     "'Arbeitsablauf' erwägen",                  0.55f, {}, false, false, true },
        { "anglicism", "Brainstorming","'Ideenfindung' erwägen",                   0.60f, {}, false, false, true },
        { "anglicism", "Roadmap",      "'Fahrplan' erwägen",                       0.60f, {}, false, false, true },
        { "anglicism", "Rollout",      "'Einführung' oder 'Auslieferung' erwägen", 0.65f, {}, false, false, true },
        { "anglicism", "Pipeline",     "'Prozesskette' oder 'Verbindung' erwägen", 0.65f, {}, false, false, true },

        // ── Klammern-Missbrauch (Regex) ────────────────────────────────────────
        { "bracket_overuse",
          "\\([^)]{40,}\\)",
          "Langer Einschub in Klammern — als eigenen Satz formulieren", 0.75f,
          {}, false, true },
        { "bracket_overuse",
          "\\([^)]+\\)[^.!?\\n]{0,30}\\([^)]+\\)",
          "Mehrere Klammerzusätze im Satz — vereinfachen", 0.70f,
          {}, false, true },

        // ── Zu lange Sätze (Regex) ─────────────────────────────────────────────
        { "sentence_too_long",
          "[A-Za-z\u00c0-\u024f][^.!?\\n]{180,}[.!?]",
          "Satz zu lang — in kürzere Sätze aufteilen", 0.80f,
          {}, false, true },

        // ── Klischees ──────────────────────────────────────────────────────────
        { "cliche", "am Ende des Tages",         "Phrase ersetzen — konkret formulieren",          0.85f },
        { "cliche", "auf der grünen Wiese",       "Phrase ersetzen — Kontext benennen",             0.85f },
        { "cliche", "win-win",                    "'Vorteil für alle' konkret benennen",            0.80f },
        { "cliche", "Mehrwert",                   "Konkreten Nutzen benennen",                      0.75f, {}, false, false, true },
        { "cliche", "proaktiv",                   "Konkretes Verhalten beschreiben",                0.75f, {}, false, false, true },
        { "cliche", "auf Augenhöhe",              "Konkrete Zusammenarbeit beschreiben",            0.80f },
        { "cliche", "das i-Tüpfelchen",           "Direkter formulieren",                           0.80f },
        { "cliche", "außerhalb der Komfortzone",  "Konkrete Herausforderung beschreiben",           0.80f },
        { "cliche", "Synergie",                   "Konkreten gemeinsamen Nutzen benennen",          0.75f, {}, false, false, true },
        { "cliche", "agil",                       "Konkretes Vorgehen beschreiben",                 0.65f, {}, false, false, true },
        { "cliche", "disruptiv",                  "Konkreten Wandel beschreiben",                   0.70f, {}, false, false, true },
        { "cliche", "innovativ",                  "Konkreten Unterschied benennen",                 0.60f, {}, false, false, true },

        // ── Redundanzen / Pleonasmen ───────────────────────────────────────────
        { "redundancy", "bereits schon",      "'bereits' oder 'schon' — nicht beides",    0.90f },
        { "redundancy", "schon bereits",      "'bereits' oder 'schon' — nicht beides",    0.90f },
        { "redundancy", "völlig kostenlos",   "'kostenlos' genügt",                        0.90f },
        { "redundancy", "gratis kostenlos",   "'kostenlos' oder 'gratis' — nicht beides", 0.90f },
        { "redundancy", "Endresultat",        "'Ergebnis' oder 'Resultat' genügt",        0.85f, {}, false, false, true },
        { "redundancy", "Endprodukt",         "'Produkt' oder 'Ergebnis' genügt",         0.80f, {}, false, false, true },
        { "redundancy", "rückwirkend zurück", "'rückwirkend' genügt",                     0.90f },
        { "redundancy", "neu eröffnet",       "'eröffnet' impliziert Neuheit",            0.80f },
        { "redundancy", "weißer Schimmel",    "Schimmel ist immer weiß — Pleonasmus",    0.95f },
        { "redundancy", "alter Veteran",      "Veteran impliziert Erfahrung — Pleonasmus",0.90f },
        { "redundancy", "persönlich anwesend","'anwesend' genügt",                        0.85f },

        // ── Doppelwörter (Regex — neu) ─────────────────────────────────────────
        { "double_word",
          "\\b([A-Za-z\u00c0-\u024f]{3,})\\s+\\1\\b",
          "Doppelwort — eines davon entfernen", 0.95f,
          {}, false, true },

        // ── Leerzeichen vor Satzzeichen (neu) ─────────────────────────────────
        { "space_before_punct", " ,", "Leerzeichen vor Komma entfernen",          0.95f },
        { "space_before_punct", " .", "Leerzeichen vor Punkt entfernen",          0.92f },
        { "space_before_punct", " !", "Leerzeichen vor Ausrufezeichen entfernen", 0.95f },
        { "space_before_punct", " ?", "Leerzeichen vor Fragezeichen entfernen",   0.95f },
        { "space_before_punct", " :", "Leerzeichen vor Doppelpunkt entfernen",    0.90f },
        { "space_before_punct", " ;", "Leerzeichen vor Semikolon entfernen",      0.90f },

        // ── Fehlendes Leerzeichen nach Komma (Regex — neu) ────────────────────
        { "missing_space_after_comma",
          ",[A-Za-z\u00c0-\u024f]",
          "Leerzeichen nach Komma fehlt", 0.88f,
          {}, false, true },

        // ── Satzanfang klein (Regex — neu) ────────────────────────────────────
        { "lowercase_sentence_start",
          "[.!?]\\s+[a-z]",
          "Satzanfang sollte großgeschrieben werden", 0.85f,
          {}, false, true },

        // ── Wortwiederholung in Nähe (Regex) ──────────────────────────────────
        { "word_repetition",
          "\\b([A-Za-z\u00c0-\u024f]{5,})\\b.{1,60}\\b\\1\\b",
          "Wort zu nah wiederholt — Synonym verwenden", 0.70f,
          {}, false, true },

        // ── Formatierungsprobleme ──────────────────────────────────────────────
        { "double_space",        "  ", "Doppelte Leerzeichen entfernen",         1.00f },
        { "exclamation_overuse", "!!", "Mehrfach-Ausrufezeichen reduzieren",     0.90f },
        { "exclamation_overuse", "!?", "Gemischte Satzzeichen vermeiden",        0.85f },
        { "exclamation_overuse", "?!", "Gemischte Satzzeichen vermeiden",        0.85f },
        { "exclamation_overuse", "??", "Mehrfach-Fragezeichen reduzieren",       0.90f },
    };
}

// ─── JSON Helpers ──────────────────────────────────────────────────────────────

static std::string escape_json_str(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (unsigned char c : s) {
        if      (c == '"')  out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else                out += (char)c;
    }
    return out;
}

// ─── User Rules Parser ─────────────────────────────────────────────────────────
// Parst JSON-Array: [{"pattern":"...","suggestion":"...","confidence":0.8,
//                     "replacements":[...],"is_regex":true,"word_boundary":false}]

static std::vector<Rule> parse_user_rules(const std::string& json) {
    std::vector<Rule> rules;
    if (json.size() < 2) return rules;

    size_t pos = 0;
    while (true) {
        size_t obj_start = json.find('{', pos);
        if (obj_start == std::string::npos) break;
        size_t obj_end = json.find('}', obj_start);
        if (obj_end == std::string::npos) break;

        std::string obj = json.substr(obj_start, obj_end - obj_start + 1);

        auto get_str = [&](const std::string& key) -> std::string {
            std::string needle = "\"" + key + "\":\"";
            size_t p = obj.find(needle);
            if (p == std::string::npos) return "";
            p += needle.size();
            size_t e = p;
            while (e < obj.size()) {
                if (obj[e] == '\\') { e += 2; continue; }
                if (obj[e] == '"') break;
                e++;
            }
            return obj.substr(p, e - p);
        };

        auto get_float = [&](const std::string& key) -> float {
            std::string needle = "\"" + key + "\":";
            size_t p = obj.find(needle);
            if (p == std::string::npos) return 0.8f;
            p += needle.size();
            try { return std::stof(obj.substr(p)); }
            catch (...) { return 0.8f; }
        };

        auto get_bool = [&](const std::string& key) -> bool {
            std::string needle = "\"" + key + "\":";
            size_t p = obj.find(needle);
            if (p == std::string::npos) return false;
            p += needle.size();
            while (p < obj.size() && obj[p] == ' ') p++;
            return obj.compare(p, 4, "true") == 0;
        };

        Rule r;
        r.id            = "user_rule";
        r.is_user_rule  = true;
        r.pattern       = get_str("pattern");
        r.suggestion    = get_str("suggestion");
        r.confidence    = get_float("confidence");
        r.is_regex      = get_bool("is_regex");
        r.word_boundary = get_bool("word_boundary");

        // Parse replacements array
        std::string rep_needle = "\"replacements\":[";
        size_t rp = obj.find(rep_needle);
        if (rp != std::string::npos) {
            rp += rep_needle.size();
            size_t re = obj.find(']', rp);
            if (re != std::string::npos) {
                std::string arr = obj.substr(rp, re - rp);
                size_t ap = 0;
                while (true) {
                    size_t qs = arr.find('"', ap);
                    if (qs == std::string::npos) break;
                    qs++;
                    size_t qe = qs;
                    while (qe < arr.size()) {
                        if (arr[qe] == '\\') { qe += 2; continue; }
                        if (arr[qe] == '"') break;
                        qe++;
                    }
                    if (qe <= arr.size()) r.replacements.push_back(arr.substr(qs, qe - qs));
                    ap = qe + 1;
                }
            }
        }

        if (!r.pattern.empty()) rules.push_back(std::move(r));
        pos = obj_end + 1;
    }
    return rules;
}

// ─── Build Suggestions JSON (O(1) rule lookup via rule_idx) ───────────────────

static char* build_suggestions_json(const std::vector<Rule>& rules,
                                     const std::vector<MatchResult>& matches) {
    std::ostringstream json;
    json << "[";
    bool first = true;
    for (const auto& m : matches) {
        const Rule& r = rules[m.rule_idx]; // O(1) — no linear scan
        if (!first) json << ",";
        json << "{"
             << "\"rule\":\""         << escape_json_str(r.id)           << "\","
             << "\"matched_text\":\"" << escape_json_str(m.matched_text) << "\","
             << "\"suggestion\":\""   << escape_json_str(r.suggestion)   << "\","
             << "\"confidence\":"     << r.confidence                    << ","
             << "\"start\":"          << m.start                         << ","
             << "\"end\":"            << m.end                           << ","
             << "\"replacements\":[";
        bool firstRep = true;
        for (const auto& rep : r.replacements) {
            if (!firstRep) json << ",";
            json << "\"" << escape_json_str(rep) << "\"";
            firstRep = false;
        }
        json << "]";
        if (r.is_user_rule) json << ",\"is_user_rule\":true";
        json << "}";
        first = false;
    }
    json << "]";
    std::string s = json.str();
    char* out = new char[s.size() + 1];
    std::copy(s.begin(), s.end(), out);
    out[s.size()] = '\0';
    return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

ZenRuleResult* zen_rules_analyze(const char* text, const char* rules_json) {
    std::string input(text ? text : "");
    std::string user_key(rules_json && rules_json[0] ? rules_json : "");

    // Rebuild engine only when user rules change (regex compilation is expensive)
    {
        std::lock_guard<std::mutex> lock(g_mutex);
        if (g_engine.rules.empty() || g_user_key != user_key) {
            auto rules = built_in_rules();
            if (!user_key.empty()) {
                auto user_rules = parse_user_rules(user_key);
                rules.insert(rules.end(), user_rules.begin(), user_rules.end());
            }
            g_engine.build(std::move(rules));
            g_user_key = user_key;
        }
    }

    auto matches = g_engine.analyze(input);

    ZenRuleResult* result  = new ZenRuleResult();
    result->count          = static_cast<uint32_t>(matches.size());
    result->matches        = new ZenRuleMatch[matches.size()];

    for (size_t i = 0; i < matches.size(); ++i) {
        result->matches[i].rule_id      = strdup(matches[i].rule_id.c_str());
        result->matches[i].matched_text = strdup(matches[i].matched_text.c_str());
        result->matches[i].start        = matches[i].start;
        result->matches[i].end          = matches[i].end;
        result->matches[i].confidence   = matches[i].confidence;
    }

    result->suggestions = build_suggestions_json(g_engine.rules, matches);
    return result;
}

void zen_rules_result_free(ZenRuleResult* result) {
    if (!result) return;
    for (uint32_t i = 0; i < result->count; ++i) {
        free(const_cast<char*>(result->matches[i].rule_id));
        free(const_cast<char*>(result->matches[i].matched_text));
    }
    delete[] result->matches;
    delete[] result->suggestions;
    delete result;
}

// ─── Auto-fix Computation ────────────────────────────────────────────────────

struct Fix {
    bool        fixable = false;
    std::string replacement;
};

static Fix compute_fix(const std::string& rule_id,
                       const std::string& matched_text) {
    if (rule_id == "double_space") {
        return { true, " " };
    }
    if (rule_id == "space_before_punct") {
        if (matched_text.size() >= 2)
            return { true, matched_text.substr(1) };
    }
    if (rule_id == "exclamation_overuse") {
        if (matched_text == "!!" || matched_text == "!?") return { true, "!" };
        if (matched_text == "?!" || matched_text == "??") return { true, "?" };
    }
    if (rule_id == "missing_space_after_comma") {
        if (matched_text.size() >= 2)
            return { true, ", " + matched_text.substr(1) };
    }
    if (rule_id == "double_word") {
        size_t sp = matched_text.find(' ');
        if (sp != std::string::npos)
            return { true, matched_text.substr(0, sp) };
    }
    if (rule_id == "lowercase_sentence_start") {
        // matched_text is e.g. ". a" — uppercase the trailing letter
        if (!matched_text.empty()) {
            std::string fixed = matched_text;
            unsigned char lc = (unsigned char)fixed.back();
            if (lc >= 'a' && lc <= 'z') fixed.back() = (char)(lc - 32);
            return { true, fixed };
        }
    }
    if (rule_id == "redundancy") {
        static const std::unordered_map<std::string, std::string> fixes = {
            { "bereits schon",       "bereits"      },
            { "schon bereits",       "bereits"      },
            { "völlig kostenlos",  "kostenlos"    },
            { "gratis kostenlos",    "kostenlos"    },
            { "rückwirkend zurück", "rückwirkend" },
            { "persönlich anwesend",        "anwesend"  },
        };
        auto it = fixes.find(matched_text);
        if (it != fixes.end()) return { true, it->second };
    }
    return { false, "" };
}

// ─── zen_rules_autofix ────────────────────────────────────────────────────────

ZenAutofixResult* zen_rules_autofix(const char* text, const char* rules_json) {
    std::string input(text ? text : "");
    std::string user_key(rules_json && rules_json[0] ? rules_json : "");

    {
        std::lock_guard<std::mutex> lock(g_mutex);
        if (g_engine.rules.empty() || g_user_key != user_key) {
            auto rules = built_in_rules();
            if (!user_key.empty()) {
                auto user_rules = parse_user_rules(user_key);
                rules.insert(rules.end(), user_rules.begin(), user_rules.end());
            }
            g_engine.build(std::move(rules));
            g_user_key = user_key;
        }
    }

    auto matches = g_engine.analyze(input);

    // Apply fixes right-to-left so earlier positions stay valid
    std::sort(matches.begin(), matches.end(), [](const MatchResult& a, const MatchResult& b) {
        return a.start > b.start;
    });

    std::string result  = input;
    uint32_t  fix_count = 0;

    for (const auto& m : matches) {
        Fix fix = compute_fix(m.rule_id, m.matched_text);
        if (!fix.fixable) continue;
        if (m.start > result.size() || m.end > result.size() || m.start > m.end) continue;
        result.replace(m.start, m.end - m.start, fix.replacement);
        ++fix_count;
    }

    ZenAutofixResult* out = new ZenAutofixResult();
    out->text      = strdup(result.c_str());
    out->fix_count = fix_count;
    return out;
}

void zen_rules_autofix_free(ZenAutofixResult* result) {
    if (!result) return;
    free(result->text);
    delete result;
}

// ─── Image Meta ───────────────────────────────────────────────────────────────

static bool is_png(const uint8_t* data, uint32_t len) {
    return len >= 8 &&
           data[0] == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G';
}

static bool is_jpeg(const uint8_t* data, uint32_t len) {
    return len >= 2 && data[0] == 0xFF && data[1] == 0xD8;
}

ZenImageMeta* zen_image_meta(const uint8_t* data, uint32_t len) {
    if (!data || len < 24) return nullptr;

    ZenImageMeta* meta = new ZenImageMeta();
    meta->width    = 0;
    meta->height   = 0;
    meta->channels = 0;
    meta->format   = nullptr;

    if (is_png(data, len)) {
        meta->width    = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
        meta->height   = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
        meta->channels = (data[25] == 2) ? 3 : 4;
        meta->format   = strdup("PNG");
    } else if (is_jpeg(data, len)) {
        for (uint32_t i = 2; i + 8 < len; i++) {
            if (data[i] == 0xFF && data[i+1] == 0xC0) {
                meta->height   = (data[i+5] << 8) | data[i+6];
                meta->width    = (data[i+7] << 8) | data[i+8];
                meta->channels = data[i+9];
                break;
            }
        }
        meta->format = strdup("JPEG");
    } else {
        meta->format = strdup("UNKNOWN");
    }

    return meta;
}

void zen_image_meta_free(ZenImageMeta* meta) {
    if (!meta) return;
    free(meta->format);
    delete meta;
}
