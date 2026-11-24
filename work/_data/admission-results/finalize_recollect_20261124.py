"""Apply the reviewed 2026-11-24 supplement; retain complete before/after evidence.

Default: prepare and validate only. --apply: back up touched inputs, merge, audit.
Re-running after application verifies the recorded result without appending rows.
"""
import argparse
import copy
import csv
import hashlib
import json
import re
import shutil
from collections import Counter
from pathlib import Path

import merge

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / 'recollect-20261124'
LEDGER = CACHE / 'integration.json'
JBU_GUIDE = 'https://www.joongbu.ac.kr/upload/pdf/2025-Recruitment.pdf'
U1_GUIDE = 'https://www.u1.ac.kr/ipsi/data/notice.do?articleNo=71747&attachNo=50711&mode=download'
PETS = 'https://ipsi.joongbu.ac.kr/departmentList.es?mid=a10202080000&seq=20'


def read(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        r = csv.DictReader(f)
        assert r.fieldnames == merge.COLS, path
        return list(r)


def write(path, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, merge.COLS)
        w.writeheader()
        w.writerows(rows)


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fp(row):
    return tuple(row[k] for k in merge.COLS)


def note(row, message):
    row['note'] = row['note'].rstrip('; ') + '; 2026-11-24 ' + message


def numeric(value):
    return bool(re.fullmatch(r'\d+(?:\.\d+)?', value))


def merged(files):
    rows = []
    exempt = (merge.GYEONGGI_FOUR_YEAR | merge.CHUNGCHEONG_FOUR_YEAR |
              merge.NATIONAL_FOUR_YEAR | merge.DAEGU_GYEONGBUK_FOUR_YEAR |
              merge.BUSAN_ULSAN_GYEONGNAM_FOUR_YEAR | merge.HONAM_FOUR_YEAR |
              merge.SPECIAL_SCHOOLS)
    for name, part in sorted(files.items()):
        slug = Path(name).stem.removesuffix('-adiga')
        for raw in part:
            r = copy.deepcopy(raw)
            if merge.exclusion_reason(r):
                continue
            rows.append(r if slug in exempt else merge.normalize(r))
    return rows


def audit(rows):
    assert len(rows) == 132621, len(rows)
    counts = Counter(fp(r) for r in rows)
    assert max(counts.values()) == 1, 'Exact duplicate rows'
    for r in rows:
        assert r['result_year'] in {'2024', '2025', '2026'}, r
        assert all(r[k] for k in ['university', 'program', 'recruit_unit', 'source_url', 'source_page']), r
        for k in ['cut_50', 'cut_70']:
            assert not r[k] or numeric(r[k]), r
            if r[k] and '등급' in r['metric']:
                assert 1 <= float(r[k]) <= 9, r
    return {'total_rows': len(rows), 'by_year': dict(Counter(r['result_year'] for r in rows)),
            'exact_duplicates': 0, 'invalid_numeric_cuts': 0, 'invalid_grade_cuts': 0,
            'missing_required_fields': 0,
            'scope': '전체 행 형식·범위·완전중복 검사; 전체 원문 132621행 시각 대조를 의미하지 않음'}


def main(apply=False):
    if LEDGER.exists():
        done = json.loads(LEDGER.read_text(encoding='utf-8'))
        assert sha(ROOT / '_all.csv') == done['master_after_sha256']
        for name, digest in done['input_after_sha256'].items():
            assert sha(ROOT / name) == digest, name
        print(json.dumps({'already_applied': True, **audit(read(ROOT / '_all.csv'))}, ensure_ascii=False))
        return
    files = {p.name: read(p) for p in ROOT.glob('*.csv')
             if p.stem.removesuffix('-adiga') in merge.allowed()}
    original = copy.deepcopy(files)
    baseline = read(ROOT / '_all.csv')
    assert len(baseline) == 132606
    assert Counter(map(fp, baseline)) == Counter(map(fp, merged(files)))
    changes, additions, resolved = [], [], []

    def changed(name, before, after, reason, destination=None):
        changes.append({'file_before': name, 'file_after': destination or name,
                        'reason': reason, 'before': before, 'after': copy.deepcopy(after)})

    # The 2025 guide explicitly lists the 2024 campus before these two majors moved.
    for name in ['jbu.csv', 'jbu-adiga.csv']:
        target = name.replace('jbu', 'jbu-geumsan')
        moved = []
        for r in files[name]:
            if r['result_year'] == '2024' and any(r['recruit_unit'].startswith(x)
                    for x in ['항공서비스학전공', '문헌정보학전공']):
                before = copy.deepcopy(r)
                r['university'] = '중부대학교(금산)'
                note(r, '2024 충청국제캠퍼스 확인; 2025 고양 이전 전 학년도 기준; ' + JBU_GUIDE + ' PDF p.7')
                files[target].append(r)
                moved.append(r)
                changed(name, before, r, '2024 캠퍼스 정정', target)
        files[name] = [r for r in files[name] if r not in moved]
    assert len(changes) == 7

    # Two consecutive CNU rows were flattened into a single table cell by extraction.
    cnu_values = {
        '생물과학과': ['1.99','2.15','2.28','86.15','86.15','1.04','2.39','2.39','2.58','0.10'],
        '미생물·분자생명과학과': ['1.56','1.70','1.90','90.90','89.53','3.50','1.91','2.05','2.26','0.35'],
    }
    labels = ['최초등급 최고','최초등급 평균','최초등급 최저','최종교과 환산평균',
              '최종교과 환산70%','최종교과 환산표준편차','최종등급 평균','최종등급 70%',
              '최종등급 최저','최종등급 표준편차']
    found = 0
    for r in files['cnu.csv']:
        if r['result_year'] == '2026' and r['program'] == '학생부교과전형[지역인재]' and r['recruit_unit'] in cnu_values:
            before = copy.deepcopy(r)
            vals = cnu_values[r['recruit_unit']]
            assert r['cut_70'] == ('2.39 2.05' if r['recruit_unit'] == '생물과학과' else '')
            tail = r['cut_other'][r['cut_other'].index('최종등록인원'):]
            r['cut_other'] = '; '.join(f'{k} {v}' for k, v in zip(labels, vals)) + '; ' + tail
            r['cut_70'] = vals[7]
            note(r, '공식 PDF p.9 시각 대조; 합쳐진 두 학과 성적을 원문 행별로 분리')
            changed('cnu.csv', before, r, '두 학과 성적 추출 오류 수정')
            found += 1
    assert found == 2

    found = 0
    for r in files['kkot.csv']:
        if r['cut_70'] == '63.38 (백분위)':
            before = copy.deepcopy(r)
            r['cut_70'], r['metric'] = '63.38', '백분위'
            r['note'] = r['note'].replace('정시 환산등급은 수능등급 기준.', '해당 간호학과 정시 성적은 원문 괄호의 백분위 기준.')
            note(r, '공식 PDF p.1 시각 대조; 백분위 표기와 숫자 분리')
            changed('kkot.csv', before, r, '백분위 지표 명시')
            found += 1
    assert found == 1

    # Do not fabricate scores from text, or use 0 as a valid 1–9 grade.
    missing = {'등록자 없음','등록자없음','실기고사 100%','-','1명으로','미공개',
               '모집단위별','3명','공개하지','최종','전형결과를','실기 100%','실기100%'}
    normalized_cells = 0
    for name, rows in files.items():
        for r in rows:
            before = copy.deepcopy(r)
            for key in ['cut_50', 'cut_70']:
                value = r[key]
                if not value:
                    continue
                invalid_zero = '등급' in r['metric'] and value == '0'
                if numeric(value) and not invalid_zero:
                    continue
                assert value in missing or invalid_zero, (name, key, value)
                r['cut_other'] = '; '.join(x for x in [r['cut_other'], f'정규화 전 {key} 원문: {value}'] if x)
                r[key] = ''
                normalized_cells += 1
            if r != before:
                reason = '0등급은 유효 등급 컷에서 제외; 원문 0의 의미는 미확정' if any(
                    before[k] == '0' and not r[k] for k in ['cut_50', 'cut_70']) else '성적 칸의 비수치 문구를 원문 지표로 보존하고 컷 공란 처리'
                if name == 'ajou.csv':
                    reason += '; 공식 PDF p.2~3: 모집단위별 최종 선발 인원이 3명 이하인 경우 전형결과 비공개'
                note(r, reason)
                changed(name, before, r, reason)
    assert normalized_cells == 83, normalized_cells  # 75 text cells + 8 zero grades

    def add(name, row, reason):
        assert not any(fp(row) == fp(x) for part in files.values() for x in part)
        files.setdefault(name, []).append(row)
        additions.append({'file': name, 'reason': reason, 'row': copy.deepcopy(row)})

    for item in json.loads((ROOT / 'recollect-20261123/quarantine.json').read_text(encoding='utf-8')):
        r = copy.deepcopy(item['row'])
        if r['university'] == '유원대학교':
            name, campus, proof = 'u1-adiga.csv', '유원대학교(아산)', U1_GUIDE + ' PDF p.6(인쇄면 4)'
        else:
            goyang = r['recruit_unit'] == '스마트IT전공'
            name = 'jbu-adiga.csv' if goyang else 'jbu-geumsan-adiga.csv'
            campus = '중부대학교(고양)' if goyang else '중부대학교(금산)'
            proof = PETS if r['recruit_unit'] == '반려동물학부' else JBU_GUIDE + ' PDF p.7(2024→2025 변경표)'
        r['university'] = campus
        note(r, '보류 해제; 결과 학년도 캠퍼스 공식 자료 확인: ' + proof)
        add(name, r, '캠퍼스 보류 해제')
        resolved.append({'previous_reason': item['reason'], 'status': 'resolved', 'proof': proof, 'row': r})

    import normalize_daegu_adiga as adiga
    import normalize_national as national
    adiga.CACHE = national.CACHE = CACHE
    woosuk = [r for r in adiga.older('woosuk', '우석대학교', 2024)
              if r['round'] == '정시' and r['program'].startswith('다군')]
    assert len(woosuk) == 9
    campus_units = {r['recruit_unit'] for r in files['woosuk-jincheon.csv'] if r['result_year'] == '2024'}
    assert {r['recruit_unit'] for r in woosuk} <= campus_units
    for r in woosuk:
        r['university'] = '우석대학교(진천)'
        note(r, '진천 2024 수시 공식 모집단위와 캠퍼스 대조; 2024 정시 다군 원문 표 수록; 세부 전형명 추정 안 함')
        add('woosuk-jincheon-adiga.csv', r, '2024 진천 정시 추가 수집')

    assert len(additions) == 15
    assert len(changes) == 66, len(changes)
    expected = merged(files)
    result_audit = audit(expected)
    touched = sorted(name for name in files if files[name] != original.get(name))
    evidence = {}
    for name in ['u1-2026-additional-guide.pdf', 'jbu-2025-guide.pdf', 'jbu-2024-pets.html',
                 'woosuk-adiga-2024.html', 'chodang-board-link132.jpg', 'jnue-post14303-file0.pdf']:
        evidence[name] = sha(CACHE / name)
    review = json.loads((ROOT / 'recollect-20261123/review.json').read_text(encoding='utf-8'))
    for name in ['chodang-board-link132.jpg', 'jnue-post14303-file0.pdf']:
        assert sha(CACHE / name) == sha(ROOT / 'recollect-20261123' / name)
    for r in review:
        r['recheck'] = '2026-11-24 공식 원문 재다운로드 SHA-256 동일; 원문 불일치 미해소, 기존 처리 유지'
    manifest = {'date': '2026-11-24', 'master_before_sha256': sha(ROOT / '_all.csv'),
                'additions': additions, 'changes': changes, 'resolved_quarantine': resolved,
                'remaining_source_discrepancies': review, 'evidence_sha256': evidence,
                'normalized_text_or_zero_cells': normalized_cells, 'audit': result_audit}
    save(CACHE / 'candidate.json', manifest)
    write(CACHE / 'additions.csv', [x['row'] for x in additions])
    print(json.dumps({'additions': len(additions), 'changed_rows': len(changes), 'files': touched,
                      'reasons': dict(Counter(x['reason'] for x in changes)), 'audit': result_audit}, ensure_ascii=False))
    if not apply:
        return
    backup = CACHE / 'before-integration'
    backup.mkdir(exist_ok=True)
    assert not any(backup.iterdir()), 'Existing backup: inspect partial application before retrying'
    shutil.copy2(ROOT / '_all.csv', backup / '_all.csv')
    for name in touched:
        if (ROOT / name).exists():
            shutil.copy2(ROOT / name, backup / name)
    for name in touched:
        write(ROOT / name, files[name])
    assert merge.main() == 0
    actual = read(ROOT / '_all.csv')
    assert Counter(map(fp, actual)) == Counter(map(fp, expected)), 'Unexpected merge delta'
    manifest['audit'] = audit(actual)
    manifest['master_after_sha256'] = sha(ROOT / '_all.csv')
    manifest['input_after_sha256'] = {name: sha(ROOT / name) for name in touched}
    save(LEDGER, manifest)
    print('APPLIED: 15 additions, 66 corrections; master 132621 rows')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    main(parser.parse_args().apply)
