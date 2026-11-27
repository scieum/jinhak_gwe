"""drafts/<entry>.json(에이전트 초안) → 규칙 관리 화면 '규칙 기록 합치기'용 rule-drafts.json + 검수 목록 report.md

- 근거 인용(quote)이 원문 텍스트에 그대로 있는지 대조해요(공백 무시). 없는 인용이 있으면 그 규칙은 가져오기에서 빼요.
- complete + fits_engine + 엔진 형식 검사(validateScoringRule 이식) 통과한 것만 rule-drafts.json에 넣어요.
  모두 review_status draft · 상태 '작성 중' · ai_draft. 검수(테스트 3개 + 작성자 아닌 승인)는 사람이 해요(NEVER-1).
실행: python work/_data/scoring-rules/build.py
"""
import json, os, re, sys, uuid, glob, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
W = os.path.join(ROOT, 'work', '_data', 'admission-plans', 'scoring-rules-work')
OUT = os.path.dirname(os.path.abspath(__file__))
SEMS = {'1-1', '1-2', '2-1', '2-2', '3-1', '3-2'}
GROUPS = {'국어', '수학', '영어', '사회', '과학', '한국사', '기술·가정', '제2외국어', '한문', '정보', '교양', '체육', '예술'}
NS = uuid.UUID('6f1c2a52-6a43-4d8e-9a43-0b9d2f8e2028')


def squash(s):
    return re.sub(r'\s+', '', s or '')


def nonneg(n):
    return isinstance(n, (int, float)) and n >= 0


def valid_points(p):
    return isinstance(p, dict) and p and all(nonneg(v) for v in p.values()) and max(p.values()) > 0


def validate(r):
    """app/src/engine/scoring.ts validateScoringRule 이식. 다르면 tests/scoring-rule-drafts.test.ts가 잡아요."""
    e = []
    s = r.get('semesters') or []
    if not s or len(set(s)) != len(s) or any(x not in SEMS for x in s) or not r.get('subject_groups'): e.append('학기·교과')
    if any(g not in GROUPS for g in r.get('subject_groups') or []): e.append('교과명')
    rp = r.get('rank_grade_points')
    if not valid_points(rp) or any(k not in rp for k in '12345'): e.append('등급점수')
    sel = r.get('selection') or {}
    if sel.get('mode') not in ('all', 'top_n_per_group', 'top_n_total') or (sel.get('mode') != 'all' and not (isinstance(sel.get('n'), int) and sel['n'] >= 1)): e.append('선택')
    bl = r.get('achievement_blend') or {}
    if bl.get('mode') not in ('none', 'weighted', 'max') or (bl.get('mode') == 'weighted' and not (nonneg(bl.get('rank_ratio')) and bl['rank_ratio'] <= 1)): e.append('성취도 비율')
    if (bl.get('mode') != 'none' or r.get('no_rank_subject_policy') == 'achievement_convert') and not valid_points(r.get('achievement_points')): e.append('성취도 점수표')
    if r.get('no_rank_subject_policy') not in ('exclude', 'achievement_convert', 'bonus') or r.get('joint_curriculum_policy') not in ('include', 'exclude'): e.append('미산출·공동')
    b = r.get('bonus')
    if r.get('no_rank_subject_policy') == 'bonus' and (not b or not nonneg(b.get('max')) or not all(nonneg(v) for v in (b.get('points') or {}).values())): e.append('가산점')
    a = r.get('attendance_rule')
    gm, mx, base = r.get('grade_max_score'), r.get('max_score'), r.get('base_score', 0)
    if not (isinstance(mx, (int, float)) and mx > 0 and isinstance(gm, (int, float)) and gm > 0 and nonneg(base) and base <= gm
            and abs(gm + (a.get('max_score', 0) if a else 0) - mx) <= 1e-8): e.append('만점')
    ro = r.get('rounding') or {}
    if not (isinstance(ro.get('digits'), int) and 0 <= ro['digits'] <= 6 and ro.get('mode') in ('round', 'floor', 'ceil')): e.append('반올림')
    yw = r.get('year_weights')
    if yw is not None and (not yw or any(not nonneg(v) for v in yw.values()) or abs(sum(yw.values()) - 1) > 1e-8 or any(x[0] not in yw for x in s)): e.append('학년 가중치')
    if a:
        t = a.get('deduction_table') or []
        if (not a.get('years') or len(set(a['years'])) != len(a['years']) or any(y not in (1, 2, 3) for y in a['years'])
                or not (isinstance(a.get('tardy_to_absence'), int) and a['tardy_to_absence'] >= 1) or not nonneg(a.get('max_score'))
                or not t or any(not (isinstance(d.get('absence_max'), int) and d['absence_max'] >= 0) or not nonneg(d.get('points')) or d['points'] > a['max_score']
                                or (i and (d['absence_max'] <= t[i - 1]['absence_max'] or d['points'] < t[i - 1]['points'])) for i, d in enumerate(t))): e.append('출결 구간')
    return e


def main():
    inputs = {i['entry']: i for i in json.load(open(os.path.join(W, 'inputs.json'), encoding='utf-8'))}
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    drafts, report = [], []
    for f in sorted(glob.glob(os.path.join(W, 'drafts', '*.json'))):
        try:
            d = json.load(open(f, encoding='utf-8'))
        except Exception as ex:
            report.append(('?', os.path.basename(f), '파일 오류', str(ex)[:80])); continue
        inp = inputs.get(d.get('entry'))
        if not inp:
            report.append(('?', os.path.basename(f), '항목 없음', '')); continue
        text = squash(open(os.path.join(ROOT, inp['text']), encoding='utf-8').read())
        files = {x['path']: x['source'] for x in inp['files']}
        names = {p['name'] for p in inp['programs']}
        for p in d.get('programs', []):
            name, st = p.get('program', ''), p.get('status', '')
            bad_quotes = [ev for ev in p.get('evidence', []) if not ev.get('from_image') and squash(ev.get('quote')) not in text]
            rule = dict(p.get('rule') or {})
            issues = []
            if name not in names: issues.append('전형명 불일치')
            if bad_quotes: issues.append(f'원문에 없는 인용 {len(bad_quotes)}개')
            if st == 'complete' and p.get('fits_engine'):
                rule.setdefault('achievement_blend', {'mode': 'none'}); rule.setdefault('joint_curriculum_policy', 'include')
                rule.setdefault('base_score', 0); rule.setdefault('rounding', {'digits': 2, 'mode': 'round'})
                issues += validate(rule)
            pages = sorted({ev.get('page') for ev in p.get('evidence', []) if isinstance(ev.get('page'), int)})
            ev_file = next((ev.get('file') for ev in p.get('evidence', []) if ev.get('file') in files), None) or (inp['files'][0]['path'] if inp['files'] else None)
            source = files.get(ev_file, '') if ev_file else ''
            importable = st == 'complete' and p.get('fits_engine') and not issues and source.startswith('https://')
            report.append((inp['university'], name, st + ('' if p.get('fits_engine', True) else ' · 엔진 밖'), '; '.join(issues + (p.get('missing') or [])[:3] + ([p['note']] if p.get('note') else []))[:300]))
            if not importable: continue
            rid = str(uuid.uuid5(NS, f"{inp['entry']}|{name}|2028"))  # 같은 대학명 캠퍼스 항목이 둘일 수 있어 항목 id로
            quotes = ' / '.join(f"p.{ev.get('page')} \"{ev.get('quote', '')[:60]}\"" for ev in p.get('evidence', [])[:4])
            drafts.append({
                'id': rid, 'source_page': f"{('[' + inp['campus'] + '] ') if inp.get('campus') else ''}2028 시행계획 {('p.' + ','.join(map(str, pages))) if pages else ''} · {quotes}"[:500],
                'rule': {**rule, 'id': rid, 'source': source, 'review_status': 'draft', 'admission_year': 2028,
                         'university': inp['university'], 'program': name, 'version': 1},
                'tests': [], 'status': '작성 중', 'author': 'AI 초안', 'reviewer': None, 'reject_reason': '',
                'history': [{'at': now, 'who': 'AI 초안', 'action': '2028 시행계획 원문에서 초안을 만들었어요(검수 전)'}],
                'updated_at': now, 'ai_draft': True,
            })
    json.dump({'format': 'jinhak-navi-rule-drafts', 'version': 1, 'drafts': drafts}, open(os.path.join(OUT, 'rule-drafts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    counts = {}
    for r in report: counts[r[2]] = counts.get(r[2], 0) + 1
    lines = ['# 2028 수시 교과전형 환산 규칙 초안 — 검수 목록', '',
             f'가져오기 가능(규칙 기록 합치기) {len(drafts)}개 · 전체 {len(report)}개 · 상태별 ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())), '',
             '모든 초안은 검수 전이에요(NEVER-1). 규칙 관리 화면에서 원문과 대조하고 테스트 3개를 만든 뒤, 작성자가 아닌 관리자가 승인해야 계산에 쓰여요.', '',
             '| 대학 | 전형 | 상태 | 비고(문제·빈 칸·메모) |', '|---|---|---|---|']
    lines += [f'| {u} | {p} | {s} | {n.replace("|", "/")} |' for u, p, s, n in sorted(report)]
    open(os.path.join(OUT, 'report.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('importable', len(drafts), 'total', len(report), counts)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
