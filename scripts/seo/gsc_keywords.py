#!/usr/bin/env python3
"""
Google Search Console — Keyword Analyzer
Analysiert Keywords und identifiziert SEO-Optimierungspotenzial.

Lokal (erster Aufruf öffnet Browser):
  python gsc_keywords.py --site https://zenpost.denisbitter.de/

CI/GitHub Actions:
  export GOOGLE_GSC_TOKEN='{"token":...}'
  python gsc_keywords.py

Quota: read-only, kein Limit für Analytics-Abfragen.
"""

import argparse
import json
import os
import sys
import requests
from datetime import datetime, timedelta
from pathlib import Path

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request as GoogleRequest
except ImportError:
    print("Fehlende Abhängigkeiten:")
    print("  pip install google-auth google-auth-oauthlib requests")
    sys.exit(1)

SCOPES    = ['https://www.googleapis.com/auth/webmasters.readonly']
SC_API    = 'https://searchconsole.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query'

SITES = [
    'sc-domain:denisbitter.de',
    'https://zenpost.denisbitter.de/',
    'https://zenpostpocket.denisbitter.de/',
    'https://zenorbit.denisbitter.de/',
]


# ── Auth ───────────────────────────────────────────────────────
def get_credentials(credentials_file: str, token_file: str) -> Credentials:
    creds = None

    gsc_token = os.environ.get('GOOGLE_GSC_TOKEN')
    if gsc_token:
        Path(token_file).write_text(gsc_token)

    if Path(token_file).exists():
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
        else:
            if not Path(credentials_file).exists():
                print(f"FEHLER: '{credentials_file}' nicht gefunden.")
                print("Bitte aus Google Cloud Console herunterladen.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0, prompt='consent')
        Path(token_file).write_text(creds.to_json())

    return creds


# ── API ────────────────────────────────────────────────────────
def query_search_console(site: str, creds: Credentials, days: int) -> list[dict]:
    if creds.expired:
        creds.refresh(GoogleRequest())

    end_date   = datetime.now().date() - timedelta(days=3)
    start_date = end_date - timedelta(days=days)

    url      = SC_API.format(site=requests.utils.quote(site, safe=''))
    all_rows = []
    start_row = 0

    while True:
        resp = requests.post(
            url,
            headers={
                'Authorization': f'Bearer {creds.token}',
                'Content-Type': 'application/json',
            },
            json={
                'startDate':  str(start_date),
                'endDate':    str(end_date),
                'dimensions': ['query'],
                'rowLimit':   25000,
                'startRow':   start_row,
            },
            timeout=30,
        )

        if resp.status_code != 200:
            print(f"  ✗ API {resp.status_code}: {resp.text[:300]}")
            break

        rows = resp.json().get('rows', [])
        if not rows:
            break

        for row in rows:
            keys = row.get('keys', [])
            all_rows.append({
                'query':       keys[0] if keys else '',
                'clicks':      row.get('clicks', 0),
                'impressions': row.get('impressions', 0),
                'ctr':         row.get('ctr', 0),
                'position':    row.get('position', 0),
            })

        if len(rows) < 25000:
            break
        start_row += len(rows)

    return all_rows


# ── Analyse ────────────────────────────────────────────────────
def analyze(rows: list[dict]) -> dict:
    total_clicks      = sum(r['clicks'] for r in rows)
    total_impressions = sum(r['impressions'] for r in rows)

    quick_wins = sorted(
        [r for r in rows if 5 <= r['position'] <= 15 and r['impressions'] >= 20],
        key=lambda x: x['impressions'], reverse=True,
    )[:20]

    ctr_issues = sorted(
        [r for r in rows if r['impressions'] >= 50 and r['ctr'] < 0.03 and r['position'] <= 20],
        key=lambda x: x['impressions'], reverse=True,
    )[:20]

    top_performer = sorted(
        [r for r in rows if r['position'] <= 4 and r['clicks'] > 0],
        key=lambda x: x['clicks'], reverse=True,
    )[:10]

    hidden_gems = sorted(
        [r for r in rows if r['impressions'] >= 100 and r['position'] > 15],
        key=lambda x: x['impressions'], reverse=True,
    )[:15]

    return {
        'summary': {
            'total_keywords':   len(rows),
            'total_clicks':     total_clicks,
            'total_impressions': total_impressions,
            'avg_ctr':          total_clicks / total_impressions if total_impressions else 0,
            'avg_position':     sum(r['position'] for r in rows) / len(rows) if rows else 0,
        },
        'quick_wins':    quick_wins,
        'ctr_issues':    ctr_issues,
        'top_performer': top_performer,
        'hidden_gems':   hidden_gems,
    }


# ── Report ─────────────────────────────────────────────────────
def render_markdown(site: str, analysis: dict, days: int) -> str:
    s     = analysis['summary']
    lines = []

    lines.append(f"# SEO Keyword Report — {site}")
    lines.append(f"**Zeitraum:** letzte {days} Tage  |  **Erstellt:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

    lines.append("## Übersicht")
    lines.append("| Metric | Wert |")
    lines.append("|--------|------|")
    lines.append(f"| Keywords gesamt | {s['total_keywords']:,} |")
    lines.append(f"| Klicks gesamt   | {s['total_clicks']:,} |")
    lines.append(f"| Impressions     | {s['total_impressions']:,} |")
    lines.append(f"| Ø CTR           | {s['avg_ctr']:.1%} |")
    lines.append(f"| Ø Position      | {s['avg_position']:.1f} |")
    lines.append("")

    if analysis['quick_wins']:
        lines.append("## ⚡ Quick Wins (Position 5–15)")
        lines.append("_Kurz vor Seite 1 — mit kleiner Content-Optimierung pushbar_\n")
        lines.append("| Keyword | Position | Impressions | Klicks | CTR |")
        lines.append("|---------|----------|-------------|--------|-----|")
        for r in analysis['quick_wins']:
            lines.append(f"| {r['query']} | {r['position']:.1f} | {r['impressions']:,} | {r['clicks']:,} | {r['ctr']:.1%} |")
        lines.append("")

    if analysis['ctr_issues']:
        lines.append("## 📉 CTR-Probleme (Titel / Meta verbessern)")
        lines.append("_Viele Impressions, kaum Klicks → Title-Tag und Meta-Description optimieren_\n")
        lines.append("| Keyword | Position | Impressions | CTR |")
        lines.append("|---------|----------|-------------|-----|")
        for r in analysis['ctr_issues']:
            lines.append(f"| {r['query']} | {r['position']:.1f} | {r['impressions']:,} | {r['ctr']:.1%} |")
        lines.append("")

    if analysis['hidden_gems']:
        lines.append("## 💎 Versteckte Schätze (Seite 2+, hohes Volumen)")
        lines.append("_Hohe Sichtbarkeit aber noch nicht auf Seite 1 → dedizierte Landingpage oder Artikel_\n")
        lines.append("| Keyword | Position | Impressions | Klicks |")
        lines.append("|---------|----------|-------------|--------|")
        for r in analysis['hidden_gems']:
            lines.append(f"| {r['query']} | {r['position']:.1f} | {r['impressions']:,} | {r['clicks']:,} |")
        lines.append("")

    if analysis['top_performer']:
        lines.append("## ✅ Top Performer (Position 1–4)")
        lines.append("_Funktionieren bereits gut — Strategie beibehalten_\n")
        lines.append("| Keyword | Position | Klicks | CTR |")
        lines.append("|---------|----------|--------|-----|")
        for r in analysis['top_performer']:
            lines.append(f"| {r['query']} | {r['position']:.1f} | {r['clicks']:,} | {r['ctr']:.1%} |")
        lines.append("")

    return "\n".join(lines)


# ── Main ───────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='GSC Keyword Analyzer')
    parser.add_argument('--site', nargs='+', help=f'Site URL(s). Default: alle\n{chr(10).join(SITES)}')
    parser.add_argument('--days', type=int, default=90, help='Analysezeitraum in Tagen [default: 90]')
    parser.add_argument('--credentials', default='credentials.json')
    parser.add_argument('--token', default='gsc_token.json')
    parser.add_argument('--output', default='keyword_report', help='Output-Prefix [default: keyword_report]')
    args = parser.parse_args()

    target_sites = args.site or SITES

    print(f"\n{'═'*54}")
    print(f"  GSC Keyword Analyzer")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Sites: {len(target_sites)}  |  Zeitraum: {args.days} Tage")
    print(f"{'═'*54}")

    creds = get_credentials(args.credentials, args.token)

    for site in target_sites:
        print(f"\n→ {site}")
        rows = query_search_console(site, creds, args.days)

        if not rows:
            print("  Keine Daten — Property nicht verifiziert oder zu wenig Traffic")
            continue

        print(f"  {len(rows):,} Keywords geladen")
        analysis = analyze(rows)
        s = analysis['summary']
        print(f"  Klicks: {s['total_clicks']:,}  |  Impressions: {s['total_impressions']:,}  |  Ø Position: {s['avg_position']:.1f}")
        print(f"  Quick Wins: {len(analysis['quick_wins'])}  |  CTR-Probleme: {len(analysis['ctr_issues'])}  |  Schätze: {len(analysis['hidden_gems'])}")

        domain  = site.replace('https://', '').rstrip('/').replace('.', '_')
        md_path = Path(f"{args.output}_{domain}.md")
        md_path.write_text(render_markdown(site, analysis, args.days), encoding='utf-8')
        print(f"  → {md_path}")

        json_path = Path(f"{args.output}_{domain}.json")
        json_path.write_text(json.dumps({
            'site':         site,
            'days':         args.days,
            'generated':    datetime.now().isoformat(),
            **analysis,
        }, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f"\n{'═'*54}")
    print(f"  Fertig\n")


if __name__ == '__main__':
    main()
