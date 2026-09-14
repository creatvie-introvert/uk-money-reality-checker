# UKMR-controlled energy extracts

These JSON files are labelled UKMR-controlled selected evidence, not publisher-authored JSON:

- `need-ew-2024.json` and `need-scotland-2024.json`: 100 reviewed 2024 profiles, 784 applicable fuel/statistic reference observations. The selected source profiles retain raw cells, including non-applicable gas markers. Full joint-table coverage is partial.
- Nine `ofgem-*-2026-q3.json` files: 126 regional price facts from the official page's embedded tables, with exact table and official-page checksums. Great Britain averages and forthcoming-quarter columns are excluded.

Original workbooks/HTML/scripts remain in `/tmp`. NEED has the verified GOV.UK OGL qualification. Ofgem reuse remains unresolved and its raw captures are metadata-only; no OGL permission is implied.

See [production energy methodology](../../../../docs/data/production-energy.md) for sources, geography, selection, classification, missing states and reproduction. The reviewed capture manifest is `scripts/data/energy-sources.json`; checksum changes require source review.
