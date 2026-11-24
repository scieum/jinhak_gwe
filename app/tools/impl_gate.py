"""G5 시안↔코드 구현 일치 게이트(엄격): Figma 최종 화면(05-build.json 기본 프레임 390·1440)과 앱 렌더를 비교한다.

사용: python app/tools/impl_gate.py <slug> | --all [--refresh]
종료코드 0 = 통과. 결과는 work/<slug>/07-impl.json(same_fail_streak · 비교 이미지 경로 포함).
앱은 샘플 데이터 모드(시안과 같은 데모 데이터)로 시드하고, 뷰포트는 시안 프레임 크기(폭 × 높이) 그대로 잰다.

검사 8가지. 오류 문자열 = "<분류> <뷰포트>[ #<시안 노드 id>]: <내용> <실제값> (시안 <기대값>±<허용>)".
  T 문구: 시안 고정 UI 문구가 앱 화면 글자(innerText·placeholder·aria-label)에 있어야 한다. 규칙은 is_fixed_text().
  S 구조: 시안 위→아래 주요 블록(BLOCKS) 첫 등장 순서가 앱과 같고, 시안 블록이 앱에 있어야 한다.
  P 셸 간격: design.md 셸 수치(SHELL) ±2px, 본문 왼쪽 여백(시안) ±2px.
  F 타이포: 시안 TEXT ↔ 앱 글자 요소(정규화한 글자가 같은 것 중 가장 가까운 것, 데이터 글자 포함)의
     font-size ±0.5 · font-weight 정확히 · line-height ±1 · 글자 색(hex ±1/채널, 투명도 ±0.02). 글꼴 패밀리는 보지 않는다.
  C 색·테두리: 시안 블록 인스턴스 ↔ 앱 블록 요소(같은 이름 n번째)의 배경색 · 변별 테두리 두께(±0.5)·색 · 모서리(시안과 같아야, 시안은 0).
  Z 크기·위치: 같은 쌍의 x·y·w·h ±2(세로 HUG 블록 높이 · 가로 HUG 블록 폭은 ±4).
  V 픽셀: 시안 PNG(/v1/images scale=1) ↔ 앱 스크린샷(같은 뷰포트, 샘플 띠 제거) — 흐림(글꼴 차이 완화) 뒤 SSIM ≥ V_SSIM,
     채널 차이 > V_DIFF인 픽셀이 V_CELL 칸의 V_FRAC 이상인 칸을 이어 붙인 사각형(V_MIN_CELLS 칸 이상)을 차이 영역으로 낸다.
     비교 이미지(시안 | 앱 | 차이, 빨간 사각형) = work/_cache/impl/<slug>-<뷰포트>.png.
  I 아이콘: 시안 icon/* 인스턴스 ↔ 앱 .icon 요소, 왼쪽 위 ±4로 짝짓고 없는 것 · 남는 것을 낸다.

상태 프레임(선택): work/<slug>/impl-states.json 이 있으면 그 상태도 같은 8가지로 잰다.
  {"<05-build.json states 키, 예: 390-scroll>": {"route": "/path?view=x"(생략하면 화면 기본 경로),
                                               "actions": ["클릭할 CSS 선택자", ...](차례로 누름)}}
  뷰포트 폭은 키 앞 숫자(390-… → 390), 높이는 그 상태 프레임 높이. 오류의 뷰포트 자리에 키가 그대로 들어간다.
화면별 예외는 work/<slug>/impl-allow.json {"allow": [{"error": "<오류 문자열 앞부분>", "reason": "..."}]}(사유 필수)로만.
FIGMA_TOKEN 값은 어디에도 쓰지 않는다.
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "work"
CACHE = WORK / "_cache" / "figma"
SHOTS = WORK / "_cache" / "impl"
FRAMES = ("390", "1440")
CACHE_V = 2  # 캐시 형식(필드를 늘리면 올려서 다시 받는다)
# 여러 에이전트가 동시에 게이트를 돌려도 빌드 폴더·포트가 겹치지 않게 프로세스마다 따로 쓴다
DIST = f"impl-dist-{os.getpid()}"

def _free_port():
    import socket
    with socket.socket() as so:
        so.bind(("127.0.0.1", 0))
        return so.getsockname()[1]


# ---------------------------------------------------------------- Figma


def _get(url, token):
    req = urllib.request.Request(url, headers={"X-Figma-Token": token})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def _token():
    token = os.environ.get("FIGMA_TOKEN")
    if not token:
        sys.exit("FIGMA_TOKEN 환경변수가 없어요.")
    return token


def frame_ids(slug):
    """(뷰포트 이름, 노드 id, 재현 방법) 목록: 기본 프레임 두 장 + impl-states.json에 적힌 상태 프레임."""
    build = json.loads((WORK / slug / "05-build.json").read_text(encoding="utf-8"))
    out = [(k, build["frames"][k], None) for k in FRAMES]
    sp = WORK / slug / "impl-states.json"
    if sp.exists():
        for key, how in json.loads(sp.read_text(encoding="utf-8")).items():
            nid = (build.get("states") or {}).get(key)
            if not nid:
                raise ValueError(f"impl-states.json '{key}': 05-build.json states에 없는 키예요")
            out.append((key, nid, how))
    return build, out


def fetch_figma(slug, refresh=False):
    """프레임 노드 트리 + PNG. work/_cache/figma/<slug>.json · <slug>-<id>.png에 캐시한다."""
    build, frames = frame_ids(slug)
    ids = [nid for _, nid, _ in frames]
    path = CACHE / f"{slug}.json"
    slim = None
    if path.exists() and not refresh:
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("_ids") == ids and cached.get("_v") == CACHE_V:
            slim = cached
    if slim is None:
        data = json.loads(_get(f"https://api.figma.com/v1/files/{build['file_key']}/nodes?ids={','.join(ids)}", _token()))
        # 캐시는 판정에 쓰는 필드만 남겨 작게 둔다
        slim = {"_ids": ids, "_v": CACHE_V, "nodes": {}}
        for nid, entry in data["nodes"].items():
            styles = {k: v["name"] for k, v in entry.get("styles", {}).items()}
            comps = {k: v["name"] for k, v in entry.get("components", {}).items()}
            sets = {k: v["name"] for k, v in entry.get("componentSets", {}).items()}
            comp_set = {k: v.get("componentSetId") for k, v in entry.get("components", {}).items()}
            slim["nodes"][nid] = {"document": _slim(entry["document"]), "styles": styles,
                                  "components": comps, "componentSets": sets, "componentSet": comp_set}
        CACHE.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(slim, ensure_ascii=False), encoding="utf-8")
    pngs = {nid: CACHE / f"{slug}-{nid.replace(':', '-')}.png" for nid in ids}
    need = [nid for nid, p in pngs.items() if refresh or not p.exists()]
    if need:
        urls = json.loads(_get(f"https://api.figma.com/v1/images/{build['file_key']}?ids={','.join(need)}&scale=1&format=png", _token()))["images"]
        for nid in need:
            if urls.get(nid):
                pngs[nid].write_bytes(urllib.request.urlopen(urls[nid], timeout=180).read())
    return slim, frames, pngs


KEEP = ("id", "name", "type", "visible", "characters", "componentId", "layoutMode",
        "layoutSizingHorizontal", "layoutSizingVertical", "absoluteBoundingBox", "styles",
        "fills", "strokes", "strokeWeight", "individualStrokeWeights", "cornerRadius", "rectangleCornerRadii",
        "style", "opacity", "characterStyleOverrides", "styleOverrideTable")


def _slim(n):
    out = {k: n[k] for k in KEEP if k in n}
    for k in ("fills", "strokes"):
        if k in out:
            out[k] = [{f: p[f] for f in ("type", "visible", "color", "opacity") if f in p} for p in out[k]]
    if n.get("children"):
        out["children"] = [_slim(c) for c in n["children"]]
    return out


def comp_name(entry, node):
    cid = node.get("componentId")
    sid = entry["componentSet"].get(cid)
    return (entry["componentSets"].get(sid) if sid else entry["components"].get(cid)) or node.get("name", "")


def comp_base(entry, node):
    """인스턴스의 컴포넌트 이름 앞부분(univ-card/v2-row → univ-card)."""
    return re.split(r"[/ ,]", comp_name(entry, node))[0]


# 구조 비교 대상 블록과 앱 표식(클래스 매핑 표). 앱에 고유 클래스가 없으면 None → 구조 미검사(notes).
BLOCKS = {
    "page-header": ".topbar, .screen-heading",  # 모바일은 화면 안 제목 줄(.screen-heading)이 page-header 자리
    "sub-nav": ".sub-nav, .wiki-anchor",
    "segmented-control": ".segmented-control, [role='tablist']",
    "filter-chip": ".filter-chip",
    "text-input": ".text-input, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), select, textarea",
    "data-table": ".data-table, table",
    "stat-tile": ".stat-tile, .stats > *, .analysis-stat-tiles > *, .stat-button",
    "univ-card": ".univ-card",
    "empty-state": ".empty-state",
    "disclaimer-note": ".disclaimer-note, .style-disclaimer",
    "warning-callout": ".warning-callout",
    "trace-accordion": ".trace-accordion",
    "promo-banner": ".promo-banner",
    "cut-dot-plot": ".result-plot",
    "region-map": ".um-map",
    "grade-trend-chart": ".trend-chart",
    "range-bar-5to9": ".grade-range",
    "susi-slot": ".susi-slot",
    "scenario-tabs": ".susi-scenarios",
    "counsel-timeline": ".counsel-timeline",
    "placement-board": ".placement-board",
    "competency-card": ".sg-card",
    "student-row-card": None,
    "judge-lane": None,
}
SHELL = {"sidebar", "tab-bar-pill", "app-bar", "sidebar-item", "sidebar-group"}

# 문구 규칙 ── 고정 UI 문구 = (A) 아래 컴포넌트 안 글자 (B) heading 스타일 글자(섹션 제목) (C) data-table 머리글.
FIXED_COMPONENTS = {"page-header", "button-primary", "button-outline", "button-pill-soft", "button-danger-text",
                    "segmented-control", "sub-nav", "filter-chip", "sidebar", "sidebar-item", "sidebar-group",
                    "tab-bar-pill", "app-bar", "text-input", "empty-state", "disclaimer-note", "warning-callout",
                    "promo-banner", "scenario-tabs", "checkbox", "mode-switch"}
HEADING_STYLES = re.compile(r"^(pc/)?heading-[1-4]$")
# 그 안의 글자는 데이터(값·이름·판정·상태)라서 빼는 컴포넌트. 이 안이면 (A)~(C)여도 뺀다(표 머리글 제외).
DATA_COMPONENTS = {"univ-card", "univ-logo", "univ-monogram", "cut-dot-plot", "region-map", "grade-trend-chart",
                   "range-bar-5to9", "susi-slot", "student-row-card", "counsel-timeline", "competency-card",
                   "competency-highlight", "competency-bar", "evidence-quote", "judge-badge", "grade-chip",
                   "data-status-badge", "placement-board", "mask-preview", "grade-input-table", "judge-lane",
                   "stat-tile", "mascot-illustration", "brand-logo", "subject-card", "trace-accordion", "toast"}
# 데이터성 글자: 숫자(점수·날짜·학년도·개수) · 대학/학과/학부/캠퍼스 이름 · "○○님" · 데모 계정("관리자 B") · 데모 학생 별칭
DATA_TEXT = re.compile(r"\d|[가-힣]{2,}(대학교|대학원|학과|학부|캠퍼스)|[가-힣]+대(\s|$)|[가-힣]+님|관리자 [A-Z](?![a-zA-Z])")
DEMO_NAMES = set("새벽 들꽃 노을 단비 햇살 바람 하늘 이슬 소나무 별빛 구름 가람 달빛 시내 바다 봄비 윤슬 여울 너울 버들 "
                 "모래 은하 안개 파도 꽃잎 서리 샘물 솔잎 민지".split())
GLYPHS = re.compile(r"[\s⌄▾▴⌃›‹>＞<→↗↘✕×✓·•…,.:()\[\]+＋\"'“”‘’!?~]")


def norm(s):
    return GLYPHS.sub("", s or "").lower()


def is_fixed_text(chars, style, comps):
    """시안 글자 하나가 '고정 UI 문구'인지. comps = 바깥→안 인스턴스 이름들."""
    t = (chars or "").strip()
    if len(norm(t)) < 2 or DATA_TEXT.search(t) or any(w in DEMO_NAMES for w in re.split(r"[\s·,]+", t)):
        return False
    if "data-table" in comps:
        return style == "table-head"  # 표는 머리글만 고정, 행 값은 데이터
    if set(comps) & DATA_COMPONENTS:
        return False
    return bool(set(comps) & FIXED_COMPONENTS) or bool(HEADING_STYLES.match(style or ""))


def solid(paints, opacity=1.0):
    """맨 위 보이는 SOLID 칠 → (r, g, b, a) 0~255 · 0~1. 없으면 None. 그라디언트·이미지는 비교하지 않는다(None)."""
    vis = [p for p in paints or [] if p.get("visible") is not False]
    if not vis or vis[-1].get("type") != "SOLID":
        return None
    p = vis[-1]
    c = p["color"]
    return (round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255), round(c.get("a", 1) * p.get("opacity", 1) * opacity, 3))


def text_style(n):
    """TEXT 노드의 (size, weight, line-height px, 색). 글자마다 스타일이 섞이면 None(F 미검사)."""
    st = dict(n.get("style") or {})
    fills = n.get("fills")
    ov = n.get("characterStyleOverrides") or []
    if ov:
        ids = set(ov) | ({0} if len(ov) < len(n.get("characters", "")) else set())
        if len(ids) > 1:
            return None
        o = (n.get("styleOverrideTable") or {}).get(str(ov[0]), {})
        st.update({k: v for k, v in o.items() if k != "fills"})
        fills = o.get("fills", fills)
    if "fontSize" not in st:
        return None
    return {"fs": st["fontSize"], "fw": st.get("fontWeight"), "lh": st.get("lineHeightPx"), "color": solid(fills, n.get("opacity", 1))}


def block_style(n, bg=None):
    """상자의 보이는 배경(제 칠이 없으면 바깥 칠 = bg) · 변별 테두리(위·오른·아래·왼) · 모서리."""
    stroke = solid(n.get("strokes"))
    if stroke:
        isw = n.get("individualStrokeWeights")
        w = [isw[k] for k in ("top", "right", "bottom", "left")] if isw else [n.get("strokeWeight", 1)] * 4
    else:
        w = [0, 0, 0, 0]
    radius = max(n.get("rectangleCornerRadii") or [n.get("cornerRadius", 0)])
    return {"bg": solid(n.get("fills"), n.get("opacity", 1)) or bg, "bw": w, "bc": stroke, "radius": radius}


BOX_TYPES = {"FRAME", "INSTANCE", "RECTANGLE", "COMPONENT", "GROUP"}


def block_candidates(n, box, bg, depth=2):
    """블록 인스턴스와 얕은 자손(2단) 상자 후보. 앱 요소가 시안 겉상자(라벨+칸) 대신 안쪽 칸일 수 있어서 가장 많이 겹치는 것과 짝짓는다."""
    st = block_style(n, bg)
    out = [{"id": n["id"], **box(n), **st}]
    if depth:
        for c in n.get("children", []):
            if c.get("visible") is not False and c["type"] in BOX_TYPES:
                out += block_candidates(c, box, st["bg"], depth - 1)
    return out


def figma_frame(entry):
    """한 프레임에서 글자·블록·아이콘·간격 측정값을 뽑는다. 좌표는 프레임 왼쪽 위 기준."""
    doc = entry["document"]
    ox, oy = doc["absoluteBoundingBox"]["x"], doc["absoluteBoundingBox"]["y"]
    texts, blocks, icons, shell = [], [], [], {}

    def box(n):
        b = n.get("absoluteBoundingBox") or {"x": ox, "y": oy, "width": 0, "height": 0}
        return {"x": b["x"] - ox, "y": b["y"] - oy, "w": b["width"], "h": b["height"]}

    def walk(n, comps, in_block, bg=None):
        if n.get("visible") is False:
            return
        if n["type"] in BOX_TYPES:
            bg = solid(n.get("fills"), n.get("opacity", 1)) or bg
        if n["type"] == "INSTANCE":
            full = comp_name(entry, n)
            base = re.split(r"[/ ,]", full)[0]
            comps = comps + (base,)
            if base in SHELL:
                shell.setdefault(base, box(n))
            if base == "icon":
                icons.append({"id": n["id"], "name": full, **box(n)})
            if not in_block and base in BLOCKS:
                blocks.append({"name": base, "id": n["id"], **box(n), "hug": n.get("layoutSizingHorizontal") == "HUG",
                               "hug_v": n.get("layoutSizingVertical") == "HUG", **block_style(n, bg),
                               "cands": block_candidates(n, box, bg)})
                in_block = True
            elif not in_block and base in SHELL:
                in_block = True  # 셸 안은 구조에서 뺀다
        if n["type"] == "TEXT":
            style = entry["styles"].get((n.get("styles") or {}).get("text"), "")
            texts.append({"id": n["id"], "chars": n.get("characters", ""), "style": style, "comps": comps,
                          "ts": text_style(n), **box(n)})
        kids = [c for c in n.get("children", []) if c.get("visible") is not False]
        if not n.get("layoutMode"):  # 자유 배치 프레임은 위→아래, 왼→오른 순
            kids = sorted(kids, key=lambda c: ((c.get("absoluteBoundingBox") or {}).get("y", 0),
                                               (c.get("absoluteBoundingBox") or {}).get("x", 0)))
        for i, c in enumerate(kids):
            if c["type"] == "INSTANCE" and comp_base(entry, c) == "page-header" and "header_gap" not in metrics:
                bottom = max((y + h for _, y, _, h in _desc_boxes(c, ox, oy)), default=None)
                if bottom is not None and i + 1 < len(kids):
                    metrics["header_gap"] = box(kids[i + 1])["y"] - bottom
            walk(c, comps, in_block, bg)

    metrics = {}
    walk(doc, (), False)
    # PC 사이드바 폭(248) 안 글자는 셸(인스턴스가 아닌 사이드바를 그린 시안도 있어서 위치로 뺀다)
    has_side = any(n.get("name", "").startswith("sidebar") for n in _iter(doc))
    side = 248 if has_side and doc["absoluteBoundingBox"]["width"] >= 1000 else 0
    content = [t for t in texts if not set(t["comps"]) & SHELL and t["w"] > 0 and t["x"] >= side]
    metrics["text_left"] = min((t["x"] for t in content), default=None)
    if "sidebar" in shell:
        metrics["sidebar"] = True
    if "app-bar" in shell:
        metrics["appbar_h"] = shell["app-bar"]["h"]
    sub = next((b for b in blocks if b["name"] == "sub-nav"), None)
    if sub:
        metrics["subnav_h"] = sub["h"]
    size = (round(doc["absoluteBoundingBox"]["width"]), round(doc["absoluteBoundingBox"]["height"]))
    return {"texts": texts, "blocks": blocks, "icons": icons, "metrics": metrics, "size": size}


def _iter(n):
    yield n
    for c in n.get("children", []):
        yield from _iter(c)


def _desc_boxes(n, ox, oy):
    for c in n.get("children", []):
        if c.get("visible") is False:
            continue
        b = c.get("absoluteBoundingBox")
        if b:
            yield b["x"] - ox, b["y"] - oy, b["width"], b["height"]
        yield from _desc_boxes(c, ox, oy)


def first_order(names):
    seen = []
    for n in names:
        if n not in seen:
            seen.append(n)
    return seen


def order_errors(fig_seq, app_seq):
    """시안 블록 첫 등장 순서 vs 앱. 없는 블록 + 둘 다 있는 블록의 순서 차이."""
    fig, app = first_order(fig_seq), first_order(app_seq)
    errs = [f"블록 없음 {b}" for b in fig if b not in app]
    common_f = [b for b in fig if b in app]
    common_a = [b for b in app if b in common_f]
    if common_f != common_a:
        errs.append(f"블록 순서 다름 시안 [{' > '.join(common_f)}] / 앱 [{' > '.join(common_a)}]")
    return errs


def within(value, expected, tol):
    return value is not None and expected is not None and abs(value - expected) <= tol


# ---------------------------------------------------------------- 앱(Playwright)

ROUTE_QUERY = {"univ-detail": "?u=경희대학교", "univ-detail-wiki": "?u=경희대학교", "program-detail": "?u=경희대학교&p=학생부종합"}


def route_of(slug):
    hosts = json.loads((WORK / "_data" / "screen-delivery.json").read_text(encoding="utf-8")).get("host_routes", {})
    q = ROUTE_QUERY.get(slug, "")
    if slug in hosts:
        return hosts[slug]["path"] + q
    nav = (ROOT / "app" / "src" / "shell" / "nav.ts").read_text(encoding="utf-8")
    m = re.search(rf"slug: '{re.escape(slug)}', path: '([^']+)'", nav)
    if m:
        return m.group(1) + q
    if re.search(rf"teacher\('[^']+', '{re.escape(slug)}'", nav):
        return f"/teacher/{slug}" + q
    return f"/{slug}" + q


# 앱 측정: 글자 모음 · 블록(문서 순, 가장 바깥 것만, 계산 스타일 포함) · 글자 요소(F) · 아이콘(I) · 간격
MEASURE_JS = """(sel) => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const skip = e => e.closest('.sidebar, .tab-bar-pill, .appbar, [role=dialog]');
  const sy = window.scrollY, R = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + sy, w: r.width, h: r.height }; };
  const attrs = [...document.querySelectorAll('[placeholder],[aria-label],[title],[alt],input,select,button')].filter(vis)
    .map(e => [e.getAttribute('placeholder'), e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('alt'), e.type !== 'hidden' ? e.value : ''].join('\\n'));
  const text = document.body.innerText + '\\n' + attrs.join('\\n');
  const all = [];
  for (const k of Object.keys(sel).filter(k => sel[k])) for (const e of document.querySelectorAll(sel[k])) if (vis(e) && !skip(e)) all.push([k, e]);
  const matched = new Set(all.map(([, e]) => e));
  const top = all.filter(([, e]) => { for (let p = e.parentElement; p; p = p.parentElement) if (matched.has(p)) return false; return true; });
  top.sort((a, b) => a[1] === b[1] ? 0 : (a[1].compareDocumentPosition(b[1]) & 4 ? -1 : 1));
  const px = v => parseFloat(v) || 0;
  const paint = e => { for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; };
  const blocks = top.map(([k, e]) => { const s = getComputedStyle(e); return { name: k, ...R(e), bg: paint(e),
    bw: [px(s.borderTopWidth), px(s.borderRightWidth), px(s.borderBottomWidth), px(s.borderLeftWidth)],
    bc: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor],
    radius: Math.max(px(s.borderTopLeftRadius), px(s.borderTopRightRadius), px(s.borderBottomRightRadius), px(s.borderBottomLeftRadius)) }; });
  // 글자 요소: 바로 아래에 글자가 있는 보이는 요소. innerText는 같은 줄 안쪽 글자까지(시안 TEXT 하나 = 앱 요소 하나로 본다)
  const els = new Set(); const w0 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w0.nextNode());) if (n.textContent.trim() && n.parentElement) els.add(n.parentElement);
  const texts = [...els].filter(vis).map(e => { const s = getComputedStyle(e); return { t: e.innerText, ...R(e), fs: px(s.fontSize),
    fw: parseInt(s.fontWeight), lh: s.lineHeight === 'normal' ? null : px(s.lineHeight), color: s.color }; });
  const icons = [...document.querySelectorAll('.icon')].filter(vis).map(R);
  const textBoxes = root => { const out = []; if (!root) return out; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const el = n.parentElement; if (!n.textContent.trim() || !vis(el) || skip(el)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0) out.push({ x: r.left, y: r.top + sy }); } return out; };
  const content = document.querySelector('.shell__content') || document.body, topbar = document.querySelector('.topbar');
  const showTop = topbar && vis(topbar);
  const tb = textBoxes(content).concat(showTop ? textBoxes(topbar) : []);
  const m = { text_left: tb.length ? Math.min(...tb.map(t => t.x)) : null };
  const q = s => { const e = document.querySelector(s); return e && vis(e) ? e.getBoundingClientRect() : null; };
  const side = q('.sidebar'), app = q('.appbar'), sub = q('.sub-nav');
  if (side) m.sidebar_w = side.width; if (app) m.appbar_h = app.height; if (sub) m.subnav_h = sub.height;
  if (showTop) {
    const tt = textBoxes(topbar);
    // Figma TEXT 상자 = 줄 상자. 글자 영역(range rect)에서 반쪽 행간을 빼 줄 상자 위끝으로 잰다(경로 글자 없는 화면의 3px 오탐 방지)
    const lineTops = [...topbar.querySelectorAll('*')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      // 글자를 직접 가진 블록의 내용 상자 위끝 = 첫 줄 상자 위끝. 인라인이면 줄 상자를 알 수 없어 글자 영역 위끝을 쓴다
      return (s.display === 'inline' ? r.top : r.top + px(s.paddingTop) + px(s.borderTopWidth)) + sy; });
    m.header_top = lineTops.length ? Math.min(...lineTops) : (tt.length ? Math.min(...tt.map(t => t.y)) : null);
    m.header_left = tt.length ? Math.min(...tt.map(t => t.x)) : null;
    const bottom = Math.max(...[...topbar.querySelectorAll('*')].filter(vis).map(e => e.getBoundingClientRect().bottom + sy));
    m.header_pad = topbar.getBoundingClientRect().bottom + sy - parseFloat(getComputedStyle(topbar).borderBottomWidth) - bottom;
    const tops = [...content.querySelectorAll('*')].filter(e => vis(e) && !skip(e) && getComputedStyle(e).position !== 'fixed').map(e => e.getBoundingClientRect().top + sy);
    m.header_gap = tops.length ? Math.min(...tops) - bottom : null;
  }
  return { text, blocks, texts, icons, metrics: m };
}"""


# 앱 샘플 모드(app/src/data/sample, initSample): 플래그가 비어 있고 저장소가 비면 학생·교사·관리자 샘플을 넣고 'on'으로 바꾼다.
# 'on'을 미리 넣으면 initSample이 적재를 건너뛰므로 플래그는 비워 두고 앱이 켜게 한다. seen-about은 /about 보내기를 막는다.
SAMPLE_INIT_JS = "localStorage.setItem('jinhak-navi-seen-about', '1')"


def seed_app(page, url):
    """게이트의 유일한 시드 지점. 저장소를 비우고 앱을 열어 첫 실행 샘플 적재(localStorage jinhak-navi-sample = 'on')를 기다린다."""
    page.goto(url + "/about", wait_until="networkidle", timeout=180_000)  # 같은 출처에서 저장소를 비우려고 먼저 연다
    page.wait_for_function("localStorage.getItem('jinhak-navi-sample') !== null", timeout=60_000)  # 이 첫 적재가 끝난 뒤 비워야 섞이지 않는다
    page.evaluate("""async () => { localStorage.clear(); sessionStorage.clear();
      await Promise.all((await indexedDB.databases()).map(d => new Promise(r => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = r; }))); }""")
    page.context.add_init_script(SAMPLE_INIT_JS)
    page.goto(url + "/", wait_until="networkidle", timeout=180_000)
    page.wait_for_function("localStorage.getItem('jinhak-navi-sample') === 'on'", timeout=60_000)


class App:
    """앱 빌드 스냅샷(work/_cache/impl-dist) + vite preview + Playwright. 다른 세션이 src를 고쳐도 측정 중 화면이 바뀌지 않게
    dev 서버 대신 빌드본을 쓴다. 시드는 한 번, 화면마다 뷰포트별로 잰다."""

    def __init__(self, url=None, port=None):
        import subprocess
        self.proc = None
        port = port or _free_port()
        self.url = url or f"http://localhost:{port}"
        if not url:
            # node로 바로 부른다(cmd·npx를 거치면 한글 경로에서 vite가 죽음). 출력 폴더는 상대 경로.
            vite = ["node", "node_modules/vite/bin/vite.js"]
            dist = ["--outDir", f"../work/_cache/{DIST}"]
            r = subprocess.run(vite + ["build", *dist, "--emptyOutDir", "--logLevel", "error"], cwd=os.path.relpath(ROOT / "app"), capture_output=True)
            if r.returncode:
                raise RuntimeError("앱 빌드 실패: " + r.stderr.decode("utf-8", "replace")[-500:])
            self.proc = subprocess.Popen(vite + ["preview", *dist, "--port", str(port), "--strictPort"], cwd=os.path.relpath(ROOT / "app"),
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self._wait()
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch()
        self.ctx = self.browser.new_context(viewport={"width": 1440, "height": 900}, locale="ko-KR")
        self.page = self.ctx.new_page()
        seed_app(self.page, self.url)

    def _wait(self):
        import time
        for _ in range(120):
            try:
                urllib.request.urlopen(self.url, timeout=2)
                return
            except Exception:
                time.sleep(1)
        raise RuntimeError("vite preview 서버가 뜨지 않았어요.")

    def _settle(self):
        # 자료를 비동기로 읽는 화면이 많아서, 글자가 1.2초 동안 그대로일 때까지(최대 15초) 기다린다
        p, last, same = self.page, None, 0
        for _ in range(50):
            p.wait_for_timeout(300)
            now = p.evaluate("document.body.innerText.length + ':' + document.querySelectorAll('*').length")
            same = same + 1 if now == last else 0
            last = now
            if same >= 4:
                break

    def measure(self, route, size, actions=()):
        """(측정값, 스크린샷 PNG 바이트). size = 시안 프레임 (폭, 높이). 화면 한 장 크기 프레임이면 뷰포트 = 프레임,
        긴(스크롤) 프레임이면 뷰포트 = 기기 높이 + 전체 페이지 스크린샷(고정 탭바가 폰처럼 첫 화면 아래에 있게)."""
        p = self.page
        vh = viewport_h(size)
        p.set_viewport_size({"width": size[0], "height": vh})
        # 교사 화면을 한 번 열면 학생 화면도 교사 셸로 남는다(workspace.ts). 시안은 화면마다 제 셸이라 매번 지운다.
        p.evaluate("sessionStorage.clear()")
        p.goto(self.url + route, wait_until="networkidle", timeout=120_000)
        self._settle()
        for sel in actions:
            p.click(sel, timeout=10_000)
            self._settle()
        # 샘플 데이터 띠는 시안에 없는, 사용자가 요청한 앱 전용 요소라 재기 전에 빼고 본다(2026-11-24 사용자 결정)
        p.evaluate("document.querySelectorAll('.sample-band').forEach(e => e.remove()); window.scrollTo(0, 0)")
        p.wait_for_timeout(200)
        shot = p.screenshot(animations="disabled", caret="hide", full_page=size[1] > vh)
        return p.evaluate(MEASURE_JS, BLOCKS), shot

    def close(self):
        import subprocess
        self.browser.close()
        self.pw.stop()
        if self.proc:
            subprocess.run(f"taskkill /PID {self.proc.pid} /T /F", shell=True, capture_output=True)


# ---------------------------------------------------------------- 비교

TOL_SHELL = 2
TOL_FS, TOL_LH, TOL_RGB, TOL_A = 0.5, 1, 1, 0.02
TOL_Z, TOL_Z_HUG, TOL_ICON, TOL_BW = 2, 4, 4, 0.5
SHORT_TEXT_REACH = 120
DEVICE_H = {390: 844, 1440: 900}  # 시안 프레임이 이보다 많이 길면(스크롤 화면) 뷰포트는 기기 높이, 스크린샷은 전체 페이지
# V 기준(근거: 2026-11-24 G5 통과 6화면 home·doelgak·univ-score·susiro·login·signup 실측 — impl-audit-2026-11-24.md "엄격 게이트 재검사")
V_BLUR, V_SSIM, V_DIFF, V_CELL, V_FRAC, V_MIN_CELLS = 1.5, 0.88, 48, 8, 0.2, 6


def has_text(lines, chars):
    """시안 글자(여러 줄이면 줄마다)가 앱의 한 줄 안에 들어 있는지. 줄을 이어 붙여 우연히 맞는 걸 막는다."""
    return all(any(norm(part) in line for line in lines) for part in chars.split("\n") if norm(part))


def text_errors(fig, app_text, v):
    lines, missing = [norm(x) for x in app_text.split("\n") if norm(x)], []
    for t in fig["texts"]:
        if is_fixed_text(t["chars"], t["style"], t["comps"]) and not has_text(lines, t["chars"]):
            s = " ".join(t["chars"].split())
            if s not in missing:
                missing.append(s)
    return [f"T {v}: 문구 없음 '{s}'" for s in missing]


def spacing_errors(fig, app, width, v=None):
    """P: 셸 수치 + 본문 왼쪽 여백. 블록 x·폭은 Z(±2)가 본다."""
    v, errs = v or f"{width}", []
    fm, am = fig["metrics"], app["metrics"]
    names = {b["name"] for b in fig["blocks"]}

    def need(key, expected, tol, label):
        if not within(am.get(key), expected, tol):
            errs.append(f"P {v}: {label} {_r(am.get(key))} (기준 {_r(expected)}±{tol})")

    if width >= 1000:
        if "sidebar" in fm:
            need("sidebar_w", 248, TOL_SHELL, "사이드바 폭")
        if "page-header" in names:
            need("header_top", 32, TOL_SHELL, "page-header 위 여백")
            need("header_left", 280, TOL_SHELL, "page-header 왼쪽(사이드바 248+패딩 32)")
            need("header_pad", 24, TOL_SHELL, "page-header 아래 여백")
            if "header_gap" in fm:  # design.md는 "아래 24 뒤 첫 카드"만 정해서, 첫 블록까지 거리는 시안 실측을 기준으로 둔다
                need("header_gap", fm["header_gap"], TOL_SHELL, "page-header 글자→첫 블록 간격(시안)")
    else:
        if "appbar_h" in fm:
            need("appbar_h", 56, TOL_SHELL, "app-bar 높이")
        if "subnav_h" in fm:
            need("subnav_h", 44, TOL_SHELL, "sub-nav 높이")
    need("text_left", fm.get("text_left"), TOL_SHELL, "본문 왼쪽 여백(시안)")
    return errs


def css_rgba(s):
    """'rgb(1, 2, 3)' · 'rgba(1, 2, 3, 0.5)' → (r, g, b, a). 투명은 None."""
    m = re.match(r"rgba?\(([^)]+)\)", s or "")
    if not m:
        return None
    p = [float(x) for x in re.split(r"[,\s/]+", m.group(1).strip()) if x]
    rgba = (round(p[0]), round(p[1]), round(p[2]), round(p[3] if len(p) > 3 else 1.0, 3))
    return None if rgba[3] == 0 else rgba


def hexa(c):
    if c is None:
        return "없음"
    h = "#%02x%02x%02x" % c[:3]
    return h if c[3] >= 0.995 else f"{h}/{c[3]:.2f}"


def same_color(a, b):
    if a is None or b is None:
        return a is None and b is None
    return all(abs(x - y) <= TOL_RGB for x, y in zip(a[:3], b[:3])) and abs(a[3] - b[3]) <= TOL_A


def _short(s, n=24):
    s = " ".join((s or "").split())
    return s if len(s) <= n else s[:n] + "…"


def match_texts(fig_texts, app_texts):
    """시안 TEXT ↔ 앱 글자 요소: 정규화 글자가 같은 것끼리, 왼쪽 위가 가까운 쌍부터 하나씩(겹쳐 쓰지 않음)."""
    by = {}
    for i, a in enumerate(app_texts):
        k = norm(a["t"])
        if k:
            by.setdefault(k, []).append(i)
    pairs = []
    for fi, f in enumerate(fig_texts):
        for ai in by.get(norm(f["chars"]), []) if norm(f["chars"]) else []:
            a = app_texts[ai]
            d = abs(a["x"] - f["x"]) + abs(a["y"] - f["y"])
            if len(norm(f["chars"])) >= 3 or d <= SHORT_TEXT_REACH:  # 숫자 하나 같은 짧은 글자는 먼 곳의 같은 글자와 짝짓지 않는다
                pairs.append((d, fi, ai))
    used_f, used_a, out = set(), set(), []
    for _, fi, ai in sorted(pairs):
        if fi not in used_f and ai not in used_a:
            used_f.add(fi), used_a.add(ai)
            out.append((fig_texts[fi], app_texts[ai]))
    return out


def typo_errors(fig, app, v):
    """F: 짝지은 글자마다 크기 · 굵기 · 줄높이 · 색."""
    errs = []
    for f, a in match_texts([t for t in fig["texts"] if t.get("ts") and t["w"] > 0], app.get("texts", [])):
        ts, bad = f["ts"], []
        if not within(a["fs"], ts["fs"], TOL_FS):
            bad.append(f"font-size {a['fs']:g} (시안 {ts['fs']:g}±{TOL_FS})")
        if ts["fw"] is not None and a["fw"] != ts["fw"]:
            bad.append(f"font-weight {a['fw']} (시안 {ts['fw']})")
        if ts["lh"] is not None and not within(a["lh"], ts["lh"], TOL_LH):
            bad.append(f"line-height {'normal' if a['lh'] is None else round(a['lh'], 1)} (시안 {round(ts['lh'], 1)}±{TOL_LH})")
        if ts["color"] is not None and not same_color(css_rgba(a["color"]), ts["color"]):
            bad.append(f"색 {hexa(css_rgba(a['color']))} (시안 {hexa(ts['color'])})")
        if bad:
            errs.append(f"F {v} #{f['id']}: '{_short(f['chars'])}' " + " · ".join(bad))
    return errs


def pair_blocks(fig, app):
    """같은 이름 블록을 나온 순서대로 n번째끼리 짝짓는다(앱 블록은 문서 순)."""
    seen, pairs = {}, []
    abyname = {}
    for b in app["blocks"]:
        abyname.setdefault(b["name"], []).append(b)
    for b in fig["blocks"]:
        if not BLOCKS.get(b["name"]):
            continue
        k = seen.get(b["name"], 0)
        seen[b["name"]] = k + 1
        if k < len(abyname.get(b["name"], [])):
            a = abyname[b["name"]][k]
            cands = b.get("cands") or [b]
            # 가장 많이 겹치는 상자, 같으면 안쪽(뒤) 것 — 겉상자와 같은 크기의 안쪽 "field" 프레임이 칠을 가진 경우
            i = max(range(len(cands)), key=lambda j: (round(iou(cands[j], a), 2), j))
            if iou(cands[i], a) == 0:  # 겹치는 게 없으면(위치가 크게 어긋남) 블록 겉상자 그대로
                i = 0
            f = b if i == 0 else {**b, **cands[i]}
            if i:  # 안쪽 상자와 짝지으면 HUG 여부는 모른다 → ±2
                f = {**f, "hug": False, "hug_v": False}
            pairs.append((f, a, k + 1))
    return pairs


def iou(p, q):
    ix = max(0, min(p["x"] + p["w"], q["x"] + q["w"]) - max(p["x"], q["x"]))
    iy = max(0, min(p["y"] + p["h"], q["y"] + q["h"]) - max(p["y"], q["y"]))
    inter = ix * iy
    union = p["w"] * p["h"] + q["w"] * q["h"] - inter
    return inter / union if union > 0 else 0


def color_errors(fig, app, v):
    """C: 블록 배경 · 변별 테두리 · 모서리."""
    errs, sides = [], ("위", "오른", "아래", "왼")
    for f, a, k in pair_blocks(fig, app):
        bad = []
        if not same_color(css_rgba(a["bg"]), f["bg"]):
            bad.append(f"배경 {hexa(css_rgba(a['bg']))} (시안 {hexa(f['bg'])})")
        for i, side in enumerate(sides):
            fw, aw = f["bw"][i], a["bw"][i]
            if abs(fw - aw) > TOL_BW:
                bad.append(f"테두리 {side} {aw:g}px (시안 {fw:g}px)")
            elif fw > 0 and not same_color(css_rgba(a["bc"][i]), f["bc"]):
                bad.append(f"테두리 {side} 색 {hexa(css_rgba(a['bc'][i]))} (시안 {hexa(f['bc'])})")
        if abs(a["radius"] - f["radius"]) > TOL_BW:
            bad.append(f"모서리 {a['radius']:g} (시안 {f['radius']:g})")
        if bad:
            errs.append(f"C {v} #{f['id']}: {f['name']}[{k}] " + " · ".join(bad))
    return errs


def size_errors(fig, app, v, width=390):
    """Z: 블록 x · y · w · h ±2(HUG 쪽 크기는 ±4). PC page-header는 .topbar 상자가 패딩을 품어서 P(글자 위치)로 본다."""
    errs = []
    for f, a, k in pair_blocks(fig, app):
        if width >= 1000 and f["name"] == "page-header":
            continue
        bad = []
        for key, tol in (("x", TOL_Z), ("y", TOL_Z), ("w", TOL_Z_HUG if f["hug"] else TOL_Z), ("h", TOL_Z_HUG if f.get("hug_v") else TOL_Z)):
            if not within(a[key], f[key], tol):
                bad.append(f"{key} {_r(a[key])} (시안 {_r(f[key])}±{tol})")
        if bad:
            errs.append(f"Z {v} #{f['id']}: {f['name']}[{k}] " + " · ".join(bad))
    return errs


def icon_errors(fig, app, v):
    """I: 시안 아이콘마다 왼쪽 위 ±4 안의 앱 .icon 하나(가까운 것부터), 남는 앱 아이콘도 낸다."""
    app_icons = list(app.get("icons", []))
    pairs = sorted((abs(a["x"] - f["x"]) + abs(a["y"] - f["y"]), fi, ai)
                   for fi, f in enumerate(fig["icons"]) for ai, a in enumerate(app_icons)
                   if abs(a["x"] - f["x"]) <= TOL_ICON and abs(a["y"] - f["y"]) <= TOL_ICON)
    used_f, used_a = set(), set()
    for _, fi, ai in pairs:
        if fi not in used_f and ai not in used_a:
            used_f.add(fi), used_a.add(ai)
    errs = []
    if len(app_icons) != len(fig["icons"]):
        errs.append(f"I {v}: 아이콘 개수 {len(app_icons)} (시안 {len(fig['icons'])})")
    for fi, f in enumerate(fig["icons"]):
        if fi not in used_f:
            errs.append(f"I {v} #{f['id']}: 아이콘 없음 {f['name']} x {_r(f['x'])} y {_r(f['y'])} {_r(f['w'])}×{_r(f['h'])} (±{TOL_ICON})")
    for ai, a in enumerate(app_icons):
        if ai not in used_a:
            errs.append(f"I {v}: 시안에 없는 아이콘 x {_r(a['x'])} y {_r(a['y'])} {_r(a['w'])}×{_r(a['h'])}")
    return errs


# ---- V 픽셀 비교(numpy · Pillow)


def _box_mean(a, k):
    """k×k 창 평균(valid). 적분 영상으로 계산한다."""
    import numpy as np
    c = np.pad(a, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def ssim(x, y, k=7):
    """회색조 두 장(같은 크기 float 0~255)의 평균 SSIM."""
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    mx, my = _box_mean(x, k), _box_mean(y, k)
    vx, vy = _box_mean(x * x, k) - mx * mx, _box_mean(y * y, k) - my * my
    cxy = _box_mean(x * y, k) - mx * my
    return float((((2 * mx * my + c1) * (2 * cxy + c2)) / ((mx * mx + my * my + c1) * (vx + vy + c2))).mean())


def diff_regions(a, b, thr=V_DIFF, cell=V_CELL, frac=V_FRAC, min_cells=V_MIN_CELLS):
    """RGB 두 장(H×W×3 float) → 차이 영역 사각형 [(x, y, w, h)] 넓은 것부터. 칸(cell) 단위로 이어 붙인다."""
    import numpy as np
    d = (np.abs(a - b).max(axis=2) > thr).astype(float)
    gh, gw = d.shape[0] // cell, d.shape[1] // cell
    grid = d[:gh * cell, :gw * cell].reshape(gh, cell, gw, cell).mean(axis=(1, 3)) > frac
    seen, out = np.zeros_like(grid), []
    for sy, sx in zip(*np.nonzero(grid)):
        if seen[sy, sx]:
            continue
        stack, cells = [(sy, sx)], []
        seen[sy, sx] = True
        while stack:
            y, x = stack.pop()
            cells.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < gh and 0 <= nx < gw and grid[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(cells) >= min_cells:
            ys, xs = [c[0] for c in cells], [c[1] for c in cells]
            out.append((min(xs) * cell, min(ys) * cell, (max(xs) - min(xs) + 1) * cell, (max(ys) - min(ys) + 1) * cell))
    return sorted(out, key=lambda r: -r[2] * r[3])


def pixel_compare(fig_png, app_png, size):
    """(SSIM, 차이 영역, 시안 RGB, 앱 RGB). 시안 PNG는 프레임 크기로 자르거나 흰 바탕으로 채운다."""
    import io
    import numpy as np
    from PIL import Image, ImageFilter

    def load(raw):
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        if im.size != size:
            canvas = Image.new("RGB", size, "white")
            canvas.paste(im.crop((0, 0, min(im.width, size[0]), min(im.height, size[1]))))
            im = canvas
        return im

    fi, ai = load(fig_png), load(app_png)
    fb, ab = (np.asarray(im.filter(ImageFilter.GaussianBlur(V_BLUR)), dtype=float) for im in (fi, ai))
    gray = lambda x: x @ np.array([0.299, 0.587, 0.114])
    return ssim(gray(fb), gray(ab)), diff_regions(fb, ab), fi, ai


def save_compare(fi, ai, rects, path):
    """시안 | 앱 | 차이(밝을수록 다름) 세 칸, 차이 영역은 앱 · 차이 칸에 빨간 사각형."""
    import numpy as np
    from PIL import Image, ImageDraw
    w, h, gap = fi.width, fi.height, 8
    diff = np.abs(np.asarray(fi, dtype=int) - np.asarray(ai, dtype=int)).max(axis=2)
    heat = Image.fromarray((255 - np.clip(diff * 3, 0, 255)).astype("uint8")).convert("RGB")
    out = Image.new("RGB", (w * 3 + gap * 2, h), (255, 0, 255))
    for i, im in enumerate((fi, ai, heat)):
        out.paste(im, (i * (w + gap), 0))
    dr = ImageDraw.Draw(out)
    for x, y, rw, rh in rects:
        for col in (1, 2):
            ox = col * (w + gap)
            dr.rectangle((ox + x, y, ox + x + rw - 1, y + rh - 1), outline=(230, 0, 0), width=2)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path)


def pixel_errors(fig_png, app_png, size, v, img_path):
    if not fig_png:
        return [f"V {v}: 시안 PNG를 받지 못해 픽셀 비교를 못 했어요"], None
    score, rects, fi, ai = pixel_compare(fig_png, app_png, size)
    save_compare(fi, ai, rects, img_path)
    errs = [] if score >= V_SSIM else [f"V {v}: 화면 SSIM {score:.3f} (기준 ≥{V_SSIM})"]
    errs += [f"V {v}: 차이 영역 x {x} y {y} {w}×{h}" for x, y, w, h in rects[:12]]
    if len(rects) > 12:
        errs.append(f"V {v}: 차이 영역 외 {len(rects) - 12}곳")
    return errs, round(score, 4)


def compare(fig, app, width, v=None):
    """한 뷰포트 비교(V 제외) → 오류 문자열 목록. fig = figma_frame(), app = MEASURE_JS 결과."""
    v = v or f"{width}"
    fseq = [b["name"] for b in fig["blocks"] if BLOCKS.get(b["name"])]
    aseq = [b["name"] for b in app["blocks"]]
    return (text_errors(fig, app["text"], v)
            + [f"S {v}: {e}" for e in order_errors(fseq, aseq)]
            + spacing_errors(fig, app, width, v)
            + typo_errors(fig, app, v)
            + color_errors(fig, app, v)
            + size_errors(fig, app, v, width)
            + icon_errors(fig, app, v))


def _r(x):
    return None if x is None else round(x)


def viewport_h(size):
    dev = DEVICE_H.get(size[0], 900)
    return size[1] if size[1] <= dev * 1.35 else dev


def apply_allow(slug, errors):
    path = WORK / slug / "impl-allow.json"
    if not path.exists():
        return errors, []
    rules = json.loads(path.read_text(encoding="utf-8")).get("allow", [])
    for r in rules:
        if not str(r.get("reason", "")).strip():
            raise ValueError(f"{path}: allow 항목에 사유(reason)가 없어요: {r.get('error')}")
    kept, allowed = [], []
    for e in errors:
        hit = next((r for r in rules if e.startswith(r["error"])), None)
        if hit:
            allowed.append({"error": e, "reason": hit["reason"]})
        else:
            kept.append(e)
    return kept, allowed


def check(slug, app, refresh=False):
    data, frames, pngs = fetch_figma(slug, refresh)
    route = route_of(slug)
    errors, notes, extra = [], [], {"images": {}, "ssim": {}}
    for key, nid, how in frames:
        fig = figma_frame(data["nodes"][nid])
        width = int(re.match(r"\d+", key).group())
        if how is None:
            unmapped = sorted({b["name"] for b in fig["blocks"] if not BLOCKS.get(b["name"])})
            if unmapped:
                notes.append(f"{key}: 앱 표식 없는 블록(구조 미검사) {', '.join(unmapped)}")
        try:
            args = ((how or {}).get("route") or route, (width, fig["size"][1]), (how or {}).get("actions", []))
            measured, shot = app.measure(*args)
            if not measured["text"].strip():  # 가끔 빈 화면으로 찍힌다(렌더 늦음) — 한 번 더 잰다
                measured, shot = app.measure(*args)
        except Exception as e:  # 상태 재현(클릭) 실패는 그 상태만 실패로
            errors.append(f"S {key}: 상태 재현 실패 {str(e).splitlines()[0][:120]}")
            continue
        errors += compare(fig, measured, width, key)
        img = SHOTS / f"{slug}-{key}.png"
        png = pngs[nid].read_bytes() if pngs[nid].exists() else None
        verrs, score = pixel_errors(png, shot, (width, fig["size"][1]), key, img)
        errors += verrs
        extra["images"][key] = img.relative_to(ROOT).as_posix() if img.exists() else None
        extra["ssim"][key] = score
        matched = len(match_texts([t for t in fig["texts"] if t.get("ts") and t["w"] > 0], measured.get("texts", [])))
        notes.append(f"{key}: F 글자 짝 {matched}/{sum(1 for t in fig['texts'] if t['w'] > 0)} (짝 없는 글자는 T만 본다)")
    return route, errors, notes, extra


def record(slug, route, errors, notes, extra=None):
    errors, allowed = apply_allow(slug, errors)
    out_path = WORK / slug / "07-impl.json"
    passed = not errors
    streak = 0
    if not passed:
        prev = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
        streak = prev.get("same_fail_streak", 0) + 1 if sorted(prev.get("errors", [])) == sorted(errors) else 1
    result = {"slug": slug, "gate": "G5", "pass": passed, "errors": errors, "back_to": None if passed else "S5",
              "same_fail_streak": streak, "route": route, "allowed": allowed, "notes": notes, **(extra or {})}
    if slug in IN_PROGRESS:
        result["status"] = IN_PROGRESS[slug]
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


# 다른 작업이 지금 다시 구현하는 화면: 전수조사 맨 끝에 돌리고 결과에 표시한다
IN_PROGRESS = {}  # 재구현 중인 화면 표시(slug: 사유). doelgak은 2026-11-24 G5 통과로 뺌


def all_slugs():
    screens = json.loads((ROOT / "rules" / "design-rules.json").read_text(encoding="utf-8"))["screens"]
    slugs = list(screens.values()) if isinstance(screens, dict) else list(screens)
    return sorted(slugs, key=lambda x: x in IN_PROGRESS)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    url = args[args.index("--url") + 1] if "--url" in args else None
    slugs = all_slugs() if "--all" in args else [a for a in args if not a.startswith("--") and a != url]
    app = App(url)
    results, ok = [], True
    try:
        for slug in slugs:
            if not (WORK / slug / "05-build.json").exists():
                r = {"slug": slug, "gate": "G5", "pass": None, "errors": ["05-build.json 없음 — 최종 시안이 없어 검사하지 않음"], "back_to": None}
            else:
                try:
                    r = record(slug, *check(slug, app, "--refresh" in args))
                except Exception as e:  # 한 화면 실패가 전수조사를 멈추지 않게
                    r = {"slug": slug, "gate": "G5", "pass": False, "errors": [f"게이트 실행 오류: {e}"], "back_to": "S5"}
            if slug in IN_PROGRESS:
                r.setdefault("status", IN_PROGRESS[slug])
            ok = ok and r["pass"] is not False
            results.append(r)
            print(json.dumps(r, ensure_ascii=False, indent=2) if len(slugs) == 1 else
                  f"{slug}: {'통과' if r['pass'] else ('건너뜀' if r['pass'] is None else '실패')} {len(r['errors'])}", flush=True)
    finally:
        app.close()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
