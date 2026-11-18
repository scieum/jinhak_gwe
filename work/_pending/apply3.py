"""사람이 실행하는 보호 경로 패치 3 (2026-11-18): 넓은 모달(표용 960px), 긴 이름 한 줄 우선(사용자 피드백).
실행: python work/_pending/apply3.py   — 바꿀 문장을 못 찾으면 아무것도 쓰지 않고 멈춘다.
"""
import hashlib
import json
from pathlib import Path

DESIGN, RULES = Path("docs/design.md"), Path("rules/design-rules.json")
REPLACE = [
    ("{rounded.md}, 최대 폭 560px, {shadow.overlay}",
     "{rounded.md}, 최대 폭 560px, {shadow.overlay}. 변형 size=wide(2026-11-18 사용자 결정): 표가 주인공인 모달(예: 5 to 9 배치표)은 최대 폭 960px, "
     "높이는 화면의 최대 80%이고 머리(제목·닫기)와 아래 고정 줄은 두고 표 영역만 스크롤합니다."),
    ("긴 대학명·전형명은 두 줄로 흘리세요.",
     "긴 대학명·전형명은 한 줄을 우선하고(폭을 다시 나눔), 그래도 넘치면 단어 사이에서만 두 줄로 흘리세요. 글자 중간에서 끊지 마세요(2026-11-18 사용자 피드백)."),
]

text = DESIGN.read_text(encoding="utf-8")
missing = [old[:40] for old, _ in REPLACE if old not in text]
if missing:
    raise SystemExit(f"design.md에서 못 찾은 문장이 있어 멈춰요: {missing}")
for old, new in REPLACE:
    text = text.replace(old, new, 1)
DESIGN.write_text(text, encoding="utf-8")

rules = json.loads(RULES.read_text(encoding="utf-8"))
rules["source"]["sha256"] = hashlib.sha256(DESIGN.read_bytes()).hexdigest()
RULES.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"done: design.md {len(REPLACE)} places, hash updated")
