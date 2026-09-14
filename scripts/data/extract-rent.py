"""Read the pinned official XLSX; write only a labelled UKMR cell extract."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

CHECKSUM = '9e172e7d32a43c8c979a6d394d717d862f66775295f604d2f223b2035374223e'
URL = 'https://www.ons.gov.uk/file?uri=%2Feconomy%2Finflationandpriceindices%2Fdatasets%2Fpriceindexofprivaterentsukmonthlypricestatistics%2F19august2026%2Fpriceindexofprivaterentsukmonthlypricestatistics.xlsx'
CODES = {'E12000007', 'E08000025', 'E08000003', 'E08000035', 'E08000012', 'E06000023', 'S33000009'}
COLUMNS = {'H': 'Rental price', 'L': 'Rental price one bed', 'P': 'Rental price two bed', 'T': 'Rental price three bed', 'X': 'Rental price four or more bed'}
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
OUT = Path(__file__).resolve().parents[2] / 'src/data/controlled/rent/2026-07/ons-pipr.json'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('workbook', type=Path)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
if hashlib.sha256(args.workbook.read_bytes()).hexdigest() != CHECKSUM:
    raise ValueError('Original workbook checksum differs: review a new snapshot before extraction')
rows = []
with zipfile.ZipFile(args.workbook) as z:
    strings = [''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)]
    for _, row in ET.iterparse(z.open('xl/worksheets/sheet4.xml'), events=['end']):
        if row.tag != '{' + NS['s'] + '}row':
            continue
        cells = {}
        for cell in row:
            value = cell.findtext('s:v', None, NS)
            if cell.get('t') == 's' and value is not None:
                value = strings[int(value)]
            cells[''.join(filter(str.isalpha, cell.get('r', '')))]=value
        if row.get('r') == '3':
            for col, heading in {'A': 'Time period', 'B': 'Area code', 'C': 'Area name', 'D': 'Region or country name', **COLUMNS}.items():
                if cells.get(col) != heading:
                    raise ValueError(f'Unexpected source column {col}')
        if cells.get('B') in CODES:
            date = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=float(cells['A']))
            if date == datetime.datetime(2026, 7, 1):
                for col, measure in COLUMNS.items():
                    raw = cells.get(col)
                    rows.append(dict(areaCode=cells['B'], areaName=cells['C'], regionOrCountryName=cells['D'], sourcePeriod='2026-07', rawTimePeriod=cells['A'], sourceMeasure=measure, rawSourceValue=raw, sourceState={'[x]': 'NOT_AVAILABLE', '[z]': 'NOT_APPLICABLE'}.get(raw, 'NUMERIC' if raw is not None else 'MISSING'), sourceTable='Table 1', sourceRow=int(row.get('r')), sourceCell=col + row.get('r')))
        row.clear()
if len(rows) != 35 or len({(r['areaCode'], r['sourceMeasure']) for r in rows}) != 35:
    raise ValueError('Required source rows missing or duplicated; no fallback permitted')
rows.sort(key=lambda r: (r['areaCode'], list(COLUMNS.values()).index(r['sourceMeasure'])))
extract = dict(extractKind='UKMR_CONTROLLED_EXTRACT', extractVersion='1.0.0', description='UKMR-controlled selected cells, not an ONS publication. Original XLSX is not retained in Git.', snapshot=dict(snapshotId='ons-pipr-2026-08-19-sha256-9e172e7d32a4', sourceId='SRC-001', retrievedAt='2026-09-14T15:25:23Z', sourceFormat='XLSX', retention='METADATA_ONLY', sourceUrl=URL, sourceReference='19 August 2026 edition; Table 1; July 2026; H/L/P/T/X', checksum='sha256:' + CHECKSUM, nonRetentionReason='Original official XLSX downloaded to /tmp for verification; only this labelled controlled extract is retained.'), publicationDate='2026-08-19', sourcePeriod='2026-07', importedAt='2026-09-14T15:25:23Z', importVersion='rent-2026-07-v1', releaseStatus='RELEASE_READY', methodologyNotes='PIPR monthly rental-stock prices (new and existing tenancies), GBP/month, rounded by ONS to nearest £1; not seasonally adjusted. Bedroom and property-type dimensions are separate. London is a region. Greater Glasgow BRMA is applicable to consumer Glasgow, not equal to Glasgow City. Edinburgh has no verified source; no fallback.', limitations=['Scotland data historically predominantly advertised new lets, with existing rents estimated; collection of achieved rents is increasing. In-tenancy controls September 2022 to March 2025 can cause overestimation; cross-country comparisons require caution.', 'Local estimates can be volatile. These are wider-stock measures, not a quote for a new tenancy or a specific dwelling.', 'Workbook cover still says official statistics in development; the current ONS bulletin states PIPR became official statistics on 20 May 2026.'], rows=rows)
serialized = json.dumps(extract, indent=2, ensure_ascii=False) + '\n'
if args.check:
    if OUT.read_text() != serialized:
        raise ValueError('Controlled extract bytes differ')
else:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(serialized)
print(f'{"Verified" if args.check else "Extracted"} {len(rows)} controlled cells from checksum-verified original')
