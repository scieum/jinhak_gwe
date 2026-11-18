"""사람이 실행하는 보호 경로 패치 2 (2026-11-18): 생기부 AI 3대 역량 색·컴포넌트(schs_lms 역량 보기 이식).
실행: python work/_pending/apply2.py   — 바꿀 문장을 못 찾으면 아무것도 쓰지 않고 멈춘다.
참고: work/_ref/schs_lms-competency.md
"""
import hashlib
import json
from pathlib import Path

DESIGN, RULES = Path("docs/design.md"), Path("rules/design-rules.json")
# 역량 색(점·막대 = 진한 색, 문장 칠 = 옅은 색). Route Blue·판정 초록/주황과 다른 색조, 진한 색은 흰 배경 대비 3:1 이상
COMP = {"academic": ("#5b5bd6", "#e6e6fa"), "career": ("#0e9f6e", "#d6f2e6"), "community": ("#b58400", "#fbefc7")}

REPLACE = [
    ("바뀐 2028 값은 Bold로 표시합니다.",
     "바뀐 2028 값은 Bold로 표시합니다.\n"
     "Competency — 생기부 AI 3대 역량(2026-11-18 사용자 결정, schs_lms 역량 보기 이식): "
     "학업역량 {colors.comp-academic} " + COMP["academic"][0] + " / 문장 칠 {colors.comp-academic-tint} " + COMP["academic"][1] +
     " · 진로역량 {colors.comp-career} " + COMP["career"][0] + " / {colors.comp-career-tint} " + COMP["career"][1] +
     " · 공동체역량 {colors.comp-community} " + COMP["community"][0] + " / {colors.comp-community-tint} " + COMP["community"][1] +
     ". 생기부 AI 화면에서만 씁니다(문장 칠, 역량 점, 비율 막대). 반드시 역량 이름과 함께 쓰고, 판정·선택·경고에는 쓰지 않습니다."),
    ("흰 카드, 역량 이름 {typography.heading-4}, 5단계 점 표시(채운 점 {colors.ink}, 빈 점 {colors.hairline}), 한 줄 근거",
     "역량 1개 묶음(2026-11-18 개편): 머리 행 = 역량 색 점(8px ELLIPSE) + 역량 이름 {typography.heading-4} + 오른쪽 \"n문장\" {typography.caption}, "
     "아래 평가항목 행(대교협 공통 평가요소 — 학업: 학업성취도·학업태도·탐구력 / 진로: 교과 이수 노력·교과 성취도·진로 탐색 / "
     "공동체: 협업과 소통·나눔과 배려·성실·규칙준수·리더십) = 항목 이름 {typography.body-sm} + 문장 수(고정폭 숫자). 문장 0개 항목은 {colors.text-muted}. "
     "선택(초점) = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대. 점수·5단계 점·등급은 쓰지 않고 문장 수만 보여줍니다(평가 결과로 읽히지 않게, NEVER-2).\n\n"
     "competency-highlight — 원문 문장 역량 칠하기: 문장마다 해당 역량 옅은 색(…-tint) 배경, 모서리 0. 초점 역량이 있으면 그 문장만 칠하고 나머지 문장은 칠 없이 {colors.text-muted}. "
     "문장을 누르면 작은 말풍선(평가항목 이름 + 역량 이름). 색만으로 구분하지 않도록 패널의 역량 이름·점과 짝을 이룹니다.\n\n"
     "competency-bar — 3대 역량 비율 막대: 높이 6, 모서리 0, 구간 사이 2px, 문장 수 비례 폭, 구간 색 = 역량 진한 색. 아래에 \"학업 n · 진로 n · 공동체 n\" 캡션(대체 텍스트)."),
]

text = DESIGN.read_text(encoding="utf-8")
missing = [old[:40] for old, _ in REPLACE if old not in text]
if missing:
    raise SystemExit(f"design.md에서 못 찾은 문장이 있어 멈춰요: {missing}")
for old, new in REPLACE:
    text = text.replace(old, new, 1)
DESIGN.write_text(text, encoding="utf-8")

rules = json.loads(RULES.read_text(encoding="utf-8"))
rules["colors"] += [c for pair in COMP.values() for c in pair if c not in rules["colors"]]
for c in ("competency-highlight", "competency-bar"):
    if c not in rules["components"]:
        rules["components"].append(c)
rules["source"]["sha256"] = hashlib.sha256(DESIGN.read_bytes()).hexdigest()
RULES.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"done: design.md {len(REPLACE)} places, rules colors +6, components +2, hash updated")
