import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import gate  # noqa: E402
import judge  # noqa: E402
import protect  # noqa: E402

FIX = ROOT / "tests" / "fixtures"
RULES = judge.load_rules()


def fixture(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))


class TestJudge(unittest.TestCase):
    def test_clean_is_all_zero(self):
        counts, v = judge.judge(fixture("clean.json"), RULES)
        self.assertEqual(counts, {j: 0 for j in judge.JS}, v)

    def test_dirty_is_one_each(self):
        counts, v = judge.judge(fixture("dirty.json"), RULES)
        expected = {j: 1 for j in judge.JS}
        expected["J9"] = 0
        self.assertEqual(counts, expected, v)

    def test_j9_stale_rules(self):
        stale = dict(RULES, source={"file": "docs/design.md", "sha256": "0" * 64})
        counts, _ = judge.judge(fixture("clean.json"), stale)
        self.assertEqual(counts["J9"], 1)

    def test_univ_logo_exempt_from_palette(self):
        logo = {"id": "5:1", "name": "univ-logo/강원대학교", "type": "FRAME", "children": [
            {"id": "5:2", "name": "path", "type": "VECTOR", "cornerRadius": 3,
             "fills": [{"type": "SOLID", "color": {"r": 0, "g": 0.3, "b": 0.6}}]}]}
        resp = {"nodes": {"5:1": {"document": logo}}}
        counts, v = judge.judge(resp, RULES)
        self.assertEqual((counts["J1"], counts["J2"], counts["J7"]), (0, 0, 0), v)
        resp["nodes"]["5:1"]["document"] = dict(logo, name="other")  # 로고 밖이면 걸린다
        counts, _ = judge.judge(resp, RULES)
        self.assertEqual((counts["J1"], counts["J7"]), (1, 1))

    def test_exception_word_not_counted(self):
        self.assertEqual(judge.count_forbidden("될각 판정", RULES), 0)
        self.assertEqual(judge.count_forbidden("합격 보장", RULES), 1)


GOOD_RESEARCH = """
- [L1] 토스 — 목록 — https://uibowl.io/a
- [L2] 당근 — 카드 — https://uibowl.io/b
- [L3] 뱅크샐러드 — 경고 — https://uibowl.io/c
- [L4] 리멤버 — 보드 — https://uibowl.io/d
- [L5] 클래스101 — 탭 — https://uibowl.io/e
- P1: 상단 경고 요약 바 [근거: L3]
- P2: 칸 순서 변경 [근거: L4, L1]
- P3: 시나리오 탭 [근거: L5]
"""


class TestGate(unittest.TestCase):
    def test_g1(self):
        self.assertEqual(gate.g1(GOOD_RESEARCH, RULES), [])
        bad = GOOD_RESEARCH.replace("[근거: L5]", "").replace("- [L5] 클래스101 — 탭 — https://uibowl.io/e\n", "")
        errors = gate.g1(bad, RULES)
        self.assertTrue(any("링크 4개" in e for e in errors))
        self.assertTrue(any("근거 링크 없는" in e for e in errors))

    def test_g2(self):
        good = "보드 위 `warning-callout`, 칸은 `susi-slot`, 하단 `disclaimer-note`. 해요체."
        self.assertEqual(gate.g2(good, "susiro", RULES), [])
        bad = "`fancy-card` 사용. 합격 가능 대학을 보여줘요."
        errors = gate.g2(bad, "susiro", RULES)
        self.assertIn("design.md에 없는 컴포넌트: fancy-card", errors)
        self.assertTrue(any("금지어" in e for e in errors))
        self.assertIn("필수 컴포넌트 없음: disclaimer-note", errors)

    def test_g3(self):
        self.assertEqual(gate.g3(fixture("clean.json"), "susiro", RULES), [])
        errors = gate.g3(fixture("dirty.json"), "susiro", RULES)
        self.assertIn("프레임 없음: susiro/1440", errors)

    def test_approval(self):
        ok = "상태: 승인\n승인자: 김\n체크리스트:\n- [x] a\n- [x] b\n- [x] c\n"
        self.assertEqual(gate.approval(ok), ([], None))
        partial = ok.replace("- [x] c", "- [ ] c")
        self.assertTrue(gate.approval(partial)[0])
        self.assertEqual(gate.approval("상태: 반려\n반려 사유: 레퍼런스 방향")[1], "S1")
        self.assertEqual(gate.approval("상태: 반려\n반려 사유: 설계")[1], "S2")
        template = "상태: 승인 | 반려\n- [x] a\n- [x] b\n- [x] c"
        self.assertTrue(gate.approval(template)[0], "템플릿 그대로면 통과하면 안 됨")


class TestProtect(unittest.TestCase):
    def check(self, tool, **inp):
        return protect.blocked({"tool_name": tool, "tool_input": inp})[0]

    def test_file_tools(self):
        root = str(ROOT)
        self.assertTrue(self.check("Write", file_path=root + "\\rules\\design-rules.json"))
        # 04-approval.md는 사람이 채팅으로 승인한 뒤 오케스트레이터가 기록한다(docs/harness-gates.md).
        self.assertFalse(self.check("Edit", file_path=root + "\\work\\susiro\\04-approval.md"))
        self.assertTrue(self.check("Write", file_path=root + "\\.claude\\settings.json"))
        self.assertFalse(self.check("Write", file_path=root + "\\work\\susiro\\01-research.md"))
        self.assertFalse(self.check("Write", file_path=root + "\\.claude\\agents\\planner.md"))

    def test_shell(self):
        self.assertFalse(self.check("Bash", command="python scripts/gate.py susiro G1"))
        self.assertTrue(self.check("Bash", command="echo x > rules/design-rules.json"))
        self.assertTrue(self.check("PowerShell", command="Set-Content docs/design.md 'x'"))


if __name__ == "__main__":
    unittest.main()
