"""Current display identity, preserving source labels, campus and historical context."""
import json
import re
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parents[3] / 'app/src/data/universityIdentities.json'
REGISTRY = json.loads(REGISTRY_PATH.read_text(encoding='utf-8'))
AS_OF = REGISTRY['as_of']
IDENTITIES = {alias: item for item in REGISTRY['identities']
              if not item['effective_date'] or item['effective_date'] <= AS_OF
              for alias in item['aliases']}
MARK = '[대학명 이력 2026-11-24]'


def unit_key(unit):
    return re.sub(r'\s+', '', unit.replace('・', '·').replace('ㆍ', '·').removesuffix('(담양)'))


def current_name(name):
    return IDENTITIES.get(name, {}).get('current_name', name)


def matches_rule(row, rule):
    base = current_name(row['university']).split('(')[0]
    return (base == rule['university'] and row['result_year'] in rule['years']
            and unit_key(row['recruit_unit']) in {unit_key(u) for u in rule['units']})


def exclusion_reason(row):
    return '통합대학 내 전문학사(2년제); 4년제 입결과 분리 보존' if any(
        matches_rule(row, rule) for rule in REGISTRY['associate_rules']) else ''


def normalize(row):
    r = row.copy()
    original = r['university']
    target = current_name(original)
    proof = ''
    for rule in REGISTRY['campus_rules']:
        if matches_rule(r, rule):
            target = rule['current_name']
            proof = f"; 캠퍼스 근거 {rule['source_url']} {rule['source_page']}"
            break
    history = ''
    if target in ['강원대학교(강릉)', '강원대학교(원주)']:
        history = '; 2026-03-01 강원대 통합; 2024·2025 결과는 통합 전 국립강릉원주대 자료'
    if target.startswith('국립경국대학교'):
        # The former parser described both 2024 and 2025 as the old institution.
        # The effective date and the source's admission label are different facts.
        r['note'] = r['note'].replace('2024·2025 결과의 당시 교명은 국립안동대학교; 통합 후 현 교명으로 묶음',
                                    '국립안동대 계열 결과; 2025-03-01 국립경국대 출범; 원문 모집 명칭과 통합 후 교명 구분')
        history = '; 2025-03-01 안동대·경북도립대 통합; 학과 승계·전형 동일성은 별도 확인'
    if (target != original or history) and MARK not in r['note']:
        r['note'] = r['note'].rstrip('; ') + f'; {MARK} 수집 원본 대학명={original}; 현재 표시명={target}' + history + proof
    r['university'] = target
    return r
