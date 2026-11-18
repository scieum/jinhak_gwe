"""사람이 실행하는 보호 경로 패치 4 (2026-11-18): 내비게이션 대분류-소분류(사용자 요청 "탭이 너무 여러 개 → 대분류-소분류").
실행: python work/_pending/apply4.py   — 바꿀 문장을 못 찾으면 아무것도 쓰지 않고 멈춘다.
"""
import hashlib
import json
from pathlib import Path

DESIGN, RULES = Path("docs/design.md"), Path("rules/design-rules.json")
IA = ("내비게이션은 대분류-소분류 2단계입니다(2026-11-18 사용자 결정).\n"
      "학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 가채점) / 대학 찾기(전형계획 · 수시 입결 · 될각) / 수시 전략(수시로 · 생기부 AI). "
      "대학 상세·전형 상세는 대학 찾기 아래의 상세 화면(소분류 아님)입니다.\n"
      "교사 대분류(교사 모드에서만): 우리 반(우리 반 홈 · 학생 기록 · 학생 상담 · 누가기록) / 성적 관리(성적 불러오기 · 수능 최저 판정 · 가채점 수합) / 수합·집계(카드 수합 · 결과 집계). "
      "학생 기록 상세는 우리 반 아래의 상세 화면입니다.\n"
      "관리자 대분류(관리자 계정에서만): 규칙 관리(규칙 편집기 · 검수).")
REPLACE = [
    ("탭은 홈 · 성적 · 될각 · 수시로 · 메뉴 다섯 개입니다. 5 to 9는 성적 탭 맨 위, 전형계획·생기부 AI·가채점·교사 모드는 메뉴 안에 둡니다.",
     "탭은 대분류 다섯 개입니다: 홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기(교사 모드·설정·잠금). 교사 모드에서는 홈 대신 우리 반 · 성적 관리 · 수합·집계 · 더보기입니다. "
     "소분류는 상단 앱바 바로 아래 `sub-nav`(가로 탭)로 고릅니다. 상세 화면(뒤로가기 있는 화면)에는 sub-nav를 두지 않습니다.\n" + IA),
    ("학생 그룹: 홈 · 전형계획 · 내 성적 · 성적 추이 · 5 to 9 · 대학별 환산 · 될각 · 수시로 · 생기부 AI · 가채점",
     "사이드바는 대분류 행(`sidebar-group`)과 그 아래 소분류 행(`sidebar-item`, 들여쓰기 16)으로 됩니다. 지금 화면이 속한 대분류만 펼치고 나머지는 접습니다(누르면 펼침). "
     "학생: 홈 / 성적 / 대학 찾기 / 수시 전략"),
    ("교사 그룹(교사 모드에서만): 우리 반 홈 · 학생 기록 · 성적 불러오기 · 수능 최저 판정 · 누가기록 · 카드 수합 · 가채점 수합 · 결과 집계 (2026-11-18, PRD 6-12)",
     "교사(교사 모드에서만): 우리 반 / 성적 관리 / 수합·집계 (소분류는 App Shell 모바일 절의 표 참조, PRD 6-12). "
     "상단 바 제목 앞에 경로 \"대분류 › 소분류\"를 {typography.caption} {colors.text-muted}로 보여줍니다."),
    ("sidebar-item — PC 사이드바 메뉴 행",
     "sidebar-group — PC 사이드바 대분류 행(2026-11-18): 아이콘 + {typography.link} SemiBold + 오른쪽 chevron(펼침 ▾ / 접힘 ›), 높이 44. "
     "현재 대분류는 {colors.ink} 글자, 나머지는 {colors.ink-soft}. 대분류 행 자체에는 선택 채움을 쓰지 않고, 선택 표시는 소분류 행(sidebar-item)에만 둡니다.\n\n"
     "sub-nav — 모바일 소분류 가로 탭(2026-11-18): 앱바 아래 높이 44, {colors.canvas} 바탕 + 아래 1px {colors.hairline}. 탭 = {typography.link}, "
     "선택 = {colors.ink} SemiBold + 아래 2px {colors.accent} 막대, 나머지 {colors.text-muted}. 넘치면 가로 스크롤(잘린 탭이 보이게 오른쪽 여백 0). 모서리 0, 그림자 없음.\n\n"
     "sidebar-item — PC 사이드바 메뉴 행"),
    ("counsel-timeline 마디 점)만 Figma ELLIPSE로 그립니다.",
     "counsel-timeline 마디 점, cut-dot-plot 원 점)만 Figma ELLIPSE로 그립니다."),
    ("judge-lane — 될각 PC 레인 보기",
     "cut-dot-plot — 입결 점 그래프(2026-11-18 사용자 요청 \"점으로 다 찍혀서 학교별로 어느 과 몇 점대인지 한눈에\"): "
     "가로축 9등급(1이 왼쪽, 0.5 눈금 {typography.caption} {colors.ink}, 세로 1px {colors.hairline-soft} 격자), 세로축 행 = 대학(또는 대학·학과) 한 줄씩, "
     "행 머리 = univ-logo 20 + 이름(한 줄). 점 = 학과·전형 하나의 입결 컷(기본 70% 컷), 지름 8, {colors.ink}. "
     "전형 유형은 탭(교과 · 종합 · 논술 · 기타 · 전체)으로 거르고, 전체일 때만 점 모양으로 구분합니다: 교과 ● 채운 원, 종합 ○ 빈 원(1.5px), 논술 ◆ 채운 마름모, 기타 ◇ 빈 마름모 + 그래프 위 범례. "
     "최근 3년을 같이 볼 때 최근 연도 = {colors.ink}, 그 전 연도 = {colors.text-faint} 같은 모양, 연도 점 사이 1px {colors.text-faint} 선. "
     "내 위치 = 환산 범위 {colors.accent-soft} 세로 띠 + 대표값 2px {colors.accent} 세로선 + 위 말풍선. 점을 누르면 말풍선(대학 · 학과 · 전형 · 연도 · 컷 · 모집인원). "
     "판정 이름·판정 색은 쓰지 않습니다(될각과 섞이지 않게). 검수 전 데이터는 점을 찍지 않고 행 끝에 \"준비 중\" data-status-badge. 표 보기(data-table)와 같은 데이터를 세그먼트로 전환합니다.\n\n"
     "judge-lane — 될각 PC 레인 보기"),
]

text = DESIGN.read_text(encoding="utf-8")
missing = [old[:40] for old, _ in REPLACE if old not in text]
if missing:
    raise SystemExit(f"design.md에서 못 찾은 문장이 있어 멈춰요: {missing}")
for old, new in REPLACE:
    text = text.replace(old, new, 1)
DESIGN.write_text(text, encoding="utf-8")

rules = json.loads(RULES.read_text(encoding="utf-8"))
for c in ("sidebar-group", "sub-nav", "cut-dot-plot"):
    if c not in rules["components"]:
        rules["components"].append(c)
rules["screens"]["수시 입결"] = "admission-results"
for key in ("requires_disclaimer_note",):
    if "admission-results" not in rules[key]:
        rules[key].append("admission-results")
rules["source"]["sha256"] = hashlib.sha256(DESIGN.read_bytes()).hexdigest()
RULES.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"done: design.md {len(REPLACE)} places, components +3, screen +1 (admission-results), hash updated")
