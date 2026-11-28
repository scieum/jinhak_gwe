"""Publish explicitly source-audited rules; never promote the entire draft bundle.

The source audit is Codex's PDF/text review, not a fabricated administrator approval.
Run from the repository root. Existing unrelated released rules are preserved.
"""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'work/_data/admission-plans/scoring-rules-work'
OUT = ROOT / 'app/public/data'
DATE = '2026-11-28'
AUDITED = {'plan-0000003': [4, 15, 32, 33, 34], 'plan-0000008': [13, 17, 18], 'plan-0000014': [12, 28]}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def build():
    entries = json.loads((WORK / 'inputs.json').read_text(encoding='utf-8'))
    published, coverage, audits = [], [], []
    for entry in entries:
        draft = json.loads((WORK / 'drafts' / (entry['entry'] + '.json')).read_text(encoding='utf-8'))
        for index, item in enumerate(draft['programs']):
            coverage.append({'university': entry['university'], 'program': item['program'], 'admission_year': 2028,
                             'status': item['status'], 'missing': item.get('missing', []),
                             'source': entry['files'][0]['source']})
            if entry['entry'] not in AUDITED or item['status'] != 'complete' or not item.get('fits_engine'):
                continue
            rule = copy.deepcopy(item['rule'])
            file = entry['files'][0]
            digest = hashlib.sha256((ROOT / file['path']).read_bytes()).hexdigest()
            rule.update(id=f"source-audit-2028-{entry['entry']}-{index}", version=1,
                        source=file['source'], review_status='verified', program=item['program'])
            rule.setdefault('rounding', {'digits': 6, 'mode': 'round'})
            rule['joint_curriculum_policy'] = 'include'
            pub = {'checked_by': 'Codex · 원문 표·산식 대조', 'checked_at': DATE, 'source_sha256': digest,
                   'pages': AUDITED[entry['entry']], 'scope': 'student_record',
                   'applicant': '2028학년도 국내 고교 5등급제 졸업예정자', 'notes': [],
                   'rounding': 'official', 'block_joint': True}
            if entry['entry'] == 'plan-0000003':
                rule['university'] = '강원대학교(춘천)'
                rule.pop('attendance_rule', None)
                rule['max_score'] = 1000
                rule['program'] = '학생부교과(강원인재전형)' if index == 1 else '학생부교과(일반전형)'
                rule['advanced'] = {'tracks': [
                    {'name': '예체능', 'units': ['무용학과', '스포츠과학과', '디자인학과', '미술학과', '음악학과', '체육교육과'],
                     'subject_groups': ['국어', '영어', '사회']},
                    {'name': '인문사회·자연과학·공학', 'units': ['*']}]}
                pub.update(scope='grade_component', rounding='display_only', require_department=True,
                           previous_programs=['학생부교과(지역교과전형)'] if index == 1 else ['학생부교과(일반교과전형)'])
                pub['notes'] = ['시행계획의 교과 정량 부분 1,000점만 계산해요. 출결 가감점과 최종 총점은 포함하지 않아요.',
                                '교과등급 점수와 성취도 점수의 학점 가중평균을 각각 더해요.',
                                '최종 소수점 처리 규정은 미확인으로, 화면 소수점은 표시용이에요.',
                                '이전 전형명으로 담은 경우 2028학년도 변경 전형명을 함께 확인해 주세요.']
            elif entry['entry'] == 'plan-0000008':
                # p.17: the 90-credit penalty applies to a DIFFERENT grading system,
                # not domestic 5-grade school records. The draft had dropped this condition.
                rule['advanced'].pop('credits', None)
                pub.update(require_department=True, excluded_departments=['체육교육과', '음악교육과', '미술교육과', '스포츠과학과'])
                pub['notes'] = ['학생부 100% 모집단위의 교과 900점과 출결 100점을 계산해요.',
                                '변환점수 평균을 소수 둘째 자리까지 반올림한 뒤 ×50 + 500을 적용해요.',
                                '국내 5등급제 학생에게 90학점 미만 감산을 적용하지 않아요.',
                                '학생부 70%와 실기를 반영하는 모집단위는 별도 규칙이 필요해요.']
            else:
                rule['advanced'] = {'mean_rounding': {'digits': 4, 'mode': 'floor'}}
                pub['scope'] = 'grade_component'
                pub['notes'] = ['교과 정량 부분 80점만 계산해요. 학업역량평가 20점은 포함하지 않아요.',
                                '중간 평균과 최종 점수 모두 소수 다섯째 자리에서 버림해요.',
                                '반영 교과는 학생부 교과군 기준 국어·수학·영어·사회·과학이에요.']
            rule['publication'] = pub
            published.append(rule)
            audits.append({'id': rule['id'], 'university': rule['university'], 'program': rule['program'],
                           'source_file': file['path'], 'source_sha256': digest, 'pages': pub['pages'],
                           'scope': pub['scope'], 'notes': pub['notes']})
    target = OUT / 'scoring-rules.json'
    existing = json.loads(target.read_text(encoding='utf-8'))['rules'] if target.exists() else []
    keep = [r for r in existing if not r['id'].startswith('source-audit-2028-')]
    write(target, {'format': 'jinhak-navi-scoring-rules', 'version': 1, 'generated_at': DATE + 'T00:00:00+09:00', 'rules': keep + published})
    write(OUT / 'scoring-coverage.json', {'format': 'jinhak-navi-scoring-coverage', 'version': 1, 'as_of': DATE, 'entries': coverage})
    write(ROOT / 'work/_data/scoring-rules/source-audit-2026-11-28.json', {
        'review_kind': 'source_formula_audit', 'reviewer': 'Codex', 'human_approval_claimed': False, 'date': DATE,
        'rules': audits, 'unreviewed_drafts_promoted': False,
        'validation': 'app/tests/released-scoring.test.ts: independently specified expected scores and boundary cases'})
    print(f'Published {len(published)} source-audited rules; coverage records: {len(coverage)}')


if __name__ == '__main__':
    build()
