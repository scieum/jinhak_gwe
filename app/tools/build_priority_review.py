"""Build auditable review packets for priority universities. Never produce executable rules.

python app/tools/build_priority_review.py
Only work/_data/data-integration/priority-review is written. Source/package hashes
must match before any output is replaced; reviews and expected test values remain blank.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path('work/_data/data-integration')
PRIORITIES = ['강원대학교', '한림대학교', '가톨릭관동대학교', '한국교원대학교']

def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def read(root: Path, path: str | Path):
    target = (root / path).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f'Source path escapes workspace: {path}')
    return target.read_bytes()

def checked(root: Path, path: str, expected: str):
    raw = read(root, path)
    if digest(raw) != expected:
        raise ValueError(f'Source hash mismatch: {path}')
    return raw

def evidence_nodes(value, pointer=''):
    result = []
    if isinstance(value, dict):
        if isinstance(value.get('evidence'), dict):
            result.append({'source_pointer': pointer + '/evidence', **value['evidence']})
        for key, item in value.items():
            if key != 'evidence':
                result.extend(evidence_nodes(item, pointer + '/' + key.replace('~', '~0').replace('/', '~1')))
    elif isinstance(value, list):
        for i, item in enumerate(value):
            result.extend(evidence_nodes(item, pointer + '/' + str(i)))
    return result

def source_checks(root: Path, value):
    result = []
    def walk(node):
        if isinstance(node, dict):
            if 'local_path' in node and 'sha256' in node:
                raw = checked(root, node['local_path'], node['sha256'])
                result.append({'file': node['local_path'], 'sha256': digest(raw), 'bytes': len(raw), 'hash_matches': True})
            for child in node.values(): walk(child)
        elif isinstance(node, list):
            for child in node: walk(child)
    walk(value)
    return result

def build(root=ROOT, universities=PRIORITIES):
    inventory = json.loads(read(root, DATA / 'package-inventory.json'))
    source_raw = read(root, DATA / 'minimum-source-review.json')
    sources = json.loads(source_raw)
    normalized_raw = read(root, DATA / 'minimum-normalized-review.json')
    normalized = json.loads(normalized_raw)
    scopes = json.loads(read(root, DATA / 'minimum-scope-review.json'))
    if normalized['source_sha256'] != digest(source_raw):
        raise ValueError('Normalized minimum source hash mismatch')
    records = {r['id']: r for r in normalized['records']}
    outputs, index = {}, []
    entries = [e for e in inventory if e['university'] in universities]
    missing = set(universities) - {e['university'] for e in entries}
    if missing: raise ValueError(f'Unknown universities: {sorted(missing)}')
    entries.sort(key=lambda e: (universities.index(e['university']), e['package_id']))
    for entry in entries:
        package = json.loads(checked(root, entry['source_file'], entry['source_sha256']))
        pid = entry['package_id']
        local_checks = source_checks(root, package['source'])
        rules = []
        for record in sources['records']:
            if record['package_id'] != pid: continue
            norm = records[record['id']]
            if record['source_sha256'] != entry['source_sha256'] or norm['source_sha256'] != entry['source_sha256']:
                raise ValueError(f'Stale minimum record: {record["id"]}')
            if not record['checks']['references_valid']:
                raise ValueError(f'Invalid minimum references: {record["id"]}')
            parts = record['source_pointer'].strip('/').split('/')
            actual = package
            for part in parts: actual = actual[int(part)] if isinstance(actual, list) else actual[part]
            if actual != record['original_rule']:
                raise ValueError(f'Original rule mismatch: {record["id"]}')
            rules.append({'record': record, 'normalization': norm, 'review': {'status': 'not_reviewed', 'reviewer': None, 'reviewed_at': None, 'scope_confirmed': None, 'condition_confirmed': None}})
        rows = [r for r in scopes['rows'] if r['package_id'] == pid]
        if any(r['source_sha256'] != entry['source_sha256'] for r in rows):
            raise ValueError(f'Stale minimum scope: {pid}')
        categories = dict(Counter(r['normalization']['category'] for r in rules))
        statuses = dict(Counter(r['scope_status'] for r in rows))
        scoring = package.get('scoring_rules_draft', {})
        blockers = ['원문 최신 공지와 변경 공지 대조', '대학·캠퍼스·학년도·전형·모집단위별 적용 범위 확인', '작성자와 다른 검수자의 승인 기록 필요']
        if scoring.get('engine_support') == 'requires_extension': blockers.append('원본 환산 방식에 맞는 계산 엔진 확장 필요')
        if scoring.get('role') == 'susi_tiebreak_only': blockers.append('교과 총점 산식이 아니라 동점자 처리 자료: 일반 환산 규칙으로 사용 금지')
        blockers.append('공식 예시 또는 수작업으로 독립 산출한 기대값 3개 이상과 경계 사례 필요')
        packet = {'format': 'unavi-priority-review', 'version': 1, 'review_status': 'draft', 'executable': False,
            'identity': entry, 'source': package['source'], 'local_integrity': local_checks,
            'input_hashes': {'minimum_source': digest(source_raw), 'minimum_normalized': digest(normalized_raw)},
            'minimum': {'categories': categories, 'scope_statuses': statuses, 'rules': rules, 'scopes': rows},
            'scoring': {'source_pointer': '/scoring_rules_draft', 'original': scoring,
                'evidence': evidence_nodes(scoring, '/scoring_rules_draft'),
                'engine_contract': 'app/src/engine/scoring.ts#ScoringRule', 'release_blockers': blockers,
                'review': {'author': None, 'reviewer': None, 'approved_at': None, 'tests': []}},
            'source_issues': package.get('issues', [])}
        outputs[f'{pid}.json'] = packet
        index.append({'package_id': pid, 'university': entry['university'], 'campus': entry['campus'],
            'admission_year': entry['admission_year'], 'file': f'{pid}.json', 'minimum_rules': len(rules),
            'scope_pairs': len(rows), 'scope_statuses': statuses, 'categories': categories,
            'local_files_checked': len(local_checks), 'engine_support': scoring.get('engine_support', 'not_classified'),
            'scoring_role': scoring.get('role', 'not_classified'), 'release_blockers': blockers})
    return outputs, index

def write(root, packets, index):
    out = root / DATA / 'priority-review'; out.mkdir(parents=True, exist_ok=True)
    for name, packet in packets.items():
        (out / name).write_text(json.dumps(packet, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    summary = {'format': 'unavi-priority-review-index', 'version': 1, 'review_status': 'draft', 'executable': False, 'entries': index}
    (out / 'index.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with (out / 'review-index.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f); writer.writerow(['대학','캠퍼스','학년도','규칙 수','전형·모집단위 조합','연결','명시적 보류','미분류','계산 엔진 상태','원본 파일','검수자','승인일'])
        for e in index:
            writer.writerow([e['university'],e['campus'],e['admission_year'],e['minimum_rules'],e['scope_pairs'],e['scope_statuses'].get('classified',0),e['scope_statuses'].get('explicit_pending',0),e['scope_statuses'].get('unclassified',0),e['engine_support'],e['file'],'',''])
    lines = ['# 우선 대학 검수 자료', '', '자동 생성 자료. 원문 해시 검증과 내용 검수는 다릅니다. 모든 규칙은 draft이며 계산·공개 승인을 포함하지 않습니다.', '',
        '| 대학·캠퍼스 | 최저 규칙 | 연결 / 보류 / 미분류 | 환산 상태 |', '|---|---:|---|---|']
    for e in index:
        st=e['scope_statuses']
        lines.append(f"| {e['university']} {e['campus']} | {e['minimum_rules']} | {st.get('classified',0)} / {st.get('explicit_pending',0)} / {st.get('unclassified',0)} | {e['scoring_role'] if e['scoring_role'] != 'not_classified' else e['engine_support']} |")
    lines += ['', '각 JSON에는 원문 위치·문서 해시·PDF 쪽수/HWP 표 번호·원래 계산 조건·적용 조합·정규화 보류 이유가 함께 들어 있습니다.', '',
        '검수 순서: 공지와 원문 버전 확인 → 적용 범위 확인 → 원문 계산식과 엔진 대조 → 독립 기대값 테스트 → 기존 관리자 검수 절차.',
        '제3·제4캠퍼스 표기는 원본 식별자를 보존했습니다. 공지의 강릉·원주 명칭과 함께 대조해야 합니다.',
        '외부 공지 재확인 기록은 source-rechecks-2026-11-24.json을 참고하세요. 접근 성공만으로 사이트 전체 최신본이라고 판정하지 않습니다.', '']
    (out / 'README.md').write_text('\n'.join(lines), encoding='utf-8')

if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--university', action='append'); args=parser.parse_args()
    packets,index=build(universities=args.university or PRIORITIES)
    write(ROOT, packets,index)
    print(json.dumps({'packages':len(index),'minimum_rules':sum(e['minimum_rules'] for e in index),'scope_pairs':sum(e['scope_pairs'] for e in index),'executable':False},ensure_ascii=False))
