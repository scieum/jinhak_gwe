"""Reconcile the local source lists without merging campus result packages."""
from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'work/_data/university-directory'
AS_OF = '2026-11-24'
EXPLICIT = {'한국외대': '한국외국어대학교', '한국체대': '한국체육대학교', '추계예대': '추계예술대학교'}
ACRONYMS = {'KAIST', 'GIST', 'UNIST'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def key(name):
    return re.sub(r'\s+', '', name).replace('대학교', '대').replace('여자대', '여대')


def parts(name):
    match = re.fullmatch(r'([^()]+)\(([^()]+)\)', name)
    if not match:
        return name, '', 'unspecified'
    base, suffix = match.groups()
    if suffix in ACRONYMS:
        return name, '', 'unspecified'
    if suffix == '구KC대':
        return base, '', 'former_name'
    kind = 'unconfirmed' if '미확인' in suffix else 'shared' if any(t in suffix for t in ['공통', '통합', '·']) else 'named'
    return base, suffix, kind


def write_csv(path, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, list(rows[0])); writer.writeheader(); writer.writerows(rows)


def build():
    sources = {
        'plans': ROOT / 'app/public/data/admission-plans.json',
        'results': ROOT / 'app/public/data/collected-results/index.json',
        'identities': ROOT / 'app/src/data/universityIdentities.json',
    }
    plans, results, identities = (read(sources[k]) for k in ['plans', 'results', 'identities'])
    canonical = {}
    for plan in plans['entries']:
        base = parts(plan['university'])[0]
        old = canonical.setdefault(key(base), base)
        assert old == base, f'Ambiguous university abbreviation: {old}, {base}'
    for name in identities['roster']:
        canonical[key(name)] = name
    canonical.update({key(k): v for k, v in EXPLICIT.items()})
    history_names = {alias: i['current_name'] for i in identities['identities']
                     if not i['effective_date'] or i['effective_date'] <= AS_OF for alias in i['aliases']}

    def resolve(label):
        current = history_names.get(label, label)
        base, campus, kind = parts(current)
        university = canonical.get(key(base), base)
        display = university + (f'({campus})' if campus else '')
        return university, display, campus, kind

    institutions = {}
    def institution(name):
        return institutions.setdefault(name, dict(id='university-' + hashlib.sha256(name.encode()).hexdigest()[:16],
            university=name, aliases=[], plan_regions=[], plan_entries=[], result_entries=[], result_rows=0,
            result_years=[], source_urls=[], events=[]))

    for plan in plans['entries']:
        name = resolve(plan['university'])[0]
        i = institution(name)
        i['plan_regions'].append(plan['region'])
        i['plan_entries'].append(dict(id=plan['id'], university=plan['university'], campus=plan['campus'],
                                      region=plan['region'], year=plan['year']))
        i['source_urls'].extend(d['source_url'] for d in plan['documents'])

    label_map, result_details = {}, []
    for entry in results['universities']:
        raw = entry['university']
        name, display, campus, kind = resolve(raw)
        i = institution(name)
        i['aliases'].append(raw)
        i['result_entries'].append(dict(source_label=raw, display_label=display, campus_label=campus,
            campus_status=kind, rows=entry['rows'], years=entry['years'], package_file=entry['file']))
        i['result_rows'] += entry['rows']
        i['result_years'].extend(entry['years'])
        if raw != display:
            label_map[raw] = display
        result_details.append(dict(university=name, display_label=display, source_label=raw,
            campus_label=campus, campus_status=kind, rows=entry['rows'], years=';'.join(entry['years']),
            package_file=entry['file']))
    # A supplied national roster must remain visible even without an admissions package.
    for name in identities['roster']:
        institution(name)
    for i in institutions.values():
        for field in ['aliases', 'plan_regions', 'result_years', 'source_urls']:
            i[field] = sorted(set(i[field]))
        i['events'] = [e['id'] for e in identities['events'] if i['university'] in [e['successor'], *e['predecessors']]]
        i['coverage'] = 'both' if i['plan_entries'] and i['result_entries'] else 'plans_only' if i['plan_entries'] else 'results_only' if i['result_entries'] else 'roster_only'
    entries = sorted(institutions.values(), key=lambda i: i['university'])
    assert sum(i['result_rows'] for i in entries) == results['rows']
    assert sum(len(i['result_entries']) for i in entries) == len(results['universities'])
    assert sum(len(i['plan_entries']) for i in entries) == len(plans['entries'])
    counts = dict(universities=len(entries), result_labels=len(result_details), result_rows=results['rows'],
        plan_entries=len(plans['entries']), standardized_result_labels=len(label_map),
        result_universities=sum(bool(i['result_entries']) for i in entries),
        plans_only=sum(i['coverage']=='plans_only' for i in entries),
        results_only=sum(i['coverage']=='results_only' for i in entries))
    OUT.mkdir(parents=True, exist_ok=True)
    document = dict(format='university-directory', version=1, as_of=AS_OF, status='draft',
        scope='Local 2024–2026 collected results, 2028 plans and national identity roster; not a census of all Korean universities or verified campus equivalence.',
        sources={k: dict(path=p.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for k,p in sources.items()},
        counts=counts, universities=entries)
    (OUT/'directory.json').write_text(json.dumps(document, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    flat = [dict(university=i['university'], plan_regions=';'.join(i['plan_regions']),
        result_labels=';'.join(e['display_label'] for e in i['result_entries']), result_rows=i['result_rows'],
        result_years=';'.join(i['result_years']), plan_entries=len(i['plan_entries']),
        plan_campus_labels=';'.join(f"{p['university']} / {p['campus']}" for p in i['plan_entries']), coverage=i['coverage']) for i in entries]
    write_csv(OUT/'universities.csv', flat)
    write_csv(OUT/'result-labels.csv', result_details)
    write_csv(OUT/'plan-campus-labels.csv', [dict(university=i['university'], source_university=p['university'],
        source_campus=p['campus'], plan_id=p['id'], source_region=p['region'], plan_year=p['year'],
        result_campus_mapping='not_asserted') for i in entries for p in i['plan_entries']])
    (ROOT/'app/src/data/universityDisplayNames.json').write_text(json.dumps(label_map, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    states = {'both':'입결·계획 있음', 'plans_only':'입결 미수록', 'results_only':'계획 목록 미수록', 'roster_only':'명단만 확인'}
    lines = ['# 대학 기준 목록 — '+AS_OF, '',
        f"현재 자료 기준 **{counts['universities']}개 대학**, 입결 **{counts['result_labels']}개 자료 묶음·{counts['result_rows']:,}행**, 전형계획 **{counts['plan_entries']}개 항목**이다. 대학 수와 캠퍼스·자료 묶음 수를 구분한다.", '',
        f"약칭·표기 {counts['standardized_result_labels']}개를 정식 대학명으로 연결했다. 대학별 원본 입결 패키지와 캠퍼스 구분은 유지했다. 한국체대 925행은 한국체육대학교에 집계한다.", '',
        '지역은 **2028 전형계획 원문의 지역 표기**다. 입결의 각 캠퍼스 위치를 확정하는 값이 아니며 `전남광주` 같은 원문 합성 지역도 유지했다. 전형계획의 본교·제2캠퍼스 코드와 입결의 캠퍼스는 자동 대응시키지 않았다.', '',
        '대학 이름 아래에 캠퍼스 자료를 모았으나 본교·분교의 법적 지위나 입시 단위를 합친 것은 아니다. 캠퍼스 미표기·미확인·공통 자료는 독립 자료 묶음으로 유지한다. 계획만 있는 대학도 목록에서 제외하지 않았다. 국내 모든 대학의 전수 명단이 아니라 현재 확보 자료의 기준 목록이다. `입결·계획 있음`은 대학 단위 보유 상태이며 모든 캠퍼스의 자료가 있다는 뜻은 아니다.', '',
        '[대학별 CSV](universities.csv) · [입결 캠퍼스·표시명 대조 CSV](result-labels.csv) · [전형계획 본교·분교·캠퍼스 CSV](plan-campus-labels.csv) · [출처·원본 ID를 포함한 JSON](directory.json)', '',
        '재생성: `python app/tools/build_university_directory.py`. 입력 파일 해시는 JSON에 기록한다. 표기 정리는 검수·라이선스 승인이나 성적 판정용 데이터 승격을 의미하지 않는다.', '',
        '| 대학 | 계획 자료 지역 | 입결 자료 묶음 | 입결 행 | 전형계획의 캠퍼스 표기 | 보유 상태 |', '|---|---|---|---:|---|---|']
    for i in entries:
        labels = '; '.join((e['campus_label'] or '캠퍼스 미표기') + f" ({e['rows']:,}행)" for e in i['result_entries']) or '미수록'
        campuses = '; '.join((parts(p['university'])[1]+' / ' if parts(p['university'])[1] else '')+p['campus'] for p in i['plan_entries']) or '미수록'
        lines.append(f"| {i['university']} | {', '.join(i['plan_regions']) or '계획 목록 미수록'} | {labels} | {i['result_rows']:,} | {campuses} | {states[i['coverage']]} |")
    (OUT/'README.md').write_text('\n'.join(lines)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps(counts,ensure_ascii=False))
    return document


if __name__ == '__main__':
    build()
