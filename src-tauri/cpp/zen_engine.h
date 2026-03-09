#pragma once
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// ─── Rule Engine ─────────────────────────────────────────────────────────────

typedef struct ZenRuleMatch {
    const char* rule_id;
    const char* matched_text;
    uint32_t    start;
    uint32_t    end;
    float       confidence;
} ZenRuleMatch;

typedef struct ZenRuleResult {
    ZenRuleMatch* matches;
    uint32_t      count;
    char*         suggestions;  // JSON string
} ZenRuleResult;

// Regelbasierte Analyse: Gibt Matches + Vorschläge zurück
ZenRuleResult* zen_rules_analyze(const char* text, const char* rules_json);
void           zen_rules_result_free(ZenRuleResult* result);

// ─── Image Processing ─────────────────────────────────────────────────────────

typedef struct ZenImageMeta {
    uint32_t width;
    uint32_t height;
    uint32_t channels;
    char*    format;
} ZenImageMeta;

// Bild-Metadaten lesen (aus rohen Bytes)
ZenImageMeta* zen_image_meta(const uint8_t* data, uint32_t len);
void          zen_image_meta_free(ZenImageMeta* meta);

// ─── Engine Info ──────────────────────────────────────────────────────────────

const char* zen_engine_version(void);

#ifdef __cplusplus
}
#endif
