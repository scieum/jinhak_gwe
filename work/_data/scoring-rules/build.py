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
                or (not t and ((r.get('advanced') or {}).get('attendance') or {}).get('per_day') is None and not ((r.get('advanced') or {}).get('attendance') or {}).get('per_kind')) or any(not (isinstance(d.get('absence_max'), int) and d['absence_max'] >= 0) or not nonneg(d.get('points')) or (d['points'] > a['max_score'] and not ((r.get('advanced') or {}).get('attendance') or {}).get('from_total'))
                                or (i and (d['absence_max'] <= t[i - 1]['absence_max'] or d['points'] < t[i - 1]['points'])) for i, d in enumerate(t))): e.append('출결 구간')
    if r.get('advanced'):
        e += validate_advanced(r)
    return e


TYPES = {'공통', '일반선택', '진로선택', '융합선택', '체육예술', '과탐실험', '교양'}


def is_int(n, low=0):
    return isinstance(n, int) and not isinstance(n, bool) and n >= low


def weights_ok(w):
    return isinstance(w, dict) and w and all(nonneg(v) for v in w.values()) and abs(sum(w.values()) - 1) <= 1e-8


def buckets_ok(b):
    return isinstance(b, list) and b and all(x.get('groups') and all(g in GROUPS for g in x['groups']) and (x.get('n') is None or is_int(x['n'], 1))
                                            and all(y in (1, 2, 3) for y in x.get('years') or [])
                                            and (not x.get('fill') or (x.get('n') is not None and is_int(x['fill'].get('grade'), 1) and x['fill']['grade'] <= 5 and isinstance(x['fill'].get('credits'), (int, float)) and x['fill']['credits'] > 0)) for x in b)


def validate_advanced(r):
    """scoring.ts validateAdvanced 이식(앱 검사가 최종: tests/scoring-rule-drafts.test.ts)."""
    v, e = r['advanced'], []
    def keys_ok(w, groups, buckets):
        return all(k in groups or any(b.get('name') == k for b in buckets or []) for k in w)
    for t in v.get('tracks') or []:
        groups = t.get('subject_groups') or r.get('subject_groups') or []
        if not t.get('name') or not t.get('units') or any(g not in GROUPS for g in groups) or (t.get('buckets') is not None and not buckets_ok(t['buckets'])) \
                or (t.get('group_weights') and (not weights_ok(t['group_weights']) or not keys_ok(t['group_weights'], groups, t.get('buckets') or v.get('buckets')))) \
                or (t.get('top_groups') is not None and not is_int(t['top_groups'], 1)) \
                or (t.get('rank_grade_points') is not None and (not valid_points(t['rank_grade_points']) or any(k not in t['rank_grade_points'] for k in '12345'))) \
                or (t.get('achievement_points') is not None and not valid_points(t['achievement_points'])) \
                or (t.get('best_of') is not None and (not t['best_of'] or any(n == t.get('name') or not any(o.get('name') == n and not o.get('best_of') for o in v['tracks']) for n in t['best_of']))):
            e.append('계열'); break
    if 'tracks' in v and not v['tracks']: e.append('계열')
    if v.get('buckets') is not None and not buckets_ok(v['buckets']): e.append('묶음')
    ab = v.get('achievement_bonus')
    if ab is not None and (not valid_points(ab.get('points')) or not nonneg(ab.get('max'))): e.append('성취도 가산')
    if v.get('group_alias') is not None and any(not a or not b or a == b for a, b in v['group_alias'].items()): e.append('교과 바꿔 읽기')
    if v.get('subject_weights') is not None and (not v['subject_weights'] or any(not (isinstance(x, (int, float)) and x > 0) for x in v['subject_weights'].values())): e.append('교과 배율')
    mr = v.get('mean_rounding')
    if mr is not None and (not is_int(mr.get('digits')) or mr['digits'] > 6 or mr.get('mode') not in ('round', 'floor', 'ceil')): e.append('평균 자르기')
    if v.get('top_groups') is not None and not is_int(v['top_groups'], 1): e.append('상위 교과')
    if v.get('group_weights') is not None and (not weights_ok(v['group_weights']) or not keys_ok(v['group_weights'], r.get('subject_groups') or [], v.get('buckets'))): e.append('교과 비율')
    for x in v.get('type_rules') or []:
        if not x.get('types') or any(s not in TYPES for s in x['types']) or x.get('use') not in ('rank', 'achievement', 'max', 'exclude') or (x.get('limit') is not None and not is_int(x['limit'], 1)) \
                or (x.get('beyond') is not None and (x['beyond'] not in ('drop', 'rank') or x.get('limit') is None)):
            e.append('유형 규칙'); break
    if any(x.get('use') in ('achievement', 'max') for x in v.get('type_rules') or []) and not valid_points(r.get('achievement_points')): e.append('성취도 점수표')
    at = v.get('average_table')
    if at is not None:
        st = at.get('steps') or []
        if not is_int(at.get('digits')) or at['digits'] > 6 or at.get('mode') not in ('round', 'floor', 'ceil') or not st \
                or any(not isinstance(s.get('upto'), (int, float)) or not nonneg(s.get('score')) or (i and s['upto'] <= st[i - 1]['upto']) for i, s in enumerate(st)):
            e.append('평균등급 표')
    c = v.get('credits')
    if c is not None:
        if any(not nonneg(x.get('min')) or not (isinstance(x.get('factor'), (int, float)) and x['factor'] > 0) for x in c.get('tiers') or []) \
                or (c.get('shortfall') and not (nonneg(c['shortfall'].get('below')) and isinstance(c['shortfall'].get('base'), (int, float)) and c['shortfall']['base'] > 0 and nonneg(c['shortfall'].get('per_credit')))) \
                or (c.get('per_credit_bonus') is not None and not nonneg(c['per_credit_bonus'])) \
                or (c.get('bonus_at') and not (nonneg(c['bonus_at'].get('min')) and nonneg(c['bonus_at'].get('points')))) \
                or (c.get('cap') is not None and not (isinstance(c['cap'], (int, float)) and c['cap'] > 0)) \
                or any(not nonneg(x.get('min')) or not nonneg(x.get('points')) for x in c.get('bonus_tiers') or []) \
                or c.get('count', 'scope') not in ('scope', 'ranked', 'chosen') or c.get('apply_to', 'grade') not in ('grade', 'total') \
                or (c.get('minimum') is not None and not nonneg(c['minimum'])):
            e.append('이수학점')
    a = v.get('attendance')
    if a is not None:
        pb, pk = a.get('perfect_bonus'), a.get('per_kind')
        if pk is not None and (not all(nonneg(pk.get(k)) for k in ('absence', 'tardy', 'early_leave', 'class_absence')) or (pk.get('free_absences') is not None and not is_int(pk['free_absences']))): e.append('출결 종류별')
        if not r.get('attendance_rule') or (a.get('per_day') is not None and not nonneg(a['per_day'])) \
                or (pb and (not pb.get('years') or any(y not in (1, 2, 3) for y in pb['years']) or not nonneg(pb.get('points')) or (pb.get('cap') is not None and not nonneg(pb['cap'])))):
            e.append('출결 추가')
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
                if rule.get('attendance_rule'): rule['attendance_rule'].setdefault('deduction_table', [])  # 1일당 감점(per_day)이면 표를 비워 둬요
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
