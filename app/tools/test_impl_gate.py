"""impl_gate 규칙 단위 테스트: 문구 분류 · 순서 비교 · 간격 허용오차. 실행: python -m unittest discover -s app/tools -p test_impl_gate.py"""
import unittest

import impl_gate as g


class FixedText(unittest.TestCase):
    def test_ui_copy_is_fixed(self):
        self.assertTrue(g.is_fixed_text("전형 상세 보기", "link", ("button-outline",)))
        self.assertTrue(g.is_fixed_text("전년 대비 바뀐 점", "pc/heading-3", ()))
        self.assertTrue(g.is_fixed_text("모집인원", "table-head", ("data-table",)))
        self.assertTrue(g.is_fixed_text("대학 찾기 › 수시 입결", "caption", ("page-header",)))

    def test_data_is_not_fixed(self):
        self.assertFalse(g.is_fixed_text("2028학년도", "pc/heading-3", ()))           # 숫자
        self.assertFalse(g.is_fixed_text("경희대학교", "pc/heading-1", ("page-header",)))  # 대학 이름
        self.assertFalse(g.is_fixed_text("행정학과", "heading-4", ()))
        self.assertFalse(g.is_fixed_text("민지님, 지금 내 위치예요", "heading-1", ("page-header",)))
        self.assertFalse(g.is_fixed_text("7 하늘", "body", ("button-outline",)))
        self.assertFalse(g.is_fixed_text("하늘", "title", ("filter-chip",)))
        self.assertFalse(g.is_fixed_text("관리자 A로 로그인", "link", ("button-outline",)))
        self.assertFalse(g.is_fixed_text("안정", "label", ("data-table", "judge-badge")))  # 표 행 값
        self.assertFalse(g.is_fixed_text("전형 상세", "title", ("univ-card", "button-outline")))  # 데이터 카드 안
        self.assertFalse(g.is_fixed_text("본문 설명이에요", "body", ()))  # 고정 범주 밖 본문

    def test_text_match_is_per_line(self):
        lines = [g.norm(x) for x in ["대학 찾기", "전형계획", "+ 지원 전형 추가"]]
        self.assertFalse(g.has_text(lines, "대학 찾기 › 전형계획"))  # 이어 붙여서 맞추지 않음
        self.assertTrue(g.has_text(lines, "지원 전형 추가"))
        self.assertTrue(g.has_text(lines, "대학 찾기 ⌄"))


class Order(unittest.TestCase):
    def test_same_order_passes(self):
        self.assertEqual(g.order_errors(["page-header", "filter-chip", "filter-chip", "data-table"],
                                        ["page-header", "text-input", "filter-chip", "data-table", "filter-chip"]), [])

    def test_missing_and_swapped(self):
        errs = g.order_errors(["page-header", "stat-tile", "data-table", "disclaimer-note"],
                              ["page-header", "data-table", "stat-tile"])
        self.assertIn("블록 없음 disclaimer-note", errs)
        self.assertTrue(any(e.startswith("블록 순서 다름") for e in errs))


class Spacing(unittest.TestCase):
    def fig(self, **m):
        return {"metrics": {"text_left": 280, "sidebar": True, "header_gap": 48, **m},
                "blocks": [{"name": "page-header", "x": 280, "y": 0, "w": 1128, "h": 150, "hug": False},
                           {"name": "data-table", "x": 280, "y": 174, "w": 1128, "h": 300, "hug": False},
                           {"name": "filter-chip", "x": 280, "y": 500, "w": 80, "h": 32, "hug": True}],
                "texts": []}

    def app(self, **m):
        base = {"text_left": 280, "sidebar_w": 248, "header_top": 33, "header_left": 280, "header_pad": 24, "header_gap": 49}
        return {"metrics": {**base, **m}, "blocks": [{"name": "data-table", "x": 283, "y": 0, "w": 1124, "h": 1},
                                                     {"name": "filter-chip", "x": 280, "y": 0, "w": 300, "h": 1}]}

    def test_within_tolerance_passes(self):
        self.assertEqual(g.spacing_errors(self.fig(), self.app(), 1440), [])

    def test_shell_tolerance_is_2(self):
        errs = g.spacing_errors(self.fig(), self.app(header_top=35, header_pad=21), 1440)
        self.assertEqual(len(errs), 2)
        self.assertTrue(errs[0].startswith("P 1440: page-header 위 여백 35"))

    def test_block_tolerance_is_4_and_hug_skips_width(self):
        app = self.app()
        app["blocks"][0]["x"] = 285
        errs = g.spacing_errors(self.fig(), app, 1440)
        self.assertEqual(errs, ["P 1440: data-table x 285 (시안 280±4)"])

    def test_mobile_appbar(self):
        fig = {"metrics": {"text_left": 20, "appbar_h": 56}, "blocks": [], "texts": []}
        errs = g.spacing_errors(fig, {"metrics": {"text_left": 16, "appbar_h": 64}, "blocks": []}, 390)
        self.assertEqual(len(errs), 2)


if __name__ == "__main__":
    unittest.main()
