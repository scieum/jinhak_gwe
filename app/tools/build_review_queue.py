"""수집본 → 관리자 검수 대기 파일(work/_data/review-queue/). 공개 파일은 만들지 않는다.

공개 파일(app/public/data/*.json)은 관리자 2명이 앱 검수 도구에서 승인한 뒤 "공개 파일 내보내기"로만 만든다.
여기서 만드는 것은 모두 검수 전 초안이다: 승인·검수자·검수일 칸은 비우고, 이용 조건은 '미확인'으로 둔다.

  python app/tools/build_review_queue.py            # 산출물 다시 만들기
  python app/tools/build_review_queue.py --self-test # 규칙·파서 자체 검사만

산출물
  results/<대학>.csv, results/index.csv   입결 검수 대기(AdminReview 'CSV 불러오기' 형식, 20열)
  fields-draft.csv                         계열표 초안(AdminFields 'CSV 불러오기', 5열 + 추천 근거)
  univ-map-draft.json                      대학 위치 초안(univ-map 형식, 검수자 칸 비움)
  special-tracks-draft.json                계열 묶음 매핑 초안(special-tracks 형식, 승인 비움)
  minimum-draft.json                       수능 최저 문장 → 구조화 기준 초안 + 못 읽은 문장
  summary.json                             위 산출물의 행 수·비율(README 보고용)
"""
from __future__ import annotations

import csv
import glob
import gzip
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'work' / '_data'
OUT = DATA / 'review-queue'
RESULTS_GZ = DATA / 'admission-results' / '_all.csv.gz'
DIRECTORY = DATA / 'university-directory' / 'directory.json'
PLAN_CAMPUSES = DATA / 'university-directory' / 'plan-campus-labels.csv'
STRUCTURED = DATA / 'admission-plans' / 'structured' / 'universities'
PUBLIC_PLANS = ROOT / 'app' / 'public' / 'data' / 'admission-plans.json'
RELEASED = ROOT / 'app' / 'public' / 'data' / 'released-results.json'

# app/src/domain/resultReview.ts RESULT_COLUMNS 와 같은 순서여야 AdminReview가 읽는다
RESULT_COLUMNS = ['university', 'result_year', 'round', 'admission_type', 'program', 'recruit_unit', 'quota', 'applicants', 'competition_rate',
                  'fill_count', 'fill_rate', 'cut_50', 'cut_70', 'cut_other', 'metric', 'basis', 'grade_system', 'source_url', 'source_page', 'note']


def write_csv(path: Path, header: list[str], rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def safe_name(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|\s]+', '_', name).strip('_') or 'unknown'


# ── 1. 입결 검수 대기 ─────────────────────────────────────────────

def build_results(rows: list[dict]) -> dict:
    """대학(수집 표기) 하나 = CSV 하나. 검수 단위(대학·학년도·원문 주소)는 앱이 CSV 안에서 묶는다."""
    by_univ: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_univ[r['university']].append(r)
    out_dir = OUT / 'results'
    for old in out_dir.glob('*.csv'):
        old.unlink()
    index, used = [], set()
    for univ in sorted(by_univ):
        name = safe_name(univ)
        assert name not in used, f'파일 이름이 겹쳐요: {name}'
        used.add(name)
        rs = by_univ[univ]
        write_csv(out_dir / f'{name}.csv', RESULT_COLUMNS, [[r[c] for c in RESULT_COLUMNS] for r in rs])
        units = {(r['result_year'], r['source_url']) for r in rs}
        not_https = sorted({u for y, u in units if not u.startswith('https://')})
        # 이용 조건: 수집 메타(README·_sources·보고서)에 대학별 이용 허락 기록이 없어 모두 '미확인'. 검수자가 원문 사이트 약관을 보고 정한다.
        index.append([univ, f'{name}.csv', str(len(rs)), str(len(units)), ';'.join(sorted({y for y, _ in units})),
                      str(len(not_https)), 'unknown', ';'.join(not_https)])
    write_csv(out_dir / 'index.csv', ['university', 'file', 'rows', 'review_units', 'years', 'non_https_units', 'license', 'non_https_urls'], index)
    return {'files': len(index), 'rows': len(rows), 'review_units': sum(int(i[3]) for i in index),
            'non_https_units': sum(int(i[5]) for i in index), 'empty_source_url': sum(1 for r in rows if not r['source_url'].strip()),
            'license_unknown_units': sum(int(i[3]) for i in index)}


# ── 2. 계열표 초안 ────────────────────────────────────────────────
# 규칙 표: (학과명 정규식, 소계열, 중계열, 대계열). 위에서부터 먼저 맞는 규칙을 쓴다(구체적인 규칙을 위에).
# 대계열은 dept-tier spec D3의 인문|자연만. 예체능처럼 둘로 나눌 수 없으면 비운다.
FIELD_RULES: list[tuple[str, str, str, str]] = [
    # 의약·보건
    (r'치의예|치의학', '치의학', '의약', '자연'),
    (r'한의예|한의학', '한의학', '의약', '자연'),
    (r'수의예|수의학', '수의학', '의약', '자연'),
    (r'(?<![한치수])의예|(?<![한치수생])의학과|의학부$', '의학', '의약', '자연'),
    (r'약학|약과학|제약', '약학', '의약', '자연'),
    (r'간호', '간호', '보건', '자연'),
    (r'물리치료', '물리치료', '보건', '자연'),
    (r'작업치료', '작업치료', '보건', '자연'),
    (r'임상병리', '임상병리', '보건', '자연'),
    (r'방사선', '방사선', '보건', '자연'),
    (r'치위생', '치위생', '보건', '자연'),
    (r'치기공', '치기공', '보건', '자연'),
    (r'응급구조', '응급구조', '보건', '자연'),
    (r'안경광학', '안경광학', '보건', '자연'),
    (r'언어치료|언어재활', '언어치료', '보건', '자연'),
    (r'보건행정|보건관리|의료경영', '보건행정', '보건', '인문'),
    (r'식품영양', '식품영양', '생활과학', '자연'),
    # 교육(사범) — 과목 교육은 과목 계열을 따라 대계열을 정한다
    (r'초등교육', '초등교육', '교육', '인문'),
    (r'유아교육', '유아교육', '교육', '인문'),
    (r'특수교육', '특수교육', '교육', '인문'),
    (r'체육교육', '체육교육', '교육', ''),
    (r'(음악|미술)교육', '예술교육', '교육', ''),
    (r'(수학|물리|화학|생물|지구과학|과학|기술|컴퓨터|정보|가정)교육', '자연계 교과교육', '교육', '자연'),
    (r'(국어|영어|독어|불어|일어|중국어|한문|역사|지리|사회|윤리|일반사회|교육학|외국어)교육|교육학', '인문계 교과교육', '교육', '인문'),
    # 체육·예술
    (r'스포츠과학|스포츠의학|운동처방|운동재활', '스포츠과학', '체육', ''),
    (r'체육|스포츠|태권도|무도|레저', '체육', '체육', ''),
    (r'실용음악', '실용음악', '예술', ''),
    (r'음악|성악|작곡|피아노|관현악|국악|기악', '음악', '예술', ''),
    (r'무용|댄스', '무용', '예술', ''),
    (r'연극|영화|연기|뮤지컬|공연', '연극영화', '예술', ''),
    (r'디자인', '디자인', '예술', ''),
    (r'미술|회화|조소|서양화|동양화|한국화|조형|공예', '미술', '예술', ''),
    # 공학
    (r'반도체', '반도체', '공학', '자연'),
    (r'인공지능|AI|데이터사이언스|빅데이터', '인공지능·데이터', '공학', '자연'),
    (r'컴퓨터|소프트웨어|정보보호|정보보안|사이버보안', '컴퓨터·소프트웨어', '공학', '자연'),
    (r'전자|전기|정보통신|통신', '전기·전자', '공학', '자연'),
    (r'기계|자동차|모빌리티|로봇|메카트로닉스|항공우주', '기계', '공학', '자연'),
    (r'화학공학|화공|생명공학|바이오공학', '화학·생명공학', '공학', '자연'),
    (r'신소재|재료|금속|고분자|나노', '재료', '공학', '자연'),
    (r'건축', '건축', '공학', '자연'),
    (r'토목|건설|도시공학|환경공학', '토목·환경', '공학', '자연'),
    (r'산업공학|산업경영공학|산업시스템', '산업공학', '공학', '자연'),
    (r'조선|해양공학', '조선·해양', '공학', '자연'),
    (r'에너지|원자력', '에너지', '공학', '자연'),
    (r'소방|안전공학', '소방·안전', '공학', '자연'),
    # 자연과학
    (r'수학|통계', '수학·통계', '자연과학', '자연'),
    (r'물리', '물리', '자연과학', '자연'),
    (r'(?<!문)화학', '화학', '자연과학', '자연'),  # '문화학'(글로컬문화학부) 오인 방지
    (r'생명과학|생물|분자생명|의생명', '생명과학', '자연과학', '자연'),
    (r'지구|천문|대기|해양과학', '지구과학', '자연과학', '자연'),
    (r'원예|농|산림|축산|동물자원|식물|조경', '농림', '농림·수산', '자연'),
    (r'식품', '식품', '생활과학', '자연'),
    # 경상·사회
    (r'회계|세무', '회계·세무', '경상', '인문'),
    (r'경영|마케팅|창업', '경영', '경상', '인문'),
    (r'경제|무역|통상|금융|국제물류', '경제·무역', '경상', '인문'),
    (r'관광|호텔|외식', '관광', '경상', '인문'),
    (r'경찰|행정|정책', '행정·정책', '사회과학', '인문'),
    (r'법학|법률', '법학', '사회과학', '인문'),
    (r'정치|외교', '정치외교', '사회과학', '인문'),
    (r'사회복지', '사회복지', '사회과학', '인문'),
    (r'심리|상담', '심리', '사회과학', '인문'),
    (r'미디어|언론|신문방송|광고|홍보|커뮤니케이션', '미디어', '사회과학', '인문'),
    (r'문헌정보', '문헌정보', '사회과학', '인문'),
    (r'사회학|사회과학', '사회학', '사회과학', '인문'),
    (r'아동|가족|소비자|의류', '생활과학', '생활과학', '인문'),
    # 인문·어문
    (r'국어국문|한국어|국문', '국어국문', '어문', '인문'),
    (r'영어|영문', '영어영문', '어문', '인문'),
    (r'중어|중국', '중국어문', '어문', '인문'),
    (r'일어|일본', '일본어문', '어문', '인문'),
    (r'독어|독일', '독일어문', '어문', '인문'),
    (r'불어|프랑스', '프랑스어문', '어문', '인문'),
    (r'스페인|러시아|노어|아랍|베트남|외국어', '그 밖의 어문', '어문', '인문'),
    (r'사학|역사|고고', '역사', '인문', '인문'),
    (r'철학|윤리', '철학', '인문', '인문'),
    (r'신학|기독교|불교|종교', '신학·종교', '인문', '인문'),
    (r'문화콘텐츠|인문', '인문', '인문', '인문'),
]
FIELD_RES = [(re.compile(p), s, m, j) for p, s, m, j in FIELD_RULES]
# 계열 하나로 정할 수 없는 이름은 추천하지 않는다(근거 열에 이유만)
NO_FIELD = [(re.compile(r'자유전공|자율전공|무전공|전공자율|자율\(|광역'), '자유전공·무전공 — 계열 하나로 정하지 않음'),
            (re.compile(r'[/|]|계열$|대학$'), '여러 학과·단과대학 묶음 — 계열 하나로 정하지 않음'),
            (re.compile(r'^[㈜(]|\(주\)|주식회사'), '기업 이름(계약학과 추정) — 원문 확인 필요')]


def suggest_field(unit: str) -> tuple[str, str, str, str]:
    """(소계열, 중계열, 대계열, 근거). 확실하지 않으면 계열 칸을 비우고 근거에 이유를 적는다."""
    for rx, why in NO_FIELD:
        if rx.search(unit):
            return '', '', '', why
    hits = [(rx.search(unit), s, m, j, rx.pattern) for rx, s, m, j in FIELD_RES]
    hits = [h for h in hits if h[0]]
    if not hits:
        return '', '', '', '맞는 규칙 없음'
    first = hits[0]
    a, b = first[0].span()
    # 첫 규칙과 겹치지 않는 자리에서 다른 중계열 규칙이 맞으면(예: 경영·컴퓨터) 하나로 정하지 않는다
    other = [h for h in hits[1:] if h[2] != first[2] and (h[0].end() <= a or h[0].start() >= b)]
    if other:
        return '', '', '', f'규칙 충돌: {first[0].group(0)}→{first[2]} / {other[0][0].group(0)}→{other[0][2]}'
    return first[1], first[2], first[3], f'학과명 키워드 "{first[0].group(0)}" → {first[1]}·{first[2]}' + (f'·{first[3]}' if first[3] else '')


def field_units(rows: list[dict]) -> list[tuple[str, str]]:
    """AdminFields '공개 입결에서 빠진 학과 추가'와 같은 범위: 수시 교과·종합, 모집단위 있음. 공개 입결이 있으면 그것도."""
    keys = {(r['university'], r['recruit_unit'].strip()) for r in rows
            if r['round'] == '수시' and r['admission_type'] in ('교과', '종합') and r['recruit_unit'].strip()}
    if RELEASED.exists():
        rel = json.loads(RELEASED.read_text(encoding='utf-8'))
        for u in rel.get('units', []):
            for r in u.get('rows', []):
                if r.get('round') == '수시' and r.get('admission_type') in ('교과', '종합') and str(r.get('recruit_unit', '')).strip():
                    keys.add((u['university'], r['recruit_unit'].strip()))
    junk = re.compile(r'^(합계|소계|계|전체|총계|평균)$')
    return sorted(k for k in keys if not junk.match(k[1]))


def build_fields(rows: list[dict]) -> tuple[list[dict], dict]:
    out = []
    for univ, unit in field_units(rows):
        small, mid, major, why = suggest_field(unit)
        out.append({'university': univ, 'unit': unit, 'small': small, 'mid': mid, 'major': major, 'basis': why})
    write_csv(OUT / 'fields-draft.csv', ['대학', '모집단위', '소계열', '중계열', '대계열', '추천근거'],
              [[r['university'], r['unit'], r['small'], r['mid'], r['major'], r['basis']] for r in out])
    filled = sum(1 for r in out if r['small'])
    return out, {'rows': len(out), 'filled': filled, 'filled_ratio': round(filled / len(out), 3) if out else 0,
                 'major_filled': sum(1 for r in out if r['major']),
                 'blank_reasons': dict(Counter(r['basis'].split(':')[0].split(' —')[0] for r in out if not r['small']).most_common())}


# ── 3. 대학 위치 초안 ─────────────────────────────────────────────
SIDO = {'서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시', '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시', '울산': '울산광역시',
        '세종': '세종특별자치시', '경기': '경기도', '강원': '강원특별자치도', '충북': '충청북도', '충남': '충청남도', '전북': '전북특별자치도', '전남': '전라남도',
        '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도'}
EDU_UNIVS = {'경인교육대학교', '공주교육대학교', '광주교육대학교', '대구교육대학교', '부산교육대학교', '서울교육대학교', '전주교육대학교', '진주교육대학교', '청주교육대학교', '춘천교육대학교'}
SPECIAL_LAW = {'한국과학기술원(KAIST)', '광주과학기술원(GIST)', '대구경북과학기술원(DGIST)', '울산과학기술원(UNIST)', '한국에너지공과대학교'}
OUT_OF_SCOPE = re.compile(r'사관학교|경찰대학|사이버|방송통신|폴리텍|대학원대학')  # univ-map D16 1차 범위 밖


def build_univ_map(directory: dict) -> dict:
    ids = {u['university']: u['id'] for u in directory['universities']}
    campuses, skipped = [], []
    with PLAN_CAMPUSES.open(encoding='utf-8-sig') as f:
        plan_rows = list(csv.DictReader(f))
    for r in plan_rows:
        name, campus = r['university'], r['source_campus']
        if OUT_OF_SCOPE.search(name):
            skipped.append(name)
            continue
        kind = '교육대학' if name in EDU_UNIVS else '특별법 대학' if name in SPECIAL_LAW else ''
        campuses.append({
            'univ_id': ids.get(name, ''), 'name': name, 'campus': campus,
            'campus_type': '본교' if campus == '본교' else '분교' if campus == '분교' else '',  # 제2캠퍼스 등은 본교·분교 법적 지위를 확인해야 해서 비움
            'school_kind': kind, 'founding': '', 'sido': SIDO.get(r['source_region'], ''), 'sigungu': '', 'address': '', 'lat': None, 'lng': None,
            'review_status': 'draft', 'reviewer_1': '', 'reviewer_2': '', 'reviewed_at': '',
            'draft_basis': f"2028 전형계획 {r['plan_id']} · 지역 표기 '{r['source_region']}'" + ('' if r['source_region'] in SIDO else ' (시·도 하나로 정할 수 없어 비움)'),
        })
    planned = {r['university'] for r in plan_rows}
    for u in directory['universities']:
        name = u['university']
        if name in planned:
            continue
        if OUT_OF_SCOPE.search(name):
            skipped.append(name)
            continue
        campuses.append({'univ_id': u['id'], 'name': name, 'campus': '', 'campus_type': '',
                         'school_kind': '교육대학' if name in EDU_UNIVS else '특별법 대학' if name in SPECIAL_LAW else '', 'founding': '',
                         'sido': '', 'sigungu': '', 'address': '', 'lat': None, 'lng': None,
                         'review_status': 'draft', 'reviewer_1': '', 'reviewer_2': '', 'reviewed_at': '',
                         'draft_basis': '입결만 있는 대학(대학 기준 목록) · 캠퍼스·지역 자료 없음'})
    file = {'format': 'jinhak-navi-univ-map', 'version': 1, 'review_status': 'draft', 'base_date': '', 'list_source': '',
            'list_as_of': '', 'reviewed_at': '',
            'draft_note': '검수 전 초안. 목록은 2028 전형계획(어디가) 대학·캠퍼스 항목 + 입결만 있는 대학(대학 기준 목록)에서 만들었고 KEDI 주소록 대조 전이에요. 주소·좌표·설립·시군은 자료가 없어 비웠어요.',
            'campuses': campuses}
    write_json(OUT / 'univ-map-draft.json', file)
    n = len(campuses)
    return {'campuses': n, 'skipped_out_of_scope': sorted(set(skipped)), 'with_sido': sum(1 for c in campuses if c['sido']),
            'with_school_kind': sum(1 for c in campuses if c['school_kind']), 'with_campus_type': sum(1 for c in campuses if c['campus_type']),
            'with_address': sum(1 for c in campuses if c['address']), 'with_coordinates': sum(1 for c in campuses if c['lat'] is not None),
            'with_univ_id': sum(1 for c in campuses if c['univ_id'])}


# ── 4. 계열 묶음 매핑 초안 ────────────────────────────────────────
KIST6 = {'한국과학기술원(KAIST)': True, '광주과학기술원(GIST)': True, '대구경북과학기술원(DGIST)': True, '울산과학기술원(UNIST)': True,
         '한국에너지공과대학교': True, '포항공과대학교': False}  # 값 = '특수법 설립' 태그(POSTECH 제외, spec D4)
# (정규식, 묶음, 세부, 태그). 한 모집단위가 여러 묶음에 들 수 있다(spec D9).
TRACK_RULES: list[tuple[str, str, str | None, str | None]] = [
    (r'(?<![한치수])의예|(?<![한치수생])의학과', '메디컬', '의예', None),
    (r'치의예|치의학', '메디컬', '치의예', None),
    (r'한의예|한의학', '메디컬', '한의예', None),
    (r'^약학|약학(과|부)', '메디컬', '약학', None),
    (r'수의예|수의학', '메디컬', '수의예', None),
    (r'간호', '보건', '간호', None),
    (r'물리치료', '보건', '물리치료', None),
    (r'작업치료', '보건', '작업치료', None),
    (r'임상병리', '보건', '임상병리', None),
    (r'방사선', '보건', '방사선', None),
    (r'치위생', '보건', '치위생', None),
    (r'응급구조|치기공|안경광학|언어치료|언어재활|보건', '보건', '그 밖의 보건', None),
    (r'초등교육', '교육', '교대(초등교육)', '초등교원 양성'),
    (r'교육(과|학과|전공|학부)?(\(|$)|교육학', '교육', '사범대', None),
    (r'체육교육', '체육', '체육교육', None),
    (r'스포츠과학|스포츠의학|운동처방', '체육', '스포츠과학', None),
    (r'체육|스포츠|태권도|무도|레저', '체육', '그 밖의 체육', None),
    (r'미술|회화|조소|서양화|동양화|한국화|조형|공예', '예체능 실기', '미술', None),
    (r'디자인', '예체능 실기', '디자인', None),
    (r'음악|성악|작곡|피아노|관현악|국악|기악', '예체능 실기', '음악', None),
    (r'연극|영화|연기|뮤지컬', '예체능 실기', '연극영화', None),
    (r'무용|댄스', '예체능 실기', '무용', None),
    (r'군사|국방', '계약학과', '군', '의무 복무 조건'),
    (r'반도체.*(삼성|SK|하이닉스|LG|계약)|(삼성|SK|하이닉스|LG|계약).*반도체', '계약학과', '반도체', '채용 조건형'),
    (r'계약|^㈜|\(주\)', '계약학과', '그 밖의 채용 조건형', '채용 조건형'),
    (r'자유전공|자율전공|무전공|전공자율', '자유전공', None, None),
]
TRACK_RES = [(re.compile(p), t, s, g) for p, t, s, g in TRACK_RULES]


def track_matches(university: str, unit: str) -> list[dict]:
    out, seen = [], set()
    if university in KIST6:
        out.append({'track': '과기원', 'sub': None, 'tag': '특수법 설립' if KIST6[university] else None, 'evidence': '대학 기준(spec D4 과기원 6곳)'})
        seen.add('과기원')
    if university in EDU_UNIVS:
        out.append({'track': '교육', 'sub': '교대(초등교육)', 'tag': '초등교원 양성', 'evidence': '대학 기준(교육대학교)'})
        seen.add('교육')
    for rx, track, sub, tag in TRACK_RES:
        m = rx.search(unit)
        if not m or track in seen:
            continue
        if track == '교육' and sub == '사범대' and re.search(r'평생교육|교육공학|기술교육대', unit):
            continue
        seen.add(track)
        why = f'모집단위 이름 기준("{m.group(0)}")' + (' · 전형계획 원문에서 채용·복무 조건 확인 필요' if track == '계약학과' else '')
        out.append({'track': track, 'sub': sub, 'tag': tag, 'evidence': why})
    return out


PLAN_TYPE = {'학생부교과': '교과', '교과': '교과', '학생부위주(교과)': '교과', '학생부종합': '종합', '종합': '종합', '학생부위주(종합)': '종합',
             '논술': '논술', '실기': '실기', '실기/실적': '실기', '실적': '실기'}


def plan_lines(directory: dict) -> dict[tuple[str, str], list[dict]]:
    """2028 전형계획(구조화 초안)의 수시 모집단위 × 전형 → PlanLine. 키 = (대학 정식명, 모집단위)."""
    lines: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for f in sorted(glob.glob(str(STRUCTURED / '*.json'))):
        d = json.loads(Path(f).read_text(encoding='utf-8'))
        progs = {p['id']: p for p in d.get('programs', [])}
        units = {u['id']: u['name'] for u in d.get('recruit_units', [])}
        for a in d.get('allocations', []):
            p, unit = progs.get(a.get('program_id')), units.get(a.get('unit_id'))
            if not p or not unit or p.get('round') != '수시' or p.get('out_of_quota') or not isinstance(a.get('quota'), int):
                continue
            t = PLAN_TYPE.get(p.get('type') or '')
            if not t:
                continue
            line = {'name': p['name'], 'type': t, 'quota': a['quota'], 'minimum': None}  # 최저 유무는 검수 전이라 null(원문 확인)
            if t != '실기' and '실기' in (p.get('type') or ''):
                line['practical'] = True
            lines[(d['university'], unit.strip())].append(line)
    return lines


def build_tracks(fields: list[dict], directory: dict, results: list[dict]) -> dict:
    canon = {}
    for u in directory['universities']:
        canon[u['university']] = u['university']
        for e in u.get('result_entries', []):
            canon[e['source_label']] = u['university']
    plans = plan_lines(directory)
    units = [{'university': f['university'], 'unit': f['unit']} for f in fields]
    # 과기원은 대학 기준이라 교과·종합이 아닌(기타) 수시 모집단위도 넣는다(KAIST·GIST·UNIST 입결은 전형 유형 '기타')
    have = {(u['university'], u['unit']) for u in units}
    for k in sorted({(r['university'], r['recruit_unit'].strip()) for r in results
                     if r['round'] == '수시' and r['recruit_unit'].strip() and canon.get(r['university'], r['university']) in KIST6} - have):
        units.append({'university': k[0], 'unit': k[1]})
    rows = []
    for f in units:
        for m in track_matches(canon.get(f['university'], f['university']), f['unit']):
            row = {'university': f['university'], 'unit': f['unit'], 'track': m['track']}
            if m['sub']:
                row['sub'] = m['sub']
            if m['tag']:
                row['tag'] = m['tag']
            row.update({'evidence': m['evidence'], 'approvals': [], 'reviewed_at': '',
                        'plan': plans.get((canon.get(f['university'], f['university']), f['unit']), [])})
            rows.append(row)
    file = {'format': 'jinhak-navi-special-tracks', 'version': 1, 'review_status': 'draft', 'base_date': '',
            'draft_note': '검수 전 초안. 계열표 초안의 모집단위(수집 입결 수시 교과·종합)에 학과명·대학 규칙을 적용했어요. plan은 2028 구조화 전형계획 초안에서 대학·모집단위 이름이 똑같을 때만 붙였어요.',
            'mapping': {'reviewed_at': '', 'rows': rows, 'pending': {}}, 'practical': []}
    write_json(OUT / 'special-tracks-draft.json', file)
    return {'rows': len(rows), 'units': len({(r['university'], r['unit']) for r in rows}), 'by_track': dict(Counter(r['track'] for r in rows)),
            'with_plan_lines': sum(1 for r in rows if r['plan'])}


# ── 5. 수능 최저 문장 파서 ────────────────────────────────────────
# 결과 모양 = app/src/domain/minimum.ts Criterion {areas, count, sum, required, history_max, tamgu}
AREA_WORDS = {'국어': '국어', '수학': '수학', '영어': '영어', '탐구': '탐구'}
NONE_RE = re.compile(r'(최저학력기준|최저)\s*[:：]?\s*(없음|미적용|×|X$)|^[\s-]*(없음|미적용|해당\s*없음)\.?\s*$|기준\s*없음|최저학력기준\s*×')
MIXED_RE = re.compile(r'계열별|학과별|모집단위별|모집단위에 따라|나머지|그 외|외에는|필수 반영과목|제외')


def parse_minimum(text: str) -> tuple[str, dict | None, str]:
    """(status, criterion, reason). status: parsed | no_minimum | unparsed. 한 문장에 기준이 하나일 때만 읽는다."""
    t = re.sub(r'\s+', ' ', text).strip()
    if NONE_RE.search(t) and not re.search(r'\d+\s*개\s*(영역)?.*합', t):
        return 'no_minimum', None, '최저 없음'
    if MIXED_RE.search(t):
        return 'unparsed', None, '모집단위·계열별로 다른 조건이 섞인 문장'
    sums = re.findall(r'(\d)\s*개\s*(?:영역)?(?:\([^)]*\))?\s*(?:등급\s*)?합\s*(?:이\s*)?(\d{1,2})', t)
    if len(sums) != 1:
        return 'unparsed', None, '등급 합 기준이 없거나 둘 이상(모집단위별 기준이 섞인 문장)' if sums else ('영역별 등급 상한(각 n등급) — 기준 모양에 없음' if re.search(r'각\s*\d', t) else '등급 합 기준을 찾지 못함')
    if re.search(r'각\s*\d\s*등급', t):
        return 'unparsed', None, '합 기준과 영역별 상한이 함께 있음'
    count, total = int(sums[0][0]), int(sums[0][1])
    head = t.split('중')[0] if '중' in t else t
    if re.search(r'사회\s*,\s*과학|사탐\s*,\s*과탐|사회탐구\s*,\s*과학탐구', head) and '탐구(' not in head:
        return 'unparsed', None, '사회·과학 탐구를 각각 영역으로 셈 — 기준 모양(탐구 1영역)에 없음'
    areas = [a for w, a in AREA_WORDS.items() if w in head]
    if '사회' in head or '과학' in head:
        areas = sorted(set(areas) | {'탐구'}, key=list(AREA_WORDS.values()).index)
    if len(areas) < count:
        return 'unparsed', None, '반영 영역을 읽지 못함'
    req = re.search(r'\((국어|수학|영어|탐구)\s*(필수\s*)?포함\)|(국어|수학|영어)\s*필수', t)
    required = (req.group(1) or req.group(3)) if req else None
    if '탐구' in areas:
        if re.search(r'상위\s*1|우수\s*1|1\s*개\s*과목', t):
            tamgu = 'best'
        elif re.search(r'평균', t):
            tamgu = 'avg'
        else:
            return 'unparsed', None, '탐구 반영 방식(상위 1과목·평균)이 문장에 없음'
    else:
        tamgu = 'best'
    hist = re.search(r'한국사\s*(\d)\s*등급', t)
    crit = {'areas': areas, 'count': count, 'sum': total, 'required': required, 'history_max': int(hist.group(1)) if hist else None, 'tamgu': tamgu}
    assert count <= len(areas) and count <= total <= count * 9, crit
    return 'parsed', crit, ''


def minimum_sentences() -> list[dict]:
    out = []
    for f in sorted(glob.glob(str(STRUCTURED / '*.json'))):
        d = json.loads(Path(f).read_text(encoding='utf-8'))
        for i, r in enumerate(d.get('minimum_rules', [])):
            for k in ('source_text', 'source_statement', 'source_conditions', 'source_wording'):
                if isinstance(r.get(k), str) and r[k].strip():
                    out.append({'university': d['university'], 'campus': d.get('campus', ''), 'source': f'structured/universities/{Path(f).name}#minimum_rules[{i}].{k}',
                                'program_ids': r.get('program_ids', []), 'unit_ids': r.get('unit_ids', []), 'sentence': r[k].strip()})
    plans = json.loads(PUBLIC_PLANS.read_text(encoding='utf-8'))
    for e in plans.get('entries', []):
        for p in e.get('programs', []):
            if str(p.get('minimum', '')).strip():
                out.append({'university': e['university'], 'campus': e.get('campus', ''), 'source': f"admission-plans.json#{e['id']}/{p['name']}",
                            'program_ids': [], 'unit_ids': [], 'sentence': p['minimum'].strip()})
    return out


def build_minimum() -> dict:
    rows = []
    for s in minimum_sentences():
        status, crit, reason = parse_minimum(s['sentence'])
        rows.append({**s, 'status': status, 'criterion': crit, 'reason': reason})
    write_json(OUT / 'minimum-draft.json', {'format': 'jinhak-navi-minimum-draft', 'version': 1, 'review_status': 'draft',
                                            'draft_note': '검수 전 초안. 판정에 쓰지 않아요(NEVER-1). 검수 도구가 아직 없어요.', 'rows': rows})
    uniq = {r['sentence']: r['status'] for r in rows}
    return {'sentences': len(rows), 'unique_sentences': len(uniq), 'by_status': dict(Counter(r['status'] for r in rows)),
            'unique_by_status': dict(Counter(uniq.values())),
            'unparsed_unique': sorted({(r['sentence'][:160], r['reason']) for r in rows if r['status'] == 'unparsed'})}


# ── 자체 검사 ─────────────────────────────────────────────────────

def self_test() -> None:
    assert suggest_field('간호학과')[:3] == ('간호', '보건', '자연')
    assert suggest_field('의예과')[1] == '의약' and suggest_field('한의예과')[0] == '한의학' and suggest_field('수의예과')[0] == '수의학'
    assert suggest_field('초등교육')[:2] == ('초등교육', '교육') and suggest_field('일반사회교육')[0] == '인문계 교과교육'
    assert suggest_field('수학교육과')[2] == '자연' and suggest_field('국어교육과')[2] == '인문'
    assert suggest_field('경영학과')[:2] == ('경영', '경상')
    assert suggest_field('시각디자인학과')[2] == ''  # 예체능은 인문·자연으로 나누지 않음
    assert suggest_field('자유전공학부')[0] == '' and suggest_field('국제물류학과 / 국제무역행정학과')[0] == ''
    assert suggest_field('글로컬문화학부')[0] != '화학'
    assert suggest_field('경영컴퓨터학과')[0] == '' and suggest_field('기묘한학과')[3] == '맞는 규칙 없음'
    assert [m['track'] for m in track_matches('A대학교', '체육교육과')] == ['교육', '체육']
    assert track_matches('포항공과대학교', '무은재학부')[0].get('tag') is None
    assert track_matches('한국과학기술원(KAIST)', '새내기과정학부')[0]['tag'] == '특수법 설립'
    assert track_matches('서울교육대학교', '초등교육과')[0]['sub'] == '교대(초등교육)'
    assert not track_matches('한국기술교육대학교', '기계공학부') and not any(m['track'] == '교육' for m in track_matches('A대', '평생교육학과'))
    assert track_matches('A대', '한의예과')[0]['sub'] == '한의예' and track_matches('A대', '의예과')[0]['sub'] == '의예'
    st, c, _ = parse_minimum('국어, 수학, 영어, 탐구(상위 1개 과목) 중 3개 영역(수학 포함) 등급합 7 이내')
    assert st == 'parsed' and c == {'areas': ['국어', '수학', '영어', '탐구'], 'count': 3, 'sum': 7, 'required': '수학', 'history_max': None, 'tamgu': 'best'}, c
    assert parse_minimum('국어, 수학, 영어, 사회, 과학 중 3개 영역 등급합 7 이내')[0] == 'unparsed'
    assert parse_minimum('국어, 수학, 영어, 탐구(상위 1개 과목) 중 3개 영역(수학 포함) 각 3등급 이내')[0] == 'unparsed'
    assert parse_minimum('간호학과는 국어·수학·영어·사회 또는 과학탐구 중 3개 영역 합 12등급 이내. 나머지 학과는 미적용.')[0] == 'unparsed'
    for none in ('수능최저학력기준 없음', '최저학력기준: 없음', '미적용.', '선발개요 최저학력기준 ×', '- 해당없음', '4쪽전형요약 수능최저 X'):
        assert parse_minimum(none)[0] == 'no_minimum', none
    st, c, _ = parse_minimum('국어, 수학, 영어, 탐구(사회 또는 과학 상위 1과목) 중 2개 영역 합 6등급 이내, 한국사 4등급 이내')
    assert st == 'parsed' and c['history_max'] == 4 and c['sum'] == 6, c
    print('self-test ok')


def main() -> None:
    self_test()
    if '--self-test' in sys.argv:
        return
    with gzip.open(RESULTS_GZ, 'rt', encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    assert list(rows[0].keys()) == RESULT_COLUMNS, '수집 입결 열이 README 형식과 달라요'
    directory = json.loads(DIRECTORY.read_text(encoding='utf-8'))
    summary = {'source': {'results': str(RESULTS_GZ.relative_to(ROOT)).replace('\\', '/'), 'directory': str(DIRECTORY.relative_to(ROOT)).replace('\\', '/'),
                          'directory_as_of': directory.get('as_of')}}
    summary['results'] = build_results(rows)
    fields, summary['fields'] = build_fields(rows)
    summary['univ_map'] = build_univ_map(directory)
    summary['special_tracks'] = build_tracks(fields, directory, rows)
    summary['minimum'] = build_minimum()
    summary['mock_cuts'] = {'draft': None, 'reason': 'work/_data에 모의고사 등급컷 출처 자료가 없어요(app/src/data/mock-exams.ts cutTables = []).'}
    write_json(OUT / 'summary.json', summary)
    print(json.dumps({k: v for k, v in summary.items() if k != 'source'}, ensure_ascii=False, indent=1)[:4000])


if __name__ == '__main__':
    main()
