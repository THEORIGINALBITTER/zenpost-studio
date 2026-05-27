# Google Search Console — Re-Indexer

Meldet alle URLs aus `sitemap.xml` via Google Indexing API neu an.

## Setup (einmalig)

### 1. Google Cloud Console
1. [console.cloud.google.com](https://console.cloud.google.com) → Projekt öffnen
2. **APIs & Services → Bibliothek** → `Web Search Indexing API` suchen → aktivieren
3. **APIs & Services → Credentials** → `+ Create Credentials` → `OAuth 2.0 Client ID`
4. Application type: **Desktop App** → Name: `ZenPost Re-Indexer`
5. `credentials.json` herunterladen → in diesen Ordner legen

### 2. Google Search Console
- Site muss in GSC verifiziert sein unter [search.google.com/search-console](https://search.google.com/search-console)

### 3. Python-Abhängigkeiten
```bash
pip install -r requirements.txt
```

## Verwendung

```bash
# Alle Sites (aus SITES-Liste im Script)
python gsc_reindex.py

# Einzelne Site
python gsc_reindex.py --site https://zenpost.denisbitter.de

# Mehrere Sites
python gsc_reindex.py --site https://zenpost.denisbitter.de https://zenorbit.denisbitter.de

# Vorschau (nichts senden)
python gsc_reindex.py --dry-run

# URL als gelöscht melden
python gsc_reindex.py --type URL_DELETED --site https://...

# Limit setzen (Tages-Quota: 200 URLs)
python gsc_reindex.py --limit 50
```

Beim ersten Start öffnet sich der Browser für die OAuth-Bestätigung.  
Danach wird `token.json` gecacht — kein erneutes Login nötig.

## Quota

| Limit | Wert |
|---|---|
| URLs pro Tag | 200 |
| Requests pro Minute | 600 |
| Delay zwischen Requests | ~1s |

## Dateien

```
credentials.json   ← von Google Cloud Console herunterladen (nicht committen!)
token.json         ← automatisch erstellt nach erstem Login (nicht committen!)
reindex_log_*.json ← Ergebnis-Logs
```
