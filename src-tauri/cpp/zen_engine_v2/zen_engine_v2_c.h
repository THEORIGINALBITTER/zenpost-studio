#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct zen_engine_v2_handle zen_engine_v2_handle;

typedef struct zen_engine_v2_config {
  size_t chunk_bytes;
  size_t max_threads;
  int enable_regex;
  int enable_autocorrect;
  int enable_jit_regex;
} zen_engine_v2_config;

typedef struct zen_engine_v2_result {
  const char* json;
} zen_engine_v2_result;

zen_engine_v2_handle* zen_engine_v2_create();
void zen_engine_v2_destroy(zen_engine_v2_handle* handle);
void zen_engine_v2_configure(zen_engine_v2_handle* handle, const zen_engine_v2_config* config);

int zen_engine_v2_load_rules_json(zen_engine_v2_handle* handle, const char* json, const char** error);
zen_engine_v2_result zen_engine_v2_analyze(zen_engine_v2_handle* handle, const char* text);
void zen_engine_v2_free_result(zen_engine_v2_handle* handle, zen_engine_v2_result result);

/* Autocorrect: analysiert text und wendet alle fixbaren Matches an.
   Gibt korrigierten Text zurück — Speicher via zen_engine_v2_free_result freigeben. */
zen_engine_v2_result zen_engine_v2_autocorrect(zen_engine_v2_handle* handle, const char* text);

#ifdef __cplusplus
}
#endif
