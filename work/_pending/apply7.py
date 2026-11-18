"""사람이 실행하는 보호 경로 패치 7 (2026-11-18): 메뉴·화면 이름 "가채점" → "모의고사" (사용자 결정).
실행(PowerShell): python work/_pending/apply7.py; if ($?) { python -m unittest discover tests }
"""
import hashlib
import json
from pathlib import Path

PRD, DESIGN, RULES = Path("docs/prd.md"), Path("docs/design.md"), Path("rules/design-rules.json")

design = DESIGN.read_text(encoding="utf-8")
n = design.count("가채점")
if n == 0:
    raise SystemExit("design.md에 '가채점'이 없어 멈춰요(이미 적용?)")
design = design.replace("가채점", "모의고사")
DESIGN.write_text(design, encoding="utf-8")

prd = PRD.read_text(encoding="utf-8")
OLD = "6-9. 가채점"
if OLD not in prd:
    raise SystemExit("prd.md에서 '6-9. 가채점'을 못 찾아 멈춰요")
prd = prd.replace(OLD, "6-9. 모의고사(가채점 포함)\n\n화면·메뉴 이름은 \"모의고사\"입니다(2026-11-18 결정). 학평·모평 성적과 수능 직후 가채점을 같은 화면에서 입력하고, 교사 쪽 이름은 \"모의고사 수합\"입니다.", 1)
PRD.write_text(prd, encoding="utf-8")

rules = json.loads(RULES.read_text(encoding="utf-8"))
screens = rules["screens"]
if "가채점" in screens:
    rules["screens"] = {("모의고사" if k == "가채점" else k): v for k, v in screens.items()}
rules["source"]["sha256"] = hashlib.sha256(DESIGN.read_bytes()).hexdigest()
RULES.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"done: design.md 가채점 {n}곳 → 모의고사, prd.md 6-9 제목, rules screens 키, hash updated")
