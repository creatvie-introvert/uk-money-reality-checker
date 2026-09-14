"""Extract reviewed energy cells from pinned /tmp captures without modifying originals."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).with_name('energy-sources.json')).read_text())
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', type=Path, default=Path('/tmp'))
parser.add_argument('--check', action='store_true')
args = parser.parse_args()

def capture(filename, checksum):
    data = (args.source_dir / filename).read_bytes()
    if hashlib.sha256(data).hexdigest() != checksum:
        raise ValueError(f'{filename}: checksum differs; a new reviewed snapshot is required')
    return data

def snapshot(source, key, url, checksum, fmt, reason):
    return dict(snapshotId=key, sourceId=source, retrievedAt=CONFIG['retrievedAt'], sourceFormat=fmt, retention='METADATA_ONLY', sourceUrl=url, checksum='sha256:'+checksum, nonRetentionReason=reason)

def save(name, data):
    path=ROOT/'src/data/controlled/energy'/name
    serialized=json.dumps(data,indent=2,ensure_ascii=False)+'\n'
    if args.check:
        if path.read_text()!=serialized:raise ValueError(f'{path}: bytes differ')
    else:path.write_text(serialized)
    print(f'{"Verified" if args.check else "Extracted"} {name}: {len(data["rows"])} observations')

for spec in CONFIG['need']:
    key=spec['key'];filename=f'ukmr-need-{key}.xlsx'
    capture(filename,spec['checksum']);selected={};headers=None
    with zipfile.ZipFile(args.source_dir/filename) as z:
        ss=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)]
        for _,row in ET.iterparse(z.open('xl/worksheets/sheet2.xml'),events=['end']):
            if row.tag!='{'+NS['s']+'}row':continue
            number=int(row.get('r'));cells={}
            for c in row:
                value=c.findtext('s:v',None,NS)
                if c.get('t')=='s' and value is not None:value=ss[int(value)]
                cells[''.join(filter(str.isalpha,c.get('r')))]=value
            if number==5:headers=cells
            if number in spec['selectedRows']:selected[number]=cells
            row.clear()
    if sorted(selected)!=spec['selectedRows']:raise ValueError('Missing selected source rows')
    observations=[];profiles=[]
    for number,c in selected.items():
        if c['A']!='2024':raise ValueError('Wrong source year')
        ew=key=='ew'
        profile=dict(profileId=f'{key}:Table:{number}',sourceYear=2024,sourceNationGroup='England and Wales' if ew else 'Scotland',region=c['C'] if ew else 'Scotland',regionCode=c['B'] if ew else None,propertyType=c['D' if ew else 'B'],propertyAge=c['E' if ew else 'C'],bedroomBand=c['F' if ew else 'D'],gasPresent=c['G' if ew else 'E'],electricityType=c['H' if ew else 'F'],sampleCount=int(c['I' if ew else 'G']),sourceTable='Table',sourceRow=number)
        profiles.append({**profile,'rawCells':c})
        for fuel,cols in [('gas','JKLM' if ew else 'HIJK'),('electricity','NOPQ' if ew else 'LMNO')]:
            for statistic,col in zip(['mean','lower_quartile','median','upper_quartile'],cols):
                # This is source non-applicability, not an observed zero or a rejected required gas measure.
                if fuel=='gas' and profile['gasPresent']=='No':
                    if c[col]!='[no data]':raise ValueError('Unexpected gas value without matched gas meter')
                    continue
                observations.append({**profile,'fuel':fuel,'statistic':statistic,'rawAnnualKwh':c[col],'sourceCell':col+str(number),'sourceHeading':headers[col]})
    save(f'need-{key}-2024.json',dict(extractKind='UKMR_CONTROLLED_EXTRACT',extractVersion='1.0.0',snapshot=snapshot('SRC-003',f'need-{key}-2026-release-2024',spec['url'],spec['checksum'],'XLSX','Original DESNZ workbook stays in /tmp; labelled OGL-compatible selected-cell extract retained.'),publicationDate='2026-06-11',sourcePeriod='2024',importedAt=CONFIG['retrievedAt'],importVersion='energy-v1',releaseStatus='REFERENCE_ONLY',scope={'latestSourceRowCount':spec['latestSourceRows'],'selectedProfileCount':len(profiles),'fullJointTableCoverage':'PARTIAL','selection':'First 2024 source row for every region/property-type pairing, augmented by first rows covering all remaining native dimension values; rows are reference examples, not representative household defaults.'},sourceHeaders=headers,profiles=profiles,rows=observations))

page=capture('ukmr-ofgem-energy.html',CONFIG['ofgemPageChecksum']).decode()
for spec in CONFIG['ofgem']:
    if spec['url'] not in page:raise ValueError('Table capture not linked by captured official page')
    data=capture('ukmr-ofgem-'+spec['local']+'.js',spec['checksum']).decode()
    options=json.JSONDecoder().raw_decode(data.split('var options = ',1)[1])[0]
    title=re.sub('<[^>]*>','',options['options']['title']['text'])
    if title!=spec['title']:raise ValueError('Table title changed')
    source=options['data']['value'];header=source[0]
    if header[1]!='Daily standing charge July to September 2026' or header[3]!='Unit rate July to September 2026':raise ValueError('Wrong selected cap period')
    rows=[];excluded=[]
    for i,r in enumerate(source[1:],start=2):
        if r[0]=='Great Britain average':excluded.append({'sourceRow':i,'reason':'National average outside regional scope'});continue
        row=dict(region=r[0],fuel=spec['fuel'],paymentMethod=spec['paymentMethod'],effectiveFrom='2026-07-01',effectiveTo='2026-09-30',rawStandingCharge=r[1],rawUnitRate=r[3],sourceTableId=spec['key'],sourceTableTitle=title,sourceRow=i,standingChargeColumn=header[1],unitRateColumn=header[3])
        if spec['electricityTariffType']:row['electricityTariffType']=spec['electricityTariffType']
        rows.append(row)
    if len(rows)!=14 or len({r['region'] for r in rows})!=14:raise ValueError('Expected 14 unique regions')
    save(f'ofgem-{spec["key"]}-2026-q3.json',dict(extractKind='UKMR_CONTROLLED_EXTRACT',extractVersion='1.0.0',snapshot=snapshot('SRC-OFGEM-REGIONAL',f'ofgem-{spec["key"]}-2026-q3',spec['url'],spec['checksum'],'JAVASCRIPT','Ofgem redistribution/licensing unresolved. Original official page and embedded table script remain in /tmp; retain only labelled UKMR selected rate facts and provenance, not raw content.'),officialPageUrl=CONFIG['ofgemPageUrl'],officialPageChecksum='sha256:'+CONFIG['ofgemPageChecksum'],sourcePeriod='2026-Q3',importedAt=CONFIG['retrievedAt'],importVersion='energy-v1',releaseStatus='RELEASE_READY',excludedSourceRows=excluded,rows=rows))
