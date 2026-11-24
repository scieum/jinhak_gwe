"""impl_gate 규칙 단위 테스트: 문구 분류 · 순서 · 셸 간격(P) · 타이포(F) · 색·테두리(C) · 크기·위치(Z) · 아이콘(I) · 픽셀(V).
실행: python -m unittest discover -s app/tools -p test_impl_gate.py"""
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
                "blocks": [{"name": "page-header", "x": 280, "y": 0, "w": 1128, "h": 150, "hug": False}], "texts": []}

    def app(self, **m):
        base = {"text_left": 280, "sidebar_w": 248, "header_top": 33, "header_left": 280, "header_pad": 24, "header_gap": 49}
        return {"metrics": {**base, **m}, "blocks": []}

    def test_within_tolerance_passes(self):
        self.assertEqual(g.spacing_errors(self.fig(), self.app(), 1440), [])

    def test_shell_tolerance_is_2(self):
        errs = g.spacing_errors(self.fig(), self.app(header_top=35, header_pad=21), 1440)
        self.assertEqual(len(errs), 2)
        self.assertTrue(errs[0].startswith("P 1440: page-header 위 여백 35"))

    def test_mobile_appbar(self):
        fig = {"metrics": {"text_left": 20, "appbar_h": 56}, "blocks": [], "texts": []}
        errs = g.spacing_errors(fig, {"metrics": {"text_left": 16, "appbar_h": 64}, "blocks": []}, 390)
        self.assertEqual(len(errs), 2)


def ftext(chars, fs=14, fw=400, lh=21, color=(20, 20, 20, 1.0), x=20, y=100, nid="1:2"):
    return {"id": nid, "chars": chars, "style": "", "comps": (), "x": x, "y": y, "w": 80, "h": lh,
            "ts": {"fs": fs, "fw": fw, "lh": lh, "color": color}}


def atext(t, fs=14, fw=400, lh=21, color="rgb(20, 20, 20)", x=20, y=100):
    return {"t": t, "x": x, "y": y, "w": 80, "h": lh, "fs": fs, "fw": fw, "lh": lh, "color": color}


class Typo(unittest.TestCase):
    def test_same_style_passes_and_font_family_ignored(self):
        self.assertEqual(g.typo_errors({"texts": [ftext("성적 입력")]}, {"texts": [atext("성적 입력", fs=14.4, lh=21.9)]}, "390"), [])

    def test_each_property_reported_with_node_id(self):
        errs = g.typo_errors({"texts": [ftext("성적 입력", nid="9:9")]},
                             {"texts": [atext("성적 입력", fs=15, fw=600, lh=None, color="rgba(20, 20, 20, 0.5)")]}, "1440")
        self.assertEqual(len(errs), 1)
        e = errs[0]
        self.assertTrue(e.startswith("F 1440 #9:9: '성적 입력' "))
        for part in ("font-size 15 (시안 14±0.5)", "font-weight 600 (시안 400)", "line-height normal", "색 #141414/0.50 (시안 #141414)"):
            self.assertIn(part, e)

    def test_nearest_same_text_is_paired_once(self):
        fig = {"texts": [ftext("안정", y=100, nid="a"), ftext("안정", y=300, nid="b", fw=700)]}
        app = {"texts": [atext("안정", y=302, fw=700), atext("안정", y=98)]}
        self.assertEqual(g.typo_errors(fig, app, "390"), [])

    def test_short_text_not_paired_far_away(self):
        self.assertEqual(g.typo_errors({"texts": [ftext("1", y=100)]}, {"texts": [atext("1", y=900, fs=30)]}, "390"), [])

    def test_mixed_style_text_is_skipped(self):
        n = {"characters": "ab", "style": {"fontSize": 12}, "characterStyleOverrides": [0, 1], "styleOverrideTable": {"1": {"fontSize": 14}}}
        self.assertIsNone(g.text_style(n))
        n["characterStyleOverrides"] = [1, 1]
        self.assertEqual(g.text_style(n)["fs"], 14)


def fblock(name="univ-card", nid="5:5", x=20, y=200, w=350, h=120, bg=(255, 255, 255, 1.0), bw=(0, 0, 1, 0), bc=(224, 224, 224, 1.0), hug=False, cands=None):
    b = {"name": name, "id": nid, "x": x, "y": y, "w": w, "h": h, "hug": hug, "hug_v": hug, "bg": bg, "bw": list(bw), "bc": bc, "radius": 0}
    b["cands"] = cands or [dict(b)]
    return b


def ablock(name="univ-card", x=20, y=200, w=350, h=120, bg="rgb(255, 255, 255)", bw=(0, 0, 1, 0), bc="rgb(224, 224, 224)", radius=0):
    return {"name": name, "x": x, "y": y, "w": w, "h": h, "bg": bg, "bw": list(bw), "bc": [bc] * 4, "radius": radius}


class Color(unittest.TestCase):
    def test_same_passes(self):
        self.assertEqual(g.color_errors({"blocks": [fblock()]}, {"blocks": [ablock()]}, "390"), [])

    def test_bg_border_radius(self):
        errs = g.color_errors({"blocks": [fblock()]}, {"blocks": [ablock(bg="rgb(243, 243, 243)", bc="rgb(240, 240, 240)", radius=8)]}, "390")
        self.assertEqual(errs, ["C 390 #5:5: univ-card[1] 배경 #f3f3f3 (시안 #ffffff) · 테두리 아래 색 #f0f0f0 (시안 #e0e0e0) · 모서리 8 (시안 0)"])

    def test_border_width(self):
        errs = g.color_errors({"blocks": [fblock()]}, {"blocks": [ablock(bw=(1, 1, 1, 1))]}, "390")
        self.assertIn("테두리 위 1px (시안 0px)", errs[0])

    def test_inner_box_is_paired_when_it_overlaps_better(self):
        inner = {"id": "5:6", "x": 20, "y": 230, "w": 350, "h": 48, "bg": (240, 240, 240, 1.0), "bw": [0, 0, 0, 0], "bc": None, "radius": 0}
        outer = fblock(name="text-input", y=200, h=78, bg=None, bw=(0, 0, 0, 0), bc=None)
        outer["cands"] = [dict(outer), inner]
        app = {"blocks": [ablock(name="text-input", y=230, h=48, bg="rgb(240, 240, 240)", bw=(0, 0, 0, 0))]}
        self.assertEqual(g.color_errors({"blocks": [outer]}, app, "390"), [])
        self.assertEqual(g.size_errors({"blocks": [outer]}, app, "390"), [])

    def test_no_overlap_keeps_outer_box(self):
        icon = {"id": "5:7", "x": 20, "y": 200, "w": 16, "h": 16, "bg": None, "bw": [0, 0, 0, 0], "bc": None, "radius": 0}
        f = fblock(name="disclaimer-note", y=200, h=34)
        f["cands"] = [dict(f), icon]
        errs = g.size_errors({"blocks": [f]}, {"blocks": [ablock(name="disclaimer-note", y=600, h=34)]}, "390")
        self.assertEqual(errs, ["Z 390 #5:5: disclaimer-note[1] y 600 (시안 200±2)"])

    def test_css_rgba(self):
        self.assertIsNone(g.css_rgba("rgba(0, 0, 0, 0)"))
        self.assertEqual(g.css_rgba("rgba(1, 2, 3, 0.5)"), (1, 2, 3, 0.5))


class Size(unittest.TestCase):
    def test_tolerance_2_and_hug_4(self):
        fig = {"blocks": [fblock(), fblock(name="filter-chip", nid="6:6", x=20, y=400, w=80, h=32, hug=True)]}
        app = {"blocks": [ablock(x=22, y=203), ablock(name="filter-chip", x=20, y=400, w=84, h=36)]}
        self.assertEqual(g.size_errors(fig, app, "390"), ["Z 390 #5:5: univ-card[1] y 203 (시안 200±2)"])

    def test_nth_pairing(self):
        fig = {"blocks": [fblock(nid="a", y=100), fblock(nid="b", y=300)]}
        app = {"blocks": [ablock(y=100), ablock(y=310)]}
        self.assertEqual(g.size_errors(fig, app, "390"), ["Z 390 #b: univ-card[2] y 310 (시안 300±2)"])

    def test_pc_page_header_left_to_p(self):
        fig = {"blocks": [fblock(name="page-header", x=280, w=1128)]}
        self.assertEqual(g.size_errors(fig, {"blocks": [ablock(name="page-header", x=248, w=1192)]}, "1440", 1440), [])


class Icons(unittest.TestCase):
    def test_match_missing_extra(self):
        fig = {"icons": [{"id": "1:1", "name": "icon/x", "x": 300, "y": 20, "w": 20, "h": 20},
                         {"id": "1:2", "name": "icon/info", "x": 16, "y": 500, "w": 16, "h": 16}]}
        app = {"icons": [{"x": 303, "y": 18, "w": 20, "h": 20}, {"x": 16, "y": 520, "w": 16, "h": 16}]}
        errs = g.icon_errors(fig, app, "390")
        self.assertEqual(errs, ["I 390 #1:2: 아이콘 없음 icon/info x 16 y 500 16×16 (±4)", "I 390: 시안에 없는 아이콘 x 16 y 520 16×16"])

    def test_count(self):
        errs = g.icon_errors({"icons": []}, {"icons": [{"x": 0, "y": 0, "w": 16, "h": 16}]}, "390")
        self.assertEqual(errs[0], "I 390: 아이콘 개수 1 (시안 0)")


class Pixels(unittest.TestCase):
    def png(self, draw=None):
        import io
        from PIL import Image, ImageDraw
        im = Image.new("RGB", (200, 160), "white")
        d = ImageDraw.Draw(im)
        d.rectangle((10, 10, 120, 30), fill=(20, 20, 20))
        if draw:
            draw(d)
        b = io.BytesIO()
        im.save(b, "PNG")
        return b.getvalue()

    def test_identical(self):
        score, rects, _, _ = g.pixel_compare(self.png(), self.png(), (200, 160))
        self.assertGreater(score, 0.999)
        self.assertEqual(rects, [])

    def test_block_difference_found_with_coordinates(self):
        app = self.png(lambda d: d.rectangle((40, 80, 119, 119), fill=(0, 102, 255)))
        score, rects, _, _ = g.pixel_compare(self.png(), app, (200, 160))
        self.assertLess(score, 0.99)
        self.assertEqual(len(rects), 1)
        x, y, w, h = rects[0]
        self.assertTrue(x <= 40 and y <= 80 and x + w >= 120 and y + h >= 120 and w <= 100 and h <= 60)

    def test_tiny_difference_ignored(self):
        app = self.png(lambda d: d.point((150, 150), fill=(0, 0, 0)))
        self.assertEqual(g.pixel_compare(self.png(), app, (200, 160))[1], [])

    def test_errors_and_image(self):
        import tempfile
        from pathlib import Path
        app = self.png(lambda d: d.rectangle((40, 80, 119, 119), fill=(0, 102, 255)))
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "x.png"
            errs, score = g.pixel_errors(self.png(), app, (200, 160), "390", p)
            self.assertTrue(p.exists())
        self.assertTrue(any(e.startswith("V 390: 차이 영역 x ") for e in errs))


if __name__ == "__main__":
    unittest.main()
