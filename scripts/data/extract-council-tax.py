"""Read verified official files into labelled UKMR extracts; never edit workbooks.
Usage: python3 scripts/data/extract-council-tax.py ENGLAND.ods SCOTLAND.xlsx
Only the reviewed seven authorities and A-H cells are selected. No band ratios
or liability formulas are evaluated. New upstream files require a new review.
"""
import hashlib
import json
import sys
import zipfile
from decimal import Decimal
from pathlib import Path
import xml.etree.ElementTree as ET

DEST = Path(__file__).resolve().parents[2] / 'src/data/controlled/council-tax/2026-27'
CAPTURED = '2026-09-14T15:04:59Z'
EN_URL = 'https://assets.publishing.service.gov.uk/media/69de1fa63e81003ae0422508/Tables_1-9_2026-27.ods'
SC_URL = 'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2019/04/council-tax-datasets/documents/average-council-tax-per-dwelling/council-tax-by-band-2026-27/council-tax-by-band-2026-27/govscot%3Adocument/CTAS%2B2026%2B-%2BCouncil%2BTax%2BAssumptions%2B-%2BCouncil%2BTax%2Bby%2BBand%2B-%2B2026-27.xlsx'
EN_CODES = {'E08000025': 'Birmingham', 'E08000003': 'Manchester', 'E08000035': 'Leeds', 'E08000012': 'Liverpool', 'E06000023': 'Bristol'}
SC_NAMES = {'City of Edinburgh', 'Glasgow City'}

def envelope(path, source_id, url, fmt, rows, notes):
    return dict(extractKind='UKMR_CONTROLLED_EXTRACT', extractVersion='1.0.0',
        description='UKMR-controlled cell extract from the verified official spreadsheet; not an original official file or API.',
        snapshot=dict(retention='METADATA_ONLY', snapshotId=f'{source_id}-council-tax-2026-27-20260914-v1',
            sourceId=source_id, sourceUrl=url, sourceReference='2026/27 council-tax official spreadsheet',
            retrievedAt=CAPTURED, sourceFormat=fmt,
            checksum='sha256:'+hashlib.sha256(path.read_bytes()).hexdigest(),
            nonRetentionReason='Original official file downloaded and inspected outside Git; controlled selected-cell extract retained in Git. Checksum is of the actual downloaded original bytes.'),
        importedAt=CAPTURED, importVersion='council-tax-2026-27-v1', releaseStatus='RELEASE_READY',
        methodologyNotes=notes, rows=rows)

def england(path):
    ns = {'t':'urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'o':'urn:oasis:names:tc:opendocument:xmlns:office:1.0'}
    with zipfile.ZipFile(path) as z:
        root=ET.fromstring(z.read('content.xml'))
    table=next(t for t in root.findall('.//t:table',ns) if t.get('{'+ns['t']+'}name')=='Table_9')
    assert '2026 to 2027' in ''.join(table.find('t:table-row',ns).itertext())
    out=[]
    for row_num,row in enumerate(table.findall('t:table-row',ns),1):
        cells=[]
        for c in row:
            cells.extend([c]*int(c.get('{'+ns['t']+'}number-columns-repeated','1')))
        if len(cells)<14: continue
        code=''.join(cells[1].itertext())
        if code not in EN_CODES: continue
        name=''.join(cells[2].itertext());assert name==EN_CODES[code]
        for band,col in zip('ABCDEFGH', range(6,14)):
            cell=cells[col]; raw=cell.get('{'+ns['o']+'}value')
            displayed=''.join(cell.itertext()).replace(',','')
            assert raw is not None and Decimal(displayed)>0
            assert len(displayed.split('.')[-1])==2
            out.append(dict(authorityName=name,authorityCode=code,nation='England',taxYear='2026/27',band=band,
                chargeScope='AREA_TWO_ADULTS_INCLUDING_PRECEPTS',sourceTable='Table_9',
                sourceCell=f'{chr(65+col)}{row_num}',rawSourceValue=raw,displayedAnnualGbp=displayed,
                sourceNumberFormat='ODS cached two-decimal displayed text',sourceAuthorityName=name,
                effectiveFrom='2026-04-01',effectiveTo='2027-03-31'))
    assert len(out)==40
    return envelope(path,'SRC-002',EN_URL,'ODS',out,
        'Table_9 area council tax for a dwelling occupied by two adults, A-H; includes parish and adult social care precepts (note p). Not a billing-authority-only component; no precept breakdown is inferred. ODS cached display text supplies annual GBP. Five reviewed authorities selected by exact ONS code; other rows intentionally outside extract scope, including every London authority.')

def scotland(path):
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as z:
        strings=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
        sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        styles=ET.fromstring(z.read('xl/styles.xml'))
        formats={e.get('numFmtId'):e.get('formatCode') for e in styles.findall('s:numFmts/s:numFmt',ns)}
        xfs=styles.find('s:cellXfs',ns)
        assert 'CT by Band, 2026-27' in z.read('xl/workbook.xml').decode()
    out=[]
    for row in sheet.findall('.//s:row',ns):
        cells={c.get('r').rstrip('0123456789'):c for c in row}; first=cells.get('A')
        if first is None or first.get('t')!='s':continue
        raw_name=strings[int(first.findtext('s:v',None,ns))];name=raw_name.strip()
        if name not in SC_NAMES:continue
        for band,col in zip('ABCDEFGH','BCDEFGHI'):
            cell=cells[col];raw=cell.findtext('s:v',None,ns)
            fmt=formats[xfs[int(cell.get('s'))].get('numFmtId')]
            assert fmt=='"£"#,##0.00' and raw is not None and cell.find('s:f',ns) is None
            # Apply only the file's inspected 2dp display format. Selected values
            # have no exact half-penny tie; no alternative rounding rule is chosen.
            assert (Decimal(raw)*100)%1 != Decimal('.5')
            displayed=format(Decimal(raw),'.2f')
            out.append(dict(authorityName=name,nation='Scotland',taxYear='2026/27',band=band,
                chargeScope='COUNCIL_TAX_EXCLUDING_WATER_SEWERAGE',sourceTable='CT by Band, 2026-27',
                sourceCell=cell.get('r'),rawSourceValue=raw,displayedAnnualGbp=displayed,
                sourceNumberFormat=fmt,sourceAuthorityName=raw_name,
                effectiveFrom='2026-04-01',effectiveTo='2027-03-31'))
    assert len(out)==16
    return envelope(path,'SRC-020',SC_URL,'XLSX',out,
        'Council Tax by band 2026/27, City of Edinburgh and Glasgow City; source footnote excludes water and sewerage. Raw OOXML decimal text and source cell format preserved. Display follows the source GBP two-decimal format, not a recomputation from Band D. Selected values have no exact half-penny tie. Names are whitespace-trimmed; no authority code occurs in this source, so none is inferred.')

if __name__=='__main__':
    assert len(sys.argv)==3, __doc__
    # These fixed metadata IDs/timestamps belong only to the reviewed file bytes.
    for filename, expected in zip(sys.argv[1:], ['66b7c20f70c804038c0a392ff2b7249fd09e83f4e88ac87d0278ce7e19da5537', 'fa3f5ed1b3261293bb4603d0a3f5dff5d76ca65c10583af754c7701f7443b1ad']):
        assert hashlib.sha256(Path(filename).read_bytes()).hexdigest()==expected, 'Changed source bytes require a new capture review/version'
    DEST.mkdir(parents=True,exist_ok=True)
    for name,extract in [('england-table9',england(Path(sys.argv[1]))),('scotland-bands',scotland(Path(sys.argv[2])))]:
        (DEST/f'{name}.json').write_text(json.dumps(extract,indent=2,ensure_ascii=False)+'\n')
        print(name,len(extract['rows']),extract['snapshot']['checksum'])
