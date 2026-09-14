"""Extract pinned Defra ODS/codebank and ONS XLSX source cells, read-only.

Only standard-library XML/ZIP/CSV parsing is used; no workbook is authored.
"""
import argparse
import csv
from decimal import Decimal
import hashlib
import io
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads(Path(__file__).with_name('spending-sources.json').read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', type=Path, default=Path('/tmp'))
parser.add_argument('--check', action='store_true')
args = parser.parse_args()


def capture(key):
    spec = CONFIG['sources'][key]
    data = (args.source_dir / spec['filename']).read_bytes()
    if 'sha256:' + hashlib.sha256(data).hexdigest() != spec['checksum']:
        raise ValueError(f"{key}: original bytes changed; source review and a new snapshot required")
    return data


def snapshot(key):
    s = CONFIG['sources'][key]
    return dict(snapshotId=f"{s['sourceId']}-{key}-20260914", sourceId=s['sourceId'], sourceFormat=s['format'],
                retrievedAt=CONFIG['retrievedAt'], retention='METADATA_ONLY', sourceUrl=s['url'], checksum=s['checksum'],
                nonRetentionReason='Only controlled source facts retained in Git; original official file captured in /tmp. OGL v3.0 except where otherwise stated.')


def base(key, scope, notes):
    s = CONFIG['sources'][key]
    return dict(extractKind='UKMR_CONTROLLED_EXTRACT', extractVersion=CONFIG['version'], family=key,
                snapshot=snapshot(key), publicationTitle=s['publicationTitle'], publicationDate=s['publicationDate'],
                sourcePeriod=s['sourcePeriod'], sourceYearLabel=s['sourceYearLabel'], importedAt=CONFIG['retrievedAt'],
                importVersion='spending-v1', releaseStatus='REFERENCE_ONLY', scope=scope, limitations=notes,
                supportingSources=[], sourceHeaders={}, selectionAccounting={}, excludedRows=[], rows=[])


def ods_tables(data):
    ns = {'t': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'x': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'o': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'}
    tables = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        root = ET.fromstring(archive.read('content.xml'))
    for table in root.findall('.//t:table', ns):
        rows = {}
        row_number = 1
        for row in table.findall('t:table-row', ns):
            cells = []
            column = 0
            for cell in row:
                repeated = int(cell.get('{'+ns['t']+'}number-columns-repeated', '1'))
                value = cell.get('{'+ns['o']+'}value')
                if value is None:
                    value = '\n'.join(''.join(p.itertext()) for p in cell.findall('x:p', ns))
                # Only columns A:BK needed; advance repeated empty tails without expanding them.
                if column < 63:
                    cells.extend([value] * min(repeated, 63-column))
                column += repeated
            repeated = int(row.get('{'+ns['t']+'}number-rows-repeated', '1'))
            if any(cells):
                for offset in range(repeated):
                    rows[row_number+offset] = cells
            row_number += repeated
        tables[table.get('{'+ns['t']+'}name')] = rows
    return tables


def xlsx_sheets(data):
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        strings = [''.join(x.itertext()) for x in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        rels = {x.get('Id'): x.get('Target') for x in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        sheets = {}
        for sheet in workbook.findall('s:sheets/s:sheet', ns):
            target = rels[sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')]
            path = target.lstrip('/') if target.startswith('/') else 'xl/'+target
            rows = {}
            for row in ET.fromstring(archive.read(path)).findall('.//s:row', ns):
                cells = {}
                for cell in row:
                    value = cell.findtext('s:v', None, ns)
                    if cell.get('t') == 's' and value is not None:
                        value = strings[int(value)]
                    if cell.get('t') == 'inlineStr':
                        value = ''.join(cell.find('s:is', ns).itertext())
                    if value is not None:
                        cells[re.sub(r'\d', '', cell.get('r'))] = value
                if cells:
                    rows[int(row.get('r'))] = cells
            sheets[sheet.get('name')] = rows
    return sheets


# Check all four actual original byte streams before extracting or writing.
raw = {key: capture(key) for key in CONFIG['sources']}
tables = ods_tables(raw['defra'])
data = tables['expenditure']
assert data[5][57] == '202324' and 'Average pence per person per week' in data[1][0]
codebank = {}
for number, row in enumerate(csv.DictReader(io.StringIO(raw['codebank'].decode('utf-8-sig'))), start=2):
    if row['SURVYR'] != '202324' or row['hhcatDescription'] != 'UK':
        raise ValueError('Unexpected codebank scope/period')
    if row['codecat'] in codebank:
        raise ValueError('Duplicate codebank code identity')
    codebank[row['codecat']] = (number, row)

defra = base('defra', 'UK survey population; per-person household food and non-alcoholic drink purchases, selected category/group rows', [
    'No household composition or fixed headcount is assigned; no city scope or household total is inferred.',
    'Selected category/group totals overlap. Code levels/label columns are source-native; do not sum all rows.',
    'Diary survey estimates are subject to sampling error and under-reporting. No inflation or behaviour adjustment.',
    'Original release 6 November 2025; current dataset page updated 19 June 2026. FYE 2024 is the source period, not 2026.',
])
defra['supportingSources'] = [dict(role='FYE 2024 UK expenditure codebank', snapshot=snapshot('codebank')), dict(role='Official Food and drink codes definitions PDF (11 December 2014; still linked by current methodology)', snapshot=snapshot('codebook'))]
defra['sourceHeaders'] = {'table': data[1][0], 'columns': data[5][:58], 'datasetUpdatedAt': CONFIG['sources']['defra']['datasetUpdatedAt']}
selected = set(CONFIG['sources']['defra']['selectedRows'])
# Independently verify the pinned selection against the source's declared levels/range.
assert selected == {13} | {i for i, r in data.items() if 16 <= i <= 348 and r[1] in ['1', '2']}
for number, cells in data.items():
    if number <= 5 or not cells[0] or cells[1] not in ['1', '2', '3', '4']:
        continue
    if number not in selected:
        defra['excludedRows'].append(dict(sourceRow=number, sourceCode=cells[0], rawValue=cells[57], reason='OUTSIDE_SELECTED_CATEGORY_GROUP_SCOPE'))
        continue
    value = cells[57]
    if not re.fullmatch(r'\d+(\.\d+)?', value) or Decimal(value) < 0 or cells[6] != 'p':
        raise ValueError(f'Defra selected expenditure/units invalid at row {number}')
    bank = codebank.get(cells[0])
    if bank:
        if abs(Decimal(value)-Decimal(bank[1]['estimate'])) > Decimal('0.00000001'):
            raise ValueError(f'Codebank/ODS discrepancy: {cells[0]}')
        bank_evidence = dict(status='RECONCILED', sourceRow=bank[0], codeDescription=bank[1]['codeDESCRIPTION'], rawEstimate=bank[1]['estimate'])
    elif cells[0] == 't4':
        bank_evidence = dict(status='ODS_PUBLISHED_COMPOSITE', explanation='Published ODS t4 aggregate has no corresponding UK codebank row; retained directly from ODS, not calculated by UKMR.')
    else:
        raise ValueError(f'Missing required codebank code {cells[0]}')
    defra['rows'].append(dict(sourceCategoryCode=cells[0], sourceCategoryLabel=next(v for v in cells[2:6] if v), codeLevel=int(cells[1]),
                             sourceHierarchyLabels=dict(zip(['foodCategory','foodGroup','majorFoodCode','minorFoodCode'], cells[2:6])),
                             rawWeeklyValue=value, sourceUnit='pence/person/week', sourcePeriod='FYE 2024', population='UK survey population',
                             sourceSheet='expenditure', sourceRow=number, sourceCell=f'BF{number}', codebank=bank_evidence))
defra['selectionAccounting'] = dict(examinedRows=len(defra['rows'])+len(defra['excludedRows']), selectedRows=len(defra['rows']), excludedRows=len(defra['excludedRows']))

sheets = xlsx_sheets(raw['ons'])
a1 = sheets['A1']
assert a1[3]['A'] == 'UK, financial year ending 2025'
assert a1[88]['A'] == 'The numbering is sequential, it does not use actual COICOP codes.'
ons = base('ons', 'UK all households; Table A1 top two sequential-numbering levels of expenditure groups 1–12', [
    'Table A1 numbering is sequential, not actual COICOP codes. Category remains coicop_expenditure, code system is explicitly ONS_A1_SEQUENTIAL.',
    'Parent totals and subgroups overlap and are rounded independently by ONS. Do not sum all records or substitute detailed sums for published parents.',
    'Essentials/Lifestyle mapping is unapproved and not emitted. No OECD scale, household composition or city multiplier.',
    'Lower-level rows, including suppressed values, and groups 13–14 are outside this selected scope, not converted to zero.',
])
ons['sourceHeaders'] = {'table': a1[2]['A'], 'period': a1[3]['A'], 'measure': ' '.join(a1[i]['G'] for i in range(6,10)), 'codeNote': a1[88]['A']}
selected = set(CONFIG['sources']['ons']['selectedRows'])
actual = {i for i,c in a1.items() if i <= 762 and re.fullmatch(r'\d+(\.\d+)?',c.get('A','')) and 'G' in c}
assert actual == selected
for number, cells in a1.items():
    if not 17 <= number <= 762:
        continue
    code_col = next((c for c in 'ABC' if re.fullmatch(r'\d+(\.\d+)*',cells.get(c,''))), None)
    if not code_col:
        continue
    if number not in selected:
        ons['excludedRows'].append(dict(sourceRow=number, sourceCode=cells[code_col], rawValue=cells.get('G',''), reason='CONTINUATION_HEADING' if 'G' not in cells else 'OUTSIDE_SELECTED_HIERARCHY_DEPTH'))
        continue
    raw_code = cells['A']
    # The source stores some display identifiers as binary floating-point numbers.
    code = format(Decimal(raw_code), '.1f') if '.' in raw_code else raw_code
    value = cells['G']
    if not re.fullmatch(r'\d+(\.\d+)?',value) or Decimal(value) < 0:
        raise ValueError(f'ONS selected value invalid at row {number}; no suppression-to-zero fallback')
    ons['rows'].append(dict(sourceCategoryCode=code, sourceCategoryLabel=cells['B'], parentSourceCategoryCode=code.split('.')[0] if '.' in code else None,
                           hierarchyLevel=2 if '.' in code else 1, rawSourceCode=raw_code, rawWeeklyValue=value, sourceUnit='GBP/household/week',
                           sourcePeriod='FYE 2025', population='All households', sourceSheet='A1', sourceRow=number, sourceCell=f'G{number}'))
ons['selectionAccounting'] = dict(examinedRows=len(ons['rows'])+len(ons['excludedRows']), selectedRows=len(ons['rows']), excludedRows=len(ons['excludedRows']))
assert len(defra['rows']) == 32 and len(ons['rows']) == 53
outputs = [('defra-fye2024.json',defra), ('ons-fye2025.json',ons)]
for name, extract in outputs:
    path = ROOT/'src/data/controlled/spending'/name
    serialized = (json.dumps(extract,indent=2,ensure_ascii=False)+'\n').encode()
    if args.check:
        if path.read_bytes() != serialized:
            raise ValueError(f'{path}: controlled bytes differ')
    else:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(serialized)
    print(f"{'Verified' if args.check else 'Extracted'} {name}: {len(extract['rows'])} selected rows")
