"""Build a traceable campus map from the Ministry of Education XLSX (not demo coordinates).

python app/tools/build_university_map.py
The local source snapshot and explicit supplements make regeneration offline/reproducible.
No human approval or review identity is manufactured by this importer.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'work/_data/university-map'
SOURCE = DATA / 'moe-campus-coordinates.xlsx'
URL = 'https://www.data.go.kr/data/15138981/fileData.do'
AS_OF = '2026-11-25'
SOURCE_DATE = '2025-11-26'
SIDO = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도']
REGIONS = dict(zip(['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'], SIDO))
REGIONS.update({v:v for v in SIDO})
REGIONS.update({'강원도':'강원특별자치도', '전라북도':'전북특별자치도'})
KINDS = {'대학교':'일반대학', '교육대학':'교육대학', '산업대학':'산업대학'}
FOUNDING = {'국립':'국립', '국립대법인':'국립', '공립':'공립', '사립':'사립', '특별법법인':'특별법 법인', '특별법국립':'국립'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')


def base(name):
    return re.sub(r'\([^)]*\)', '', name).strip()


def key(name):
    return re.sub(r'\s+', '', base(name)).removeprefix('국립')


def build():
    directory = read(ROOT / 'work/_data/university-directory/directory.json')['universities']
    identities = read(ROOT / 'app/src/data/universityIdentities.json')
    lookup = {key(i['university']):i['university'] for i in directory}
    ids = {i['university']:i['id'] for i in directory}
    for i in identities['identities']:
        if i.get('effective_date') and i['effective_date'] > AS_OF:
            continue
        current = lookup.get(key(i['current_name']), base(i['current_name']))
        for alias in i['aliases']:
            lookup[key(alias)] = current
    # Effective mergers from the existing source-backed identity registry, never future plans.
    event_sources = {}
    for event in identities['events']:
        if (event.get('effective_date') or '9999') > AS_OF or event.get('status') != 'effective':
            continue
        successor = lookup.get(key(event['successor']), event['successor'])
        if successor not in ids:
            continue
        for predecessor in event['predecessors']:
            if key(predecessor) != key(successor):
                lookup[key(predecessor)] = successor
                event_sources[key(predecessor)] = event['source_url']

    workbook = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    values = iter(workbook.active.values)
    header = next(values)
    source_rows = [dict(zip(header, row)) for row in values]
    workbook.close()
    rows, excluded = [], Counter()
    for row in source_rows:
        # This record points to KCUE's office, not a teaching campus (kcue.or.kr/about/location.php).
        if row['학교코드변환'] == 'A0000639':
            excluded['대교협 사무실 행 · 대학 확인 불가'] += 1
            continue
        if row['학교구분'] != '대학' or row['학교상태'] == '폐교':
            excluded['대학원·전문대학·폐교'] += 1
            continue
        kind = KINDS.get(row['학제'])
        if row['학교명'] == '한국예술종합학교':
            kind = '특별법 대학'
        if not kind:
            excluded['지도 범위 외 학제'] += 1
            continue
        if row['설립구분'] in ['특별법법인','특별법국립']:
            kind = '특별법 대학'
        name = lookup.get(key(row['학교명']), base(row['학교명']))
        address = str(row['도로명 주소']).strip()
        parts = address.split()
        sido = REGIONS.get(parts[0], REGIONS.get(row['지역']))
        sigungu = '세종시' if sido == '세종특별자치시' else parts[1]
        if sido != '세종특별자치시' and len(parts) > 2 and parts[2].endswith('구') and parts[1].endswith('시'):
            sigungu += ' ' + parts[2]
        suffix = re.search(r'\(([^)]*)\)', row['학교명'])
        campus = suffix.group(1) if suffix else row['본분교']
        if campus in ['본교','분교','제2캠퍼스','제3캠퍼스','제4캠퍼스']:
            campus += ' · ' + sigungu
        lat, lng = float(row['위도']), float(row['경도'])
        assert sido in SIDO and 33 <= lat <= 38.7 and 124.5 <= lng <= 131, row
        code = row['학교코드변환']
        rows.append(dict(campus_id='moe-'+code, univ_id=ids.get(name, 'university-'+hashlib.sha256(name.encode()).hexdigest()[:16]),
            name=name, campus=campus, campus_type='분교' if row['본분교']=='분교' else '본교',
            school_kind=kind, founding=FOUNDING[row['설립구분']], sido=sido, sigungu=sigungu,
            address=address, lat=lat, lng=lng, review_status='source-published',
            source_url=URL, source_school_code=code, source_name=row['학교명'], source_campus_type=row['본분교'],
            source_as_of=SOURCE_DATE, identity_source=event_sources.get(key(row['학교명']), ''),
            aliases=[row['학교명']] if row['학교명'] != name else []))

    supplements_path = DATA / 'campus-supplements.json'
    supplements = read(supplements_path) if supplements_path.exists() else []
    for extra in supplements:
        item = dict(extra)
        if 'source_school_code' in item and 'lat' not in item:
            found = next(r for r in source_rows if r['학교코드변환'] == item['source_school_code'])
            item.update(lat=float(found['위도']), lng=float(found['경도']), address=found['도로명 주소'].strip(),
                        source_url=URL, source_name=found['학교명'], source_as_of=SOURCE_DATE)
        item['univ_id'] = ids.get(item['name'], 'university-'+hashlib.sha256(item['name'].encode()).hexdigest()[:16])
        item['review_status'] = 'source-published'
        assert item.get('source_url') and item.get('campus_source_url'), item
        assert 33 <= item['lat'] <= 38.7 and 124.5 <= item['lng'] <= 131, item
        # Supplements represent campuses absent from the undergrad source, not duplicates of them.
        assert not any(r['name']==item['name'] and abs(r['lat']-item['lat'])<.0001 and abs(r['lng']-item['lng'])<.0001 for r in rows), item
        rows.append(item)

    rows.sort(key=lambda r:(SIDO.index(r['sido']), r['name'], r['campus']))
    assert len({r['campus_id'] for r in rows}) == len(rows)
    names = {r['name'] for r in rows}
    missing = [i['university'] for i in directory if i['university'] not in names]
    document = dict(format='jinhak-navi-univ-map', version=2, provenance='official-published',
        base_date=SOURCE_DATE, assembled_at=AS_OF, identity_as_of=AS_OF,
        list_source='교육부 대학교 주소기반 좌표정보 · 대학 공식 캠퍼스 안내',
        list_as_of=SOURCE_DATE, reviewed_at='',
        source_url=URL, source_sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        coordinate_source='교육부 공개 좌표 · 일부 캠퍼스는 공식 주소와 공개 주소 좌표로 보완',
        scope='일반대학·교육대학·산업대학·특별법 대학의 캠퍼스. 전문대학·사이버대학·대학원 단독 기관·폐교 제외.',
        campuses=rows)
    report = dict(as_of=AS_OF, source_as_of=SOURCE_DATE, source_rows=len(source_rows),
        campuses=len(rows), universities=len(names), directory_universities=len(directory),
        directory_mapped=len(directory)-len(missing), directory_unmapped=missing,
        region_counts=dict(Counter(r['sido'] for r in rows)), excluded=dict(excluded),
        extra_universities=sorted(names-{i['university'] for i in directory}))
    write(ROOT / 'app/public/data/univ-map.json', document)
    write(DATA / 'mapping-report.json', report)
    with (DATA / 'campus-mapping.csv').open('w',encoding='utf-8-sig',newline='') as f:
        fields=['campus_id','univ_id','name','campus','campus_type','school_kind','founding','sido','sigungu','address','lat','lng','source_url','source_as_of']
        writer=csv.DictWriter(f,fields,extrasaction='ignore');writer.writeheader();writer.writerows(rows)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return document, report


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    build()
