"""수시 정리본(susi-results) + 계열표 초안(fields-draft.csv) → 학과별 입결 구간표 실제 자료(app/public/data/dept-tier.json).

  python app/tools/build_dept_tier.py

- 입결: app/public/data/susi-results(읽기만). 교과·종합 × 교과등급 × 9등급제 × 70% 컷 숫자(1~9)인 행만, 값은 원문 문자열 그대로.
  원문 대조가 필요한 행(review_flags, 앱의 susiIssues)은 빼고 개수만 적는다.
- 계열: work/_data/review-queue/fields-draft.csv(build_review_queue.py FIELD_RULES 학과명 규칙 추천, 검수 전 초안).
  대계열이 인문·자연인 행만. 관리자는 같은 CSV를 관리자 › 계열표에서 검수한다(이 파일은 그 검수 전 미리보기용).
- 7번째 칸은 그 행의 모집인원(숫자일 때만, 아니면 빈칸). 전형계획 모달의 증감 비교 기준.
- 모집단위 × 전형 유형마다 가장 최근 학년도 행만 남긴다(구간표는 가장 최근 한 학년도만 쓰므로 결과는 같다).
"""
from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUSI = ROOT / 'app' / 'public' / 'data' / 'susi-results'
FIELDS = ROOT / 'work' / '_data' / 'review-queue' / 'fields-draft.csv'
OUT = ROOT / 'app' / 'public' / 'data' / 'dept-tier.json'


def usable_cut(v: str) -> bool:
    try:
        return 1 <= float(v) <= 9
    except ValueError:
        return False


def main() -> None:
    with FIELDS.open(encoding='utf-8-sig', newline='') as f:
        fields = {(r['대학'], r['모집단위']): r for r in csv.DictReader(f) if r['대계열'] in ('인문', '자연') and r['중계열'] and r['소계열']}
    index = json.loads((SUSI / 'index.json').read_text(encoding='utf-8'))
    latest: dict[tuple[str, str, str], list[list]] = {}
    flagged = 0
    for entry in index['universities']:
        data = json.loads((SUSI / entry['file']).read_text(encoding='utf-8'))
        cols, strings, codes = data['columns'], data['strings'], data['review_codes']
        for cells, flags in zip(data['rows'], data['review_flags']):
            r = {c: strings[i] for c, i in zip(cols, cells)}
            if (r['round'] != '수시' or r['admission_type'] not in ('교과', '종합') or r['metric'] != '교과등급'
                    or r['grade_system'] != '9' or not usable_cut(r['cut_70']) or (r['university'], r['recruit_unit']) not in fields):
                continue
            if flags:
                flagged += 1
                continue
            key = (r['university'], r['recruit_unit'], r['admission_type'])
            row = [r['university'], r['recruit_unit'], r['admission_type'], r['program'], r['result_year'], r['cut_70'], r['quota'] if r['quota'].isdigit() else '']
            old = latest.get(key)
            if not old or row[4] > old[0][4]:
                latest[key] = [row]
            elif row[4] == old[0][4]:
                old.append(row)
    rows = [row for group in latest.values() for row in group]
    used = {(r[0], r[1]) for r in rows}
    out = {
        'format': 'jinhak-navi-dept-tier', 'version': 1, 'status': 'draft',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'susi_sha256': index['source_sha256'], 'fields_sha256': hashlib.sha256(FIELDS.read_bytes()).hexdigest(),
        'excluded_review_rows': flagged,
        'fields': [[u, unit, fields[(u, unit)]['소계열'], fields[(u, unit)]['중계열'], fields[(u, unit)]['대계열']] for u, unit in sorted(used)],
        'rows': rows,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{OUT.name}: 모집단위 {len(used)} · 대학 {len({u for u, _ in used})} · 행 {len(rows)} · 원문 확인 필요로 뺀 행 {flagged}')


if __name__ == '__main__':
    main()
