"""Replay the manually reviewed official tariff cells; never discover new tariffs.

Optional --capture-dir verifies available original-source SHA-256s. Browser-only
sources have no exported original bytes/checksum. No provider content is retained.
"""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
parser.add_argument('--capture-dir', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
ledger = json.loads((root / 'scripts/data/water-reviewed-sources.json').read_text())
outputs = []
for source in ledger['sources']:
    if args.capture_dir:
        captures = [source] + ([source['periodEvidence']] if 'periodEvidence' in source else [])
        for capture in captures:
            if 'captureFile' not in capture:
                continue
            expected = capture.get('checksum', capture.get('snapshot', {}).get('checksum'))
            actual = 'sha256:' + hashlib.sha256((args.capture_dir / capture['captureFile']).read_bytes()).hexdigest()
            if actual != expected:
                raise ValueError(f"Original capture checksum mismatch: {capture['captureFile']}")
    extract = {'extractKind': 'UKMR_CONTROLLED_EXTRACT', 'extractVersion': ledger['reviewVersion'], **source}
    outputs.append((root / f"src/data/controlled/water/{source['key']}-2026-27.json", json.dumps(extract, indent=2) + '\n'))
# All verification precedes writes; raw source files and workbook are never edited.
for target, data in outputs:
    if args.check:
        if target.read_bytes() != data.encode():
            raise ValueError(f'Controlled extract differs: {target}')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data.encode())
print(f"{'Verified' if args.check else 'Extracted'} {sum(len(s['rows']) for s in ledger['sources'])} reviewed tariff cells in {len(outputs)} provider extracts.")
