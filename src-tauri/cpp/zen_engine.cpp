#include "zen_engine.h"
#include <cstring>
#include <cstdlib>
#include <string>
#include <vector>
#include <algorithm>
#include <sstream>

// ─── Version ──────────────────────────────────────────────────────────────────

const char* zen_engine_version() {
    return "ZenEngine/1.1.0-cpp17";
}

// ─── Rule Engine ──────────────────────────────────────────────────────────────
// Einfache regelbasierte Textanalyse:
// - Findet Muster (Wiederholungen, passive Sätze, lange Wörter, etc.)
// - Gibt strukturierte Matches zurück
// Erweiterbar: LLVM-JIT für dynamische Regelkompilierung (Phase 2)

struct Rule {
    std::string id;
    std::string pattern;
    std::string suggestion;
    float       confidence;
    std::vector<std::string> replacements;
    bool        is_user_rule = false;
};

// Basis-Regeln für deutschen Content — je ein Pattern pro Eintrag (kein Regex in Phase 1)
static std::vector<Rule> built_in_rules() {
    return {
        // ── Passive Voice ──────────────────────────────────────────────────────
        { "passive_voice", "wurde",   "Aktive Formulierung bevorzugen", 0.75f },
        { "passive_voice", "wurden",  "Aktive Formulierung bevorzugen", 0.75f },
        { "passive_voice", "worden",  "Aktive Formulierung bevorzugen", 0.75f },
        { "passive_voice", "wird",    "Aktive Formulierung bevorzugen", 0.70f },
        { "passive_voice", "werden",  "Aktive Formulierung bevorzugen", 0.70f },

        // ── Füllwörter ─────────────────────────────────────────────────────────
        { "filler_word", "eigentlich",    "Füllwort entfernen", 0.85f },
        { "filler_word", "irgendwie",     "Füllwort entfernen", 0.85f },
        { "filler_word", "halt ",         "Füllwort entfernen", 0.80f },
        { "filler_word", "eben ",         "Füllwort entfernen", 0.80f },
        { "filler_word", "sozusagen",     "Füllwort entfernen", 0.85f },
        { "filler_word", "quasi",         "Füllwort entfernen", 0.80f },
        { "filler_word", "gewissermaßen", "Füllwort entfernen", 0.85f },
        { "filler_word", "irgendwann",    "Konkreten Zeitpunkt nennen", 0.75f },

        // ── Schwache Intensivierungen ──────────────────────────────────────────
        { "weak_word", "sehr ",       "Stärkeres Wort wählen", 0.70f },
        { "weak_word", "wirklich",    "Stärkeres Wort wählen", 0.70f },
        { "weak_word", "tatsächlich", "Konkreter formulieren",  0.65f },
        { "weak_word", "natürlich",   "Nicht als selbstverständlich annehmen", 0.65f },
        { "weak_word", "einfach ",    "Konkreter formulieren",  0.60f },
        { "weak_word", "grundsätzlich", "Einschränkung konkretisieren", 0.60f },

        // ── Nominalstil ────────────────────────────────────────────────────────
        { "nominal_style", "Durchführung", "Aktiv formulieren: 'durchführen'", 0.75f },
        { "nominal_style", "Verwendung",   "Aktiv formulieren: 'verwenden'",   0.75f },
        { "nominal_style", "Umsetzung",    "Aktiv formulieren: 'umsetzen'",    0.75f },
        { "nominal_style", "Bearbeitung",  "Aktiv formulieren: 'bearbeiten'",  0.75f },
        { "nominal_style", "Erstellung",   "Aktiv formulieren: 'erstellen'",   0.75f },
        { "nominal_style", "Überprüfung",  "Aktiv formulieren: 'überprüfen'",  0.75f },
        { "nominal_style", "Optimierung",  "Aktiv formulieren: 'optimieren'",  0.70f },
        { "nominal_style", "Verbesserung", "Aktiv formulieren: 'verbessern'",  0.70f },

        // ── Formatierungsprobleme ──────────────────────────────────────────────
        { "double_space",        "  ",  "Doppelte Leerzeichen entfernen",       1.0f },
        { "exclamation_overuse", "!!", "Mehrfach-Ausrufezeichen reduzieren",    0.9f },
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
        else                out += c;
    }
    return out;
}

// Parst ein JSON-Array von UserRule-Objekten:
// [{"pattern":"xyz","suggestion":"hint","replacements":["a","b"],"confidence":0.9,...}]
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

        // Helper: liest einen String-Wert für key aus dem Objekt
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

        // Helper: liest einen Float-Wert
        auto get_float = [&](const std::string& key) -> float {
            std::string needle = "\"" + key + "\":";
            size_t p = obj.find(needle);
            if (p == std::string::npos) return 0.8f;
            p += needle.size();
            try { return std::stof(obj.substr(p)); }
            catch (...) { return 0.8f; }
        };

        Rule r;
        r.id           = "user_rule";
        r.is_user_rule = true;
        r.pattern      = get_str("pattern");
        r.suggestion   = get_str("suggestion");
        r.confidence   = get_float("confidence");

        // Replacements-Array parsen: "replacements":["r1","r2"]
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

// Einfaches substring-Pattern-Matching (kein Regex in Phase 1, LLVM in Phase 2)
static std::vector<ZenRuleMatch> find_matches(const std::string& text, const std::vector<Rule>& rules) {
    std::vector<ZenRuleMatch> results;

    for (const auto& rule : rules) {
        size_t pos = 0;
        while ((pos = text.find(rule.pattern, pos)) != std::string::npos) {
            ZenRuleMatch m;
            m.rule_id     = rule.id.c_str();
            m.matched_text = rule.pattern.c_str();
            m.start       = static_cast<uint32_t>(pos);
            m.end         = static_cast<uint32_t>(pos + rule.pattern.length());
            m.confidence  = rule.confidence;
            results.push_back(m);
            pos += rule.pattern.length();
        }
    }

    return results;
}

static char* build_suggestions_json(const std::vector<Rule>& rules, const std::vector<ZenRuleMatch>& matches) {
    std::ostringstream json;
    json << "[";
    bool first = true;
    for (const auto& m : matches) {
        std::string matched(m.matched_text ? m.matched_text : "");
        for (const auto& r : rules) {
            // Exakte Zuordnung: rule_id UND pattern müssen übereinstimmen
            if (r.id == m.rule_id && r.pattern == matched) {
                if (!first) json << ",";
                json << "{"
                     << "\"rule\":\"" << escape_json_str(r.id) << "\","
                     << "\"matched_text\":\"" << escape_json_str(matched) << "\","
                     << "\"suggestion\":\"" << escape_json_str(r.suggestion) << "\","
                     << "\"confidence\":" << r.confidence << ","
                     << "\"start\":" << m.start << ","
                     << "\"end\":" << m.end << ","
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
                break;
            }
        }
    }
    json << "]";
    std::string s = json.str();
    char* out = new char[s.size() + 1];
    std::copy(s.begin(), s.end(), out);
    out[s.size()] = '\0';
    return out;
}

ZenRuleResult* zen_rules_analyze(const char* text, const char* rules_json) {
    std::string input(text ? text : "");
    auto rules = built_in_rules();

    // User Rules mergen — kommen aus localStorage via Tauri IPC
    if (rules_json && rules_json[0] != '\0') {
        auto user_rules = parse_user_rules(std::string(rules_json));
        rules.insert(rules.end(), user_rules.begin(), user_rules.end());
    }

    auto matches = find_matches(input, rules);

    ZenRuleResult* result = new ZenRuleResult();
    result->count   = static_cast<uint32_t>(matches.size());
    result->matches = new ZenRuleMatch[matches.size()];

    for (size_t i = 0; i < matches.size(); ++i) {
        result->matches[i] = matches[i];
    }

    result->suggestions = build_suggestions_json(rules, matches);
    return result;
}

void zen_rules_result_free(ZenRuleResult* result) {
    if (!result) return;
    delete[] result->matches;
    delete[] result->suggestions;
    delete result;
}

// ─── Image Meta ───────────────────────────────────────────────────────────────
// Liest PNG/JPEG Header-Bytes um Dimensionen zu extrahieren
// ohne vollständiges Dekodieren (sehr schnell)

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
        // PNG IHDR: Bytes 16-23 = width (4), height (4)
        meta->width    = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
        meta->height   = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
        meta->channels = (data[25] == 2) ? 3 : 4; // color type
        meta->format   = strdup("PNG");
    } else if (is_jpeg(data, len)) {
        // JPEG SOF0: scan for 0xFF 0xC0 marker
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
