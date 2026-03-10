#include "rule_loader.h"

#include <algorithm>
#include <sstream>

namespace zen_engine_v2 {

// ─── JSON Mini-Parser Helpers ─────────────────────────────────────────────────
//
// No external dependencies. Handles nested braces/brackets and escaped strings.

namespace {

// Returns position of the matching close char, or npos on error.
// Starts scanning at open_pos (which must hold the open char).
static size_t find_matching(const std::string& s, size_t open_pos,
                             char open_ch, char close_ch) {
  int depth = 1;
  size_t i = open_pos + 1;
  bool in_str = false;
  while (i < s.size() && depth > 0) {
    if (in_str) {
      if (s[i] == '\\') { ++i; }           // skip escaped char
      else if (s[i] == '"') { in_str = false; }
    } else {
      if      (s[i] == '"')      { in_str = true; }
      else if (s[i] == open_ch)  { ++depth; }
      else if (s[i] == close_ch) { --depth; }
    }
    ++i;
  }
  return (depth == 0) ? i - 1 : std::string::npos;
}

// Extract a JSON string value for a given key.  Returns "" if not found.
static std::string get_str(const std::string& obj, const std::string& key) {
  const std::string needle = "\"" + key + "\":\"";
  size_t p = obj.find(needle);
  if (p == std::string::npos) return "";
  p += needle.size();
  size_t e = p;
  while (e < obj.size()) {
    if (obj[e] == '\\') { e += 2; continue; }
    if (obj[e] == '"')  break;
    ++e;
  }
  return obj.substr(p, e - p);
}

// Extract a JSON float value for a given key.  Returns default_val if missing.
static float get_float(const std::string& obj, const std::string& key,
                        float default_val = 0.8f) {
  const std::string needle = "\"" + key + "\":";
  size_t p = obj.find(needle);
  if (p == std::string::npos) return default_val;
  p += needle.size();
  try { return std::stof(obj.substr(p)); }
  catch (...) { return default_val; }
}

// Extract a JSON bool value for a given key.  Returns false if missing.
static bool get_bool(const std::string& obj, const std::string& key) {
  const std::string needle = "\"" + key + "\":";
  size_t p = obj.find(needle);
  if (p == std::string::npos) return false;
  p += needle.size();
  while (p < obj.size() && obj[p] == ' ') ++p;
  return obj.compare(p, 4, "true") == 0;
}

// Check whether a key exists in the object string.
static bool has_key(const std::string& obj, const std::string& key) {
  return obj.find("\"" + key + "\"") != std::string::npos;
}

// Extract the first string from a JSON array value for a given key.
// e.g. "replacements":["foo","bar"]  →  "foo"
static std::string get_array_first_str(const std::string& obj,
                                        const std::string& key) {
  const std::string needle = "\"" + key + "\":[";
  size_t p = obj.find(needle);
  if (p == std::string::npos) return "";
  p += needle.size();
  // find first quoted element
  size_t qs = obj.find('"', p);
  if (qs == std::string::npos || qs > obj.find(']', p)) return "";
  ++qs;
  size_t qe = qs;
  while (qe < obj.size()) {
    if (obj[qe] == '\\') { qe += 2; continue; }
    if (obj[qe] == '"')  break;
    ++qe;
  }
  return obj.substr(qs, qe - qs);
}

// ─── Rule Parsing ──────────────────────────────────────────────────────────

// Parse one rule object (the `{...}` content) supporting both V1 and V2 fields.
//
// V1 fields: pattern, suggestion, confidence, is_regex, word_boundary, replacements, id
// V2 fields: id, type ("string"|"regex"), pattern, message, replacement, score, source
//
// Auto-detection per object:
//   has "message" key  → V2 style takes priority for that field
//   has "suggestion"   → V1 style fallback
static Rule parse_rule_object(const std::string& obj, const Rule* defaults) {
  Rule r;
  if (defaults) r = *defaults;   // apply inherited defaults first

  // id (both formats)
  std::string id = get_str(obj, "id");
  if (!id.empty()) r.id = id;
  if (r.id.empty()) r.id = "user_rule";

  // pattern (both formats)
  std::string pat = get_str(obj, "pattern");
  if (!pat.empty()) r.pattern = pat;

  // message (V2) / suggestion (V1 compat)
  if (has_key(obj, "message")) {
    r.message = get_str(obj, "message");
  } else if (has_key(obj, "suggestion")) {
    r.message = get_str(obj, "suggestion");
  }

  // replacement (V2) / replacements[0] (V1 compat)
  if (has_key(obj, "replacement")) {
    r.replacement = get_str(obj, "replacement");
  } else if (has_key(obj, "replacements")) {
    r.replacement = get_array_first_str(obj, "replacements");
  }

  // score (V2) / confidence (V1 compat)
  if (has_key(obj, "score")) {
    r.score = get_float(obj, "score", r.score);
  } else if (has_key(obj, "confidence")) {
    r.score = get_float(obj, "confidence", r.score);
  }

  // type (V2: "string"|"regex") / is_regex (V1 compat)
  if (has_key(obj, "type")) {
    std::string type_str = get_str(obj, "type");
    r.type = (type_str == "regex") ? RuleType::kRegex : RuleType::kString;
  } else if (get_bool(obj, "is_regex")) {
    r.type = RuleType::kRegex;
  }

  // source (V2 only)
  if (has_key(obj, "source")) {
    std::string src = get_str(obj, "source");
    if      (src == "builtin") r.source = RuleSource::kBuiltin;
    else if (src == "plugin")  r.source = RuleSource::kPlugin;
    else                       r.source = RuleSource::kJson;
  }

  // word_boundary (both formats)
  if (has_key(obj, "word_boundary"))
    r.word_boundary = get_bool(obj, "word_boundary");

  return r;
}

// Iterate over a JSON array string `[{...},{...},...]` and extract all `{...}`
// objects, calling cb(object_content) for each.
template <typename Fn>
static void iterate_array_objects(const std::string& arr_content, Fn cb) {
  size_t pos = 0;
  while (pos < arr_content.size()) {
    size_t obj_start = arr_content.find('{', pos);
    if (obj_start == std::string::npos) break;
    size_t obj_end = find_matching(arr_content, obj_start, '{', '}');
    if (obj_end == std::string::npos) break;
    cb(arr_content.substr(obj_start, obj_end - obj_start + 1));
    pos = obj_end + 1;
  }
}

// ─── V1 Format: root is a JSON array ─────────────────────────────────────────
//
// [{"pattern":"...","suggestion":"...","confidence":0.8,...}, ...]

static bool parse_v1(const std::string& json, RuleSet& out, std::string* error) {
  size_t arr_start = json.find('[');
  if (arr_start == std::string::npos) {
    if (error) *error = "JSONRuleLoader (V1): no array found";
    return false;
  }
  size_t arr_end = find_matching(json, arr_start, '[', ']');
  if (arr_end == std::string::npos) {
    if (error) *error = "JSONRuleLoader (V1): unterminated array";
    return false;
  }
  const std::string arr_content = json.substr(arr_start + 1, arr_end - arr_start - 1);

  iterate_array_objects(arr_content, [&](const std::string& obj) {
    Rule r = parse_rule_object(obj, nullptr);
    r.source = RuleSource::kJson;   // V1 rules are always JSON-sourced
    if (!r.pattern.empty()) {
      out.by_id[r.id] = r;
      out.rules.push_back(std::move(r));
    }
  });
  return true;
}

// ─── V2 Format: root is a JSON object with "version" / "rules" keys ──────────
//
// {
//   "version": "2",
//   "defaults": {"score": 0.8, "source": "json"},
//   "rules": [{"id":"...","pattern":"...","message":"...",...}],
//   "sources": [...]   // reserved, not yet used
// }

static bool parse_v2(const std::string& json, RuleSet& out, std::string* error) {
  size_t root_start = json.find('{');
  if (root_start == std::string::npos) {
    if (error) *error = "JSONRuleLoader (V2): no root object found";
    return false;
  }
  size_t root_end = find_matching(json, root_start, '{', '}');
  if (root_end == std::string::npos) {
    if (error) *error = "JSONRuleLoader (V2): unterminated root object";
    return false;
  }
  const std::string root = json.substr(root_start, root_end - root_start + 1);

  // Parse optional defaults block
  Rule defaults;
  defaults.score  = 0.8f;
  defaults.source = RuleSource::kJson;
  {
    const std::string dneedle = "\"defaults\":";
    size_t dp = root.find(dneedle);
    if (dp != std::string::npos) {
      dp += dneedle.size();
      while (dp < root.size() && root[dp] == ' ') ++dp;
      if (dp < root.size() && root[dp] == '{') {
        size_t de = find_matching(root, dp, '{', '}');
        if (de != std::string::npos) {
          const std::string dobj = root.substr(dp, de - dp + 1);
          if (has_key(dobj, "score"))      defaults.score  = get_float(dobj, "score", 0.8f);
          if (has_key(dobj, "confidence")) defaults.score  = get_float(dobj, "confidence", 0.8f);
          if (has_key(dobj, "source")) {
            std::string src = get_str(dobj, "source");
            if (src == "builtin") defaults.source = RuleSource::kBuiltin;
            else if (src == "plugin") defaults.source = RuleSource::kPlugin;
          }
        }
      }
    }
  }

  // Find and parse "rules" array
  const std::string rneedle = "\"rules\":";
  size_t rp = root.find(rneedle);
  if (rp == std::string::npos) {
    if (error) *error = "JSONRuleLoader (V2): no \"rules\" key found";
    return false;
  }
  rp += rneedle.size();
  while (rp < root.size() && root[rp] == ' ') ++rp;
  if (rp >= root.size() || root[rp] != '[') {
    if (error) *error = "JSONRuleLoader (V2): \"rules\" is not an array";
    return false;
  }
  size_t re = find_matching(root, rp, '[', ']');
  if (re == std::string::npos) {
    if (error) *error = "JSONRuleLoader (V2): unterminated rules array";
    return false;
  }
  const std::string arr_content = root.substr(rp + 1, re - rp - 1);

  iterate_array_objects(arr_content, [&](const std::string& obj) {
    Rule r = parse_rule_object(obj, &defaults);
    if (!r.pattern.empty()) {
      out.by_id[r.id] = r;
      out.rules.push_back(std::move(r));
    }
  });
  return true;
}

// ─── Format Detection ─────────────────────────────────────────────────────────
//
// Skip whitespace, check first significant character:
//   '[' → V1 array
//   '{' + "version"/"rules" key → V2 object
//   '{' without those keys → treat as V2 anyway (graceful)

static bool is_v2_format(const std::string& json) {
  // find root '{' and check for V2 indicator keys
  size_t p = json.find('{');
  if (p == std::string::npos) return false;
  size_t e = find_matching(json, p, '{', '}');
  if (e == std::string::npos) e = std::min(json.size(), p + 200);
  const std::string peek = json.substr(p, e - p + 1);
  return has_key(peek, "version") || has_key(peek, "rules");
}

} // anonymous namespace

// ─── JSONRuleLoader ───────────────────────────────────────────────────────────

JSONRuleLoader::JSONRuleLoader(std::string json_source)
    : json_source_(std::move(json_source)) {}

bool JSONRuleLoader::Load(RuleSet& out_rules, std::string* error) {
  if (json_source_.size() < 2) {
    if (error) *error = "JSONRuleLoader: empty input";
    return false;
  }

  // Skip leading whitespace to detect root type
  size_t first = json_source_.find_first_not_of(" \t\r\n");
  if (first == std::string::npos) {
    if (error) *error = "JSONRuleLoader: blank input";
    return false;
  }

  if (json_source_[first] == '[') {
    return parse_v1(json_source_, out_rules, error);
  } else if (json_source_[first] == '{') {
    if (is_v2_format(json_source_)) {
      return parse_v2(json_source_, out_rules, error);
    }
    // Single bare object? Treat as a one-rule V2 payload.
    size_t obj_end = find_matching(json_source_, first, '{', '}');
    if (obj_end == std::string::npos) {
      if (error) *error = "JSONRuleLoader: unterminated object";
      return false;
    }
    const std::string obj = json_source_.substr(first, obj_end - first + 1);
    Rule r = parse_rule_object(obj, nullptr);
    r.source = RuleSource::kJson;
    if (!r.pattern.empty()) {
      out_rules.by_id[r.id] = r;
      out_rules.rules.push_back(std::move(r));
      return true;
    }
    if (error) *error = "JSONRuleLoader: object has no pattern";
    return false;
  }

  if (error) *error = "JSONRuleLoader: unrecognised format (expected '[' or '{')";
  return false;
}

// ─── PluginRuleLoader (stub) ──────────────────────────────────────────────────

PluginRuleLoader::PluginRuleLoader(std::string plugin_path)
    : plugin_path_(std::move(plugin_path)) {}

bool PluginRuleLoader::Load(RuleSet& out_rules, std::string* error) {
  (void)out_rules;
  if (error) *error = "PluginRuleLoader: not implemented";
  return false;
}

// ─── BuiltinRuleLoader ───────────────────────────────────────────────────────
//
// Portiert die eingebauten Rules aus zen_engine.cpp (V1) ins V2-Format.
// Felder: {id, type, source, pattern, message, replacement, score, word_boundary}

bool BuiltinRuleLoader::Load(RuleSet& out_rules, std::string* error) {
  (void)error;

  // Helfer-Lambdas für kompakte Rule-Konstruktion
  auto str_rule = [](const char* id, const char* pattern,
                     const char* message, float score,
                     bool wb = false, const char* replacement = "") -> Rule {
    Rule r;
    r.id           = id;
    r.type         = RuleType::kString;
    r.source       = RuleSource::kBuiltin;
    r.pattern      = pattern;
    r.message      = message;
    r.replacement  = replacement;
    r.score        = score;
    r.word_boundary = wb;
    return r;
  };

  auto re_rule = [](const char* id, const char* pattern,
                    const char* message, float score,
                    const char* replacement = "") -> Rule {
    Rule r;
    r.id          = id;
    r.type        = RuleType::kRegex;
    r.source      = RuleSource::kBuiltin;
    r.pattern     = pattern;
    r.message     = message;
    r.replacement = replacement;
    r.score       = score;
    return r;
  };

  std::vector<Rule> builtin = {
    // ── Passive Voice (Wortgrenze) ──────────────────────────────────────────
    str_rule("passive_voice", "wurde",   "Aktive Formulierung bevorzugen", 0.75f, true),
    str_rule("passive_voice", "wurden",  "Aktive Formulierung bevorzugen", 0.75f, true),
    str_rule("passive_voice", "worden",  "Aktive Formulierung bevorzugen", 0.75f, true),
    str_rule("passive_voice", "wird",    "Aktive Formulierung bevorzugen", 0.70f, true),
    str_rule("passive_voice", "werden",  "Aktive Formulierung bevorzugen", 0.70f, true),

    // ── Füllwörter (Wortgrenze) ─────────────────────────────────────────────
    str_rule("filler_word", "eigentlich",        "Füllwort entfernen",                       0.85f, true),
    str_rule("filler_word", "irgendwie",         "Füllwort entfernen",                       0.85f, true),
    str_rule("filler_word", "halt",              "Füllwort entfernen",                       0.80f, true),
    str_rule("filler_word", "eben",              "Füllwort entfernen",                       0.80f, true),
    str_rule("filler_word", "sozusagen",         "Füllwort entfernen",                       0.85f, true),
    str_rule("filler_word", "quasi",             "Füllwort entfernen",                       0.80f, true),
    str_rule("filler_word", "gewissermaßen",     "Füllwort entfernen",                       0.85f, true),
    str_rule("filler_word", "irgendwann",        "Konkreten Zeitpunkt nennen",               0.75f, true),
    str_rule("filler_word", "irgendein",         "Füllwort konkretisieren",                  0.75f, true),
    str_rule("filler_word", "irgendwelch",       "Füllwort konkretisieren",                  0.75f, true),
    str_rule("filler_word", "übrigens",          "Füllwort entfernen",                       0.80f, true),
    str_rule("filler_word", "bekanntlich",       "Annahme nicht als selbstverständlich setzen", 0.80f, true),
    str_rule("filler_word", "selbstverständlich","Füllwort entfernen — konkret begründen",   0.75f, true),
    str_rule("filler_word", "natürlich",         "Füllwort entfernen — konkret begründen",   0.70f, true),
    str_rule("filler_word", "ja",                "Füllwort entfernen",                       0.65f, true),
    str_rule("filler_word", "mal",               "Füllwort entfernen",                       0.60f, true),

    // ── Schwache Intensivierungen (Wortgrenze) ──────────────────────────────
    str_rule("weak_word", "sehr",          "Stärkeres Wort wählen",        0.70f, true),
    str_rule("weak_word", "wirklich",      "Stärkeres Wort wählen",        0.70f, true),
    str_rule("weak_word", "tatsächlich",   "Konkreter formulieren",         0.65f, true),
    str_rule("weak_word", "einfach",       "Konkreter formulieren",         0.60f, true),
    str_rule("weak_word", "grundsätzlich", "Einschränkung konkretisieren",  0.60f, true),
    str_rule("weak_word", "prinzipiell",   "Einschränkung konkretisieren",  0.60f, true),
    str_rule("weak_word", "ziemlich",      "Stärkeres Wort wählen",        0.65f, true),
    str_rule("weak_word", "relativ",       "Konkreten Wert nennen",         0.60f, true),

    // ── Nominalstil (Wortgrenze) ────────────────────────────────────────────
    str_rule("nominal_style", "Durchführung",   "Aktiv formulieren: 'durchführen'",    0.75f, true),
    str_rule("nominal_style", "Verwendung",     "Aktiv formulieren: 'verwenden'",      0.75f, true),
    str_rule("nominal_style", "Umsetzung",      "Aktiv formulieren: 'umsetzen'",       0.75f, true),
    str_rule("nominal_style", "Bearbeitung",    "Aktiv formulieren: 'bearbeiten'",     0.75f, true),
    str_rule("nominal_style", "Erstellung",     "Aktiv formulieren: 'erstellen'",      0.75f, true),
    str_rule("nominal_style", "Überprüfung",    "Aktiv formulieren: 'überprüfen'",     0.75f, true),
    str_rule("nominal_style", "Optimierung",    "Aktiv formulieren: 'optimieren'",     0.70f, true),
    str_rule("nominal_style", "Verbesserung",   "Aktiv formulieren: 'verbessern'",     0.70f, true),
    str_rule("nominal_style", "Implementierung","Aktiv formulieren: 'implementieren'", 0.70f, true),
    str_rule("nominal_style", "Bereitstellung", "Aktiv formulieren: 'bereitstellen'",  0.70f, true),

    // ── Anglizismen (Wortgrenze) ────────────────────────────────────────────
    str_rule("anglicism", "Deadline",     "'Frist' oder 'Abgabetermin' verwenden",  0.70f, true),
    str_rule("anglicism", "Meeting",      "'Besprechung' oder 'Treffen' verwenden", 0.60f, true),
    str_rule("anglicism", "Feedback",     "'Rückmeldung' erwägen",                  0.50f, true),
    str_rule("anglicism", "Workflow",     "'Arbeitsablauf' erwägen",                0.55f, true),
    str_rule("anglicism", "Brainstorming","'Ideenfindung' erwägen",                 0.60f, true),
    str_rule("anglicism", "Roadmap",      "'Fahrplan' erwägen",                     0.60f, true),
    str_rule("anglicism", "Rollout",      "'Einführung' oder 'Auslieferung' erwägen",0.65f, true),
    str_rule("anglicism", "Pipeline",     "'Prozesskette' oder 'Verbindung' erwägen",0.65f, true),

    // ── Klammern-Missbrauch (Regex) ─────────────────────────────────────────
    re_rule("bracket_overuse",
            "\\([^)]{40,}\\)",
            "Langer Einschub in Klammern — als eigenen Satz formulieren", 0.75f),
    re_rule("bracket_overuse",
            "\\([^)]+\\)[^.!?\\n]{0,30}\\([^)]+\\)",
            "Mehrere Klammerzusätze im Satz — vereinfachen", 0.70f),

    // ── Zu lange Sätze (Regex) ──────────────────────────────────────────────
    re_rule("sentence_too_long",
            "[A-Za-z\xc0-\xff][^.!?\\n]{180,}[.!?]",
            "Satz zu lang — in kürzere Sätze aufteilen", 0.80f),

    // ── Klischees ───────────────────────────────────────────────────────────
    str_rule("cliche", "am Ende des Tages",        "Phrase ersetzen — konkret formulieren",       0.85f),
    str_rule("cliche", "auf der grünen Wiese",      "Phrase ersetzen — Kontext benennen",          0.85f),
    str_rule("cliche", "win-win",                   "'Vorteil für alle' konkret benennen",         0.80f),
    str_rule("cliche", "Mehrwert",                  "Konkreten Nutzen benennen",                   0.75f, true),
    str_rule("cliche", "proaktiv",                  "Konkretes Verhalten beschreiben",             0.75f, true),
    str_rule("cliche", "auf Augenhöhe",             "Konkrete Zusammenarbeit beschreiben",         0.80f),
    str_rule("cliche", "das i-Tüpfelchen",          "Direkter formulieren",                        0.80f),
    str_rule("cliche", "außerhalb der Komfortzone", "Konkrete Herausforderung beschreiben",        0.80f),
    str_rule("cliche", "Synergie",                  "Konkreten gemeinsamen Nutzen benennen",       0.75f, true),
    str_rule("cliche", "agil",                      "Konkretes Vorgehen beschreiben",              0.65f, true),
    str_rule("cliche", "disruptiv",                 "Konkreten Wandel beschreiben",                0.70f, true),
    str_rule("cliche", "innovativ",                 "Konkreten Unterschied benennen",              0.60f, true),

    // ── Redundanzen / Pleonasmen ────────────────────────────────────────────
    str_rule("redundancy", "bereits schon",      "'bereits' oder 'schon' — nicht beides",    0.90f),
    str_rule("redundancy", "schon bereits",      "'bereits' oder 'schon' — nicht beides",    0.90f),
    str_rule("redundancy", "völlig kostenlos",   "'kostenlos' genügt",                        0.90f),
    str_rule("redundancy", "gratis kostenlos",   "'kostenlos' oder 'gratis' — nicht beides", 0.90f),
    str_rule("redundancy", "Endresultat",        "'Ergebnis' oder 'Resultat' genügt",        0.85f, true),
    str_rule("redundancy", "Endprodukt",         "'Produkt' oder 'Ergebnis' genügt",         0.80f, true),
    str_rule("redundancy", "rückwirkend zurück", "'rückwirkend' genügt",                     0.90f),
    str_rule("redundancy", "neu eröffnet",       "'eröffnet' impliziert Neuheit",            0.80f),
    str_rule("redundancy", "weißer Schimmel",    "Schimmel ist immer weiß — Pleonasmus",    0.95f),
    str_rule("redundancy", "alter Veteran",      "Veteran impliziert Erfahrung — Pleonasmus",0.90f),
    str_rule("redundancy", "persönlich anwesend","'anwesend' genügt",                        0.85f),

    // ── Doppelwörter (Regex) ────────────────────────────────────────────────
    re_rule("double_word",
            "\\b([A-Za-z\xc0-\xff]{3,})\\s+\\1\\b",
            "Doppelwort — eines davon entfernen", 0.95f),

    // ── Leerzeichen vor Satzzeichen ─────────────────────────────────────────
    str_rule("space_before_punct", " ,", "Leerzeichen vor Komma entfernen",          0.95f, false, ","),
    str_rule("space_before_punct", " .", "Leerzeichen vor Punkt entfernen",          0.92f, false, "."),
    str_rule("space_before_punct", " !", "Leerzeichen vor Ausrufezeichen entfernen", 0.95f, false, "!"),
    str_rule("space_before_punct", " ?", "Leerzeichen vor Fragezeichen entfernen",   0.95f, false, "?"),
    str_rule("space_before_punct", " :", "Leerzeichen vor Doppelpunkt entfernen",    0.90f, false, ":"),
    str_rule("space_before_punct", " ;", "Leerzeichen vor Semikolon entfernen",      0.90f, false, ";"),

    // ── Fehlendes Leerzeichen nach Komma (Regex) ────────────────────────────
    re_rule("missing_space_after_comma",
            ",[A-Za-z\xc0-\xff]",
            "Leerzeichen nach Komma fehlt", 0.88f),

    // ── Satzanfang klein (Regex) ────────────────────────────────────────────
    re_rule("lowercase_sentence_start",
            "[.!?]\\s+[a-z]",
            "Satzanfang sollte großgeschrieben werden", 0.85f),

    // ── Wortwiederholung in Nähe (Regex) ────────────────────────────────────
    re_rule("word_repetition",
            "\\b([A-Za-z\xc0-\xff]{5,})\\b.{1,60}\\b\\1\\b",
            "Wort zu nah wiederholt — Synonym verwenden", 0.70f),

    // ── Formatierungsprobleme ────────────────────────────────────────────────
    str_rule("double_space",        "  ",  "Doppelte Leerzeichen entfernen",     1.00f, false, " "),
    str_rule("exclamation_overuse", "!!",  "Mehrfach-Ausrufezeichen reduzieren", 0.90f, false, "!"),
    str_rule("exclamation_overuse", "!?",  "Gemischte Satzzeichen vermeiden",    0.85f),
    str_rule("exclamation_overuse", "?!",  "Gemischte Satzzeichen vermeiden",    0.85f),
    str_rule("exclamation_overuse", "??",  "Mehrfach-Fragezeichen reduzieren",   0.90f, false, "?"),
  };

  for (auto& r : builtin) {
    out_rules.by_id[r.id] = r;   // by_id uses last rule per id (group key)
    out_rules.rules.push_back(std::move(r));
  }
  return true;
}

} // namespace zen_engine_v2
