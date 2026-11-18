"""사람이 실행하는 보호 경로 패치 6 (2026-11-18): 배치표형 좌표(placement-board) — 사용자 요청 "모든 대학 좌표 찍어 예전 정시 배치표 같은 느낌".
실행(PowerShell): python work/_pending/apply6.py; if ($?) { python -m unittest discover tests }
"""
import hashlib
import json
from pathlib import Path

DESIGN, RULES = Path("docs/design.md"), Path("rules/design-rules.json")
ANCHOR = "judge-lane — 될각 PC 레인 보기"
NEW = (
    "placement-board — 배치표(2026-11-18 사용자 요청 \"모든 대학을 좌표로 찍어 예전 정시 배치표 같은 느낌\"): "
    "세로축 = 환산 9등급(1이 위, 0.1 눈금, 0.5마다 {colors.hairline-soft} 가로 격자, 왼쪽 축 라벨 {typography.caption} {colors.ink}), "
    "가로 = 열(기본 계열: 인문 · 사회 · 자연 · 공학 · 의약 · 예체능), 열 머리 {typography.label}. "
    "칸 = 대학·학과 이름표(univ-logo 16 + \"대학 학과\" {typography.caption}, 한 줄 말줄임, 모서리 0, 채움 없음)를 그 학과 입결 컷(기본 70% 컷) 높이에 놓습니다. "
    "같은 높이에서 겹치면 아래로 한 줄씩 밀어 쌓고 순서는 컷 순서를 지킵니다. "
    "내 위치 = 모든 열을 가로지르는 {colors.accent-soft} 띠(환산 범위) + 2px {colors.accent} 가로선(대표값) + 축 옆 말풍선. "
    "전형 유형 탭(교과 · 종합 · 논술 · 기타 · 전체)으로 거르고, 전체일 때만 이름표 앞에 모양 표시(● 교과 ○ 종합 ◆ 논술 ◇ 기타) + 범례. "
    "기본 보기는 내 위치 ±1.0등급, 세로 스크롤로 1~9 전체. 판정 이름·판정 색은 쓰지 않습니다(될각과 섞이지 않게). "
    "검수 전 데이터는 이름표 없이 열 아래 \"준비 중 n개\" data-status-badge. 모바일은 열 하나를 segmented-control로 골라 봅니다. "
    "표 보기(data-table)·대학별 점 보기(cut-dot-plot)와 같은 데이터이며 보기 전환 segmented-control(표 · 배치표 · 대학별 점)로 바꿉니다.\n\n"
    + ANCHOR
)

text = DESIGN.read_text(encoding="utf-8")
if text.count(ANCHOR) != 1:
    raise SystemExit(f"design.md에서 '{ANCHOR}'를 정확히 한 번 찾지 못해 멈춰요 ({text.count(ANCHOR)}번)")
if "placement-board —" not in text:
    DESIGN.write_text(text.replace(ANCHOR, NEW, 1), encoding="utf-8")

rules = json.loads(RULES.read_text(encoding="utf-8"))
if "placement-board" not in rules["components"]:
    rules["components"].append("placement-board")
rules["source"]["sha256"] = hashlib.sha256(DESIGN.read_bytes()).hexdigest()
RULES.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
print("done: design.md placement-board, components +1, hash updated")
