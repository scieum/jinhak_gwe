"""사람이 실행하는 보호 경로 패치 (2026-11-18): 등급 색, 추가 컴포넌트, spacing 20, interest-heart, 해시 갱신.
실행: python work/_pending/apply.py   — 바꿀 문장을 못 찾으면 아무것도 쓰지 않고 멈춘다.
"""
import hashlib
import json
from pathlib import Path

DESIGN, RULES = Path("docs/design.md"), Path("rules/design-rules.json")
GRADES = ["#1b2a6b", "#2e3fa3", "#4b4fc8", "#6c5fd6", "#8e6ad8", "#b06cc9", "#cb78b4", "#dc93a6", "#e8b4b0"]

HEART = "#f0457a"  # 관심 하트 담김 색(2026-11-18 사용자 결정: 핑크~빨강), 위험 #b8232a와 구분
UP, DOWN = "#d0202b", "#1d4fb8"  # 전년 대비 증감(주식식: 오름 빨강 ▲, 내림 파랑 ▼), 흰 배경 대비 5.4:1 / 7.4:1

REPLACE = [
    ("선택 행: 1px 잉크 안쪽 테두리.",
     "선택 행: {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 아래 1px {colors.hairline}(Elevation Selected 규칙, 2026-11-18)."),
    ("5단계 점, 범위 막대 위 방법별 점)만 Figma ELLIPSE로 그립니다.",
     "5단계 점, 범위 막대 위 방법별 점, counsel-timeline 마디 점)만 Figma ELLIPSE로 그립니다."),
    ("#ffffff): 잉크 바탕 위 글자",
     "#ffffff): 잉크 바탕 위 글자\nHeart ({colors.heart} — \n" + HEART + "): interest-heart 담김 상태 채움에만 씁니다. "
     "글자·배지·경고·버튼에는 쓰지 않습니다(위험 #b8232a와 구분되는 분홍빛 빨강, 흰 배경 대비 3.6:1).\n"
     "Delta Up ({colors.delta-up} — \n" + UP + ") / Delta Down ({colors.delta-down} — \n" + DOWN + "): 전년 대비 숫자 증감에만 씁니다"
     "(2026-11-18 사용자 결정, 주식 표기처럼 오름 빨강 · 내림 파랑). 반드시 ▲/▼ 기호 + 차이값과 함께 쓰고(예: \"98명 ▼22\"), "
     "판정·경고·선택 표시에는 쓰지 않습니다. 바뀐 2028 값은 Bold로 표시합니다."),
    ("담김 = {colors.accent} 채운 하트(선택 표시 규칙)",
     "담김 = {colors.heart} 채운 하트(관심 표시 전용 색, 2026-11-18 사용자 결정)"),
    ("등급(1~5, 1~9)에는 색을 입히지 않습니다. 무지개색으로 등급을 칠하면 판정 색과 헷갈리기 때문입니다. 등급은 숫자 + 굵기 + 칩 모양으로만 구분합니다(grade-chip 참조).",
     "등급 색(2026-11-18 사용자 결정): 5 to 9 범위 막대의 1~9 구간 채움에만 등급마다 다른 색을 씁니다. "
     "{colors.grade-1} " + GRADES[0] + " · {colors.grade-2} " + GRADES[1] + " · {colors.grade-3} " + GRADES[2] +
     " · {colors.grade-4} " + GRADES[3] + " · {colors.grade-5} " + GRADES[4] + " · {colors.grade-6} " + GRADES[5] +
     " · {colors.grade-7} " + GRADES[6] + " · {colors.grade-8} " + GRADES[7] + " · {colors.grade-9} " + GRADES[8] +
     " (남색 → 보라 → 연분홍, 판정색의 초록·청록·주황을 피함). 등급 색은 글자색·판정 배지·경고·grade-chip에는 쓰지 않습니다. "
     "grade-chip과 표의 등급 숫자는 지금처럼 숫자 + 굵기 + 칩 모양으로만 구분합니다."),
    ("1~9 눈금이 있는 알약 트랙({colors.canvas-soft}), 눈금 숫자는 {typography.caption}",
     "1~9 구간을 {colors.grade-1}~{colors.grade-9}로 채운 트랙(높이 12, 모서리 0), 눈금 숫자는 트랙 아래 {typography.caption} {colors.ink}"),
    ("방법별 추정값(A-1, A-2, A-3, B)은 트랙 위 작은 잉크 점, 그 사이 범위는 {colors.ink} 20% 채움 구간",
     "방법별 추정값(A-1, A-2, A-3, B)은 트랙 위 작은 잉크 점(흰 1px 테두리), 그 사이 범위는 트랙 위쪽 2px {colors.ink} 괄호선"),
    ("내 위치(대표값)는 {colors.accent} 원형 표시 + 위쪽 말풍선 숫자",
     "내 위치(대표값)는 {colors.accent} 원형 + 흰 3px 테두리 + 바깥 1px {colors.ink} 선(색 트랙 위에서도 보이게) + 위쪽 말풍선 숫자"),
    ("등급 숫자에 색을 입히지 마세요(무지개 등급표 금지).",
     "등급 숫자 글자·grade-chip에 색을 입히지 마세요. 등급 색은 5 to 9 범위 막대 구간 채움에만 씁니다."),
    ("· {spacing.lg} 24px",
     "· {spacing.card} 20px(카드 패딩·모바일 좌우 여백) · {spacing.lg} 24px"),
    ("tab-bar-pill — 모바일 하단 탭바",
     "app-bar — 모바일 상단 앱바: 높이 56, 왼쪽 icon/chevron-left, 가운데 화면 제목 {typography.heading-4}, 오른쪽 보조 동작 1개\n\n"
     "sidebar-item — PC 사이드바 메뉴 행: 아이콘 + {typography.link}, 선택 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + {colors.ink} 글자\n\n"
     "filter-chip — 필터 선택지(off/on): off = {colors.canvas-soft} 채움, on = {colors.accent-soft} 채움 + 1px {colors.accent} 테두리 + {colors.ink} 글자, 모서리 0\n\n"
     "tab-bar-pill — 모바일 하단 탭바"),
    ("judge-lane — 될각 PC 레인 보기",
     "수능 최저 판정 배지(2026-11-18): judge-badge 색 쌍을 재사용 — 충족 = 안정 쌍 ● / 근접 = 적정 쌍 ◐ / 미충족 = 위험 쌍 ■ / 자료 부족·판정 불가 = 판정 없음 쌍(아이콘 없음, 이름만). 문구는 \"충족 현황\"(예측 표현 금지).\n\n"
     "grade-trend-chart — 등급 추이 선 차트(2026-11-18): 세로축 등급(1이 위, 내신 1~5 / 모의고사 1~9 눈금), 가로축 학기 또는 시험 회차. "
     "선택한 계열 1개만 2px {colors.accent} 선 + 점, 나머지 계열은 1px {colors.text-faint} 선 + 선 끝 이름표(계열을 색으로 구분하지 않음). "
     "가장 최근 점에 값 라벨. 기준선은 1px {colors.hairline} 점선 + 캡션 1개. 차트 아래 같은 값의 data-table(대체 텍스트 역할). 모서리 0, 그림자 없음.\n\n"
     "judge-lane — 될각 PC 레인 보기"),
    ("경고(수시로 조합 경고, 수능최저 미충족 예상)는 소신 색 쌍을 씁니다.",
     "경고(수시로 조합 경고)는 소신 색 쌍을 씁니다. 수능 최저 미충족은 \"수능 최저 판정 배지\" 규칙(위험 쌍 ■)을 따르고, \"예상\" 같은 예측 표현 대신 \"충족 현황\"이라고 씁니다."),
    ("학생 그룹: 홈 · 전형계획 · 내 성적 · 5 to 9",
     "학생 그룹: 홈 · 전형계획 · 내 성적 · 성적 추이 · 5 to 9"),
    ("교사 그룹(교사 모드에서만): 학급 대시보드 · 학생 상담 · 카드 수합 · 가채점 수합 · 결과 집계",
     "교사 그룹(교사 모드에서만): 우리 반 홈 · 학생 기록 · 성적 불러오기 · 수능 최저 판정 · 누가기록 · 카드 수합 · 가채점 수합 · 결과 집계 (2026-11-18, PRD 6-12)"),
]

text = DESIGN.read_text(encoding="utf-8")
missing = [old[:40] for old, _ in REPLACE if old not in text]
if missing:
    raise SystemExit(f"design.md에서 못 찾은 문장이 있어 멈춰요: {missing}")
for old, new in REPLACE:
    text = text.replace(old, new, 1)
DESIGN.write_text(text, encoding="utf-8")

PRD = Path("docs/prd.md")
PRD_ANCHOR = "7. 권한 · 데이터 저장 정책"
PRD_SECTION = """6-12. 담임 기록 (2026-11-18 추가 — schs_lms 담임 기능 이식, 야자·봉사·AI 글 짓기 제외)

참고: work/_ref/schs_lms-homeroom.md. 모든 데이터는 교사 기기에만 암호화 저장(7-3). 실행 중 AI 호출 없음(13장) — 분석·명단은 규칙으로 고른다.

우리 반 홈(teacher-dashboard): 숫자 타일 4개(학생 수, 카드 제출, 최저 미충족, 상담 필요), 우리 반 브리핑(먼저 볼 학생 — 규칙: 최저 근접·카드 위험 경고·성적 하락), 학생 한눈에 목록.
학생 기록 상세(student-record): 탭 = 성적 추이 / 수능 최저 / 상담 / 누가기록 / 수시로.
  - 성적 추이: 내신 학기별 평균 등급(전 교과·국수영사과) 선 차트 + 모의고사 회차별 영역 등급(국·수·영·탐1·탐2) 선 차트. 등급 축은 1이 위.
  - 수능 최저: 목표 대학(최대 3개)별 판정.
성적 불러오기(score-import): 모의고사 등급·내신 성적표 업로드 4단계(파일 → 열 맞추기 → 검증 → 반영), 번호·별칭을 채운 양식 내려받기. 모의고사는 시험(연·월·종류 학평/모평/수능)과 영역별 등급, 원점수·백분위는 선택.
수능 최저 판정(minimum-board): 반 학생 × 1순위 목표 판정 표. 판정 = 충족 / 근접(한 영역 1등급만 오르면 충족) / 미충족 / 자료 부족 / 판정 불가 — 색 + 아이콘 + 이름. 기준은 관리자 검수 데이터(csat_minimum)가 기본, 담임이 추가한 기준은 "교사 입력 · 미검수" 배지. 상담 명단은 규칙(근접 먼저)으로 만들고 교사가 고친 뒤 저장. xlsx 내보내기. 화면 문구는 "충족 현황"(예측 표현 금지, NEVER-2).
누가기록(homeroom-logs): 영역(자율·자치 / 진로)과 날짜를 고르고 여러 학생에게 한 번에 관찰 기록을 남기는 보드, 학생별 기록 수.
내 성적 추이(score-trend, 학생): 내 내신 학기별 추이 + 모의고사 회차별 추이 차트 + 목표 대학 최저 판정. 모든 숫자는 추정·범위 규칙과 disclaimer-note를 따른다.

"""
prd = PRD.read_text(encoding="utf-8")
if PRD_ANCHOR not in prd:
    raise SystemExit("prd.md에서 '7. 권한 · 데이터 저장 정책'을 못 찾아 멈춰요")
if "6-12. 담임 기록" not in prd:
    PRD.write_text(prd.replace(PRD_ANCHOR, PRD_SECTION + PRD_ANCHOR, 1), encoding="utf-8")

rules = json.loads(RULES.read_text(encoding="utf-8"))
rules["screens"].update({"학생 기록 상세": "student-record", "성적 불러오기": "score-import",
                         "수능 최저 판정": "minimum-board", "누가기록": "homeroom-logs", "내 성적 추이": "score-trend"})
for key, slugs in (("requires_disclaimer_note", ["student-record", "minimum-board", "score-trend", "teacher-dashboard"]),):
    rules[key] += [s for s in slugs if s not in rules[key]]
rules["colors"] += [g for g in GRADES + [HEART, UP, DOWN] if g not in rules["colors"]]
comps = rules["components"]
for c in ("interest-heart", "filter-chip", "sidebar-item", "app-bar", "grade-trend-chart"):
    if c not in comps:
        comps.append(c)
rules["source"]["sha256"] = hashlib.sha256(DESIGN.read_bytes()).hexdigest()
RULES.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"적용 완료: design.md {len(REPLACE)}곳, prd.md 6-12 담임 기록, rules 색 +12(등급 9·하트·증감 2) · 컴포넌트 +5 · 화면 +5 · 해시 갱신")
