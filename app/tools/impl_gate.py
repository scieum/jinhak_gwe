"""G5 시안↔코드 구현 일치 게이트: Figma 최종 화면(05-build.json 기본 프레임 390·1440)과 앱 렌더를 비교한다.

사용: python app/tools/impl_gate.py <slug> | --all [--refresh]
종료코드 0 = 통과. 결과는 work/<slug>/07-impl.json(same_fail_streak 포함).

검사 3가지(데이터 값은 비교하지 않는다 — 시안은 데모 데이터, 앱은 실제/시드 데이터):
  T 문구: 시안 고정 UI 문구가 앱 화면 글자(innerText·placeholder·aria-label)에 있어야 한다. 규칙은 is_fixed_text().
  S 구조: 시안 위→아래 주요 블록(BLOCKS) 첫 등장 순서가 앱과 같고, 시안 블록이 앱에 있어야 한다.
  P 간격: design.md 셸 수치(SHELL) ±2px, 시안 주요 블록 x·폭 ±4px.
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
FRAMES = ("390", "1440")

# ---------------------------------------------------------------- Figma


def fetch_figma(slug, refresh=False):
    """05-build.json 기본 프레임 두 장의 노드 트리. work/_cache/figma/<slug>.json에 캐시한다."""
    build = json.loads((WORK / slug / "05-build.json").read_text(encoding="utf-8"))
    ids = [build["frames"][k] for k in FRAMES]
    path = CACHE / f"{slug}.json"
    if path.exists() and not refresh:
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("_ids") == ids:
            return cached, ids
    token = os.environ.get("FIGMA_TOKEN")
    if not token:
        sys.exit("FIGMA_TOKEN 환경변수가 없어요.")
    url = f"https://api.figma.com/v1/files/{build['file_key']}/nodes?ids={','.join(ids)}"
    req = urllib.request.Request(url, headers={"X-Figma-Token": token})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    # 캐시는 판정에 쓰는 필드만 남겨 작게 둔다
    slim = {"_ids": ids, "nodes": {}}
    for nid, entry in data["nodes"].items():
        styles = {k: v["name"] for k, v in entry.get("styles", {}).items()}
        comps = {k: v["name"] for k, v in entry.get("components", {}).items()}
        sets = {k: v["name"] for k, v in entry.get("componentSets", {}).items()}
        comp_set = {k: v.get("componentSetId") for k, v in entry.get("components", {}).items()}
        slim["nodes"][nid] = {"document": _slim(entry["document"]), "styles": styles,
                              "components": comps, "componentSets": sets, "componentSet": comp_set}
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(slim, ensure_ascii=False), encoding="utf-8")
    return slim, ids


KEEP = ("id", "name", "type", "visible", "characters", "componentId", "layoutMode",
        "layoutSizingHorizontal", "absoluteBoundingBox", "styles")


def _slim(n):
    out = {k: n[k] for k in KEEP if k in n}
    if n.get("children"):
        out["children"] = [_slim(c) for c in n["children"]]
    return out


def comp_base(entry, node):
    """인스턴스의 컴포넌트 이름 앞부분(univ-card/v2-row → univ-card)."""
    cid = node.get("componentId")
    sid = entry["componentSet"].get(cid)
    name = entry["componentSets"].get(sid) if sid else entry["components"].get(cid)
    return re.split(r"[/ ,]", name or node.get("name", ""))[0]


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


def figma_frame(entry):
    """한 프레임에서 글자·블록·간격 측정값을 뽑는다. 좌표는 프레임 왼쪽 위 기준."""
    doc = entry["document"]
    ox, oy = doc["absoluteBoundingBox"]["x"], doc["absoluteBoundingBox"]["y"]
    texts, blocks, shell = [], [], {}

    def box(n):
        b = n.get("absoluteBoundingBox") or {"x": ox, "y": oy, "width": 0, "height": 0}
        return {"x": b["x"] - ox, "y": b["y"] - oy, "w": b["width"], "h": b["height"]}

    def walk(n, comps, in_block):
        if n.get("visible") is False:
            return
        if n["type"] == "INSTANCE":
            base = comp_base(entry, n)
            comps = comps + (base,)
            if base in SHELL:
                shell.setdefault(base, box(n))
            if not in_block and base in BLOCKS:
                blocks.append({"name": base, **box(n), "hug": n.get("layoutSizingHorizontal") == "HUG"})
                in_block = True
            elif not in_block and base in SHELL:
                in_block = True  # 셸 안은 구조에서 뺀다
        if n["type"] == "TEXT":
            style = entry["styles"].get((n.get("styles") or {}).get("text"), "")
            texts.append({"chars": n.get("characters", ""), "style": style, "comps": comps, **box(n)})
        kids = [c for c in n.get("children", []) if c.get("visible") is not False]
        if not n.get("layoutMode"):  # 자유 배치 프레임은 위→아래, 왼→오른 순
            kids = sorted(kids, key=lambda c: ((c.get("absoluteBoundingBox") or {}).get("y", 0),
                                               (c.get("absoluteBoundingBox") or {}).get("x", 0)))
        for i, c in enumerate(kids):
            if c["type"] == "INSTANCE" and comp_base(entry, c) == "page-header" and "header_gap" not in metrics:
                bottom = max((y + h for _, y, _, h in _desc_boxes(c, ox, oy)), default=None)
                if bottom is not None and i + 1 < len(kids):
                    metrics["header_gap"] = box(kids[i + 1])["y"] - bottom
            walk(c, comps, in_block)

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
    return {"texts": texts, "blocks": blocks, "metrics": metrics}


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


# 시드: work/_data/demo-dataset.md "7번 하늘" 값. 앱 저장소 API(restore·createClass)를 그대로 써서 앱 검증을 거친다.
def _g(i, name, grp, sem, cr, rank, typ="공통", **kw):
    return {"id": f"g{i}", "name": name, "subject_group": grp, "semester": sem, "type": typ, "credits": cr,
            "rank_grade": rank, "is_joint": False, **kw}


SEED_GRADES = [
    _g(1, "공통국어1", "국어", "1-1", 4, 2), _g(2, "공통수학1", "수학", "1-1", 4, 2), _g(3, "공통영어1", "영어", "1-1", 4, 1),
    _g(4, "통합사회1", "사회", "1-1", 4, 2), _g(5, "한국사1", "사회", "1-1", 3, 1), _g(6, "통합과학1", "과학", "1-1", 4, 2),
    _g(7, "공통국어2", "국어", "1-2", 4, 2), _g(8, "공통수학2", "수학", "1-2", 4, 1), _g(9, "공통영어2", "영어", "1-2", 4, 1),
    _g(10, "통합사회2", "사회", "1-2", 4, 2), _g(11, "한국사2", "사회", "1-2", 3, 2), _g(12, "통합과학2", "과학", "1-2", 4, 1),
    _g(13, "문학", "국어", "2-1", 4, 1, "일반선택", raw_score=94, subject_mean=71.4, achievement="A", enrolled_count=132),
    _g(14, "대수", "수학", "2-1", 4, 1, "일반선택", raw_score=95, subject_mean=64.8, achievement="A", enrolled_count=132),
    _g(15, "영어Ⅰ", "영어", "2-1", 4, 2, "일반선택", raw_score=89, subject_mean=73.2, achievement="B", enrolled_count=132),
    _g(16, "여행지리", "사회", "2-1", 2, None, "융합선택", raw_score=92, subject_mean=80.3, achievement="A", enrolled_count=26),
    _g(17, "물리학", "과학", "2-1", 3, 1, "일반선택", raw_score=93, subject_mean=68.5, achievement="A", enrolled_count=58),
    _g(18, "운동과 건강", "체육", "2-1", 2, None, "체육예술", achievement="A"),
    _g(19, "독서와 작문", "국어", "2-2", 4, 1, "일반선택", raw_score=93, subject_mean=70.2, achievement="A", enrolled_count=131),
    _g(20, "미적분Ⅰ", "수학", "2-2", 4, 1, "일반선택", raw_score=96, subject_mean=61.7, achievement="A", enrolled_count=131),
    _g(21, "영어Ⅱ", "영어", "2-2", 4, 1, "일반선택", raw_score=94, subject_mean=72.6, achievement="A", enrolled_count=131),
    _g(22, "사회와 문화", "사회", "2-2", 3, 1, "일반선택", raw_score=92, subject_mean=69.8, achievement="A", enrolled_count=74),
    _g(23, "화학", "과학", "2-2", 3, 2, "일반선택", raw_score=85, subject_mean=66.4, achievement="B", enrolled_count=61),
    _g(24, "진로와 직업", "교양", "2-2", 2, None, "교양", achievement="P"),
]
_ZERO = {"illness": 0, "unexcused": 0, "other": 0}
SEED_ATTENDANCE = [
    {"year": 1, "school_days": 191, "absence": {**_ZERO, "illness": 1}, "tardy": _ZERO, "early_leave": _ZERO, "class_absence": _ZERO},
    {"year": 2, "school_days": 190, "absence": {**_ZERO, "illness": 2}, "tardy": {**_ZERO, "unexcused": 1},
     "early_leave": {**_ZERO, "illness": 1}, "class_absence": _ZERO},
]
SEED_INTERESTS = [["경희대학교", "행정학과"], ["건국대학교", "행정학과"], ["성균관대학교", "행정학과"],
                  ["동국대학교", "행정학과"], ["한양대학교", "정책학과"], ["중앙대학교", "공공인재학부"]]
CHECKLIST_DEFAULT = [(t, "pending") for t in ["원서 작성", "전형료 결제", "접수 완료 확인", "제출서류 준비·제출", "서류 도착 확인"]]
# demo-dataset.md application-checklist 전형 A 체크 항목 8개(이름 · 진행 상태)
CHECKLIST_A = [("모집요강 읽기", "done"), ("학교생활기록부 사본 확인", "progress"), ("담임 선생님 상담 신청", "pending"),
               ("원서 작성", "pending"), ("전형료 결제", "pending"), ("접수 완료 확인", "pending"),
               ("제출서류 준비·제출", "na"), ("서류 도착 확인", "na")]


def _apps(now):
    """planner.newApplication(2028)과 같은 모양(앱이 다시 검증하지 않으므로 그대로 맞춘다)."""
    out = []
    for i, (u, d) in enumerate([("경희대학교", "행정학과"), ("성균관대학교", "행정학과"), ("한양대학교", "")]):
        aid = f"seed-app-{i}"
        out.append({"id": aid, "year": 2028, "university": u, "program": "학생부종합", "department": d, "source_url": "",
                    "created_at": now, "updated_at": now,
                    "steps": [{"id": f"{aid}-s{j}", "title": t, "status": st, "due_at": None, "note": "", "source_url": "", "checked_at": None}
                              for j, (t, st) in enumerate(CHECKLIST_A if i == 0 else CHECKLIST_DEFAULT)],
                    "eligibility": [{"id": f"{aid}-e{j}", "title": t, "status": "unknown", "note": "", "source_url": "", "checked_at": None}
                                    for j, t in enumerate(["전형별 지원 자격", "졸업연도·재학 조건", "지역·학교 조건", "학교장추천 필요 여부"])]})
    return out


_NOW = "2026-11-20T04:00:00.000Z"
# demo-dataset.md counsel-tasks T1~T8 (구분 · 상담일 · 기한 · 제목 · 완료)
SEED_TASKS = [("action", "2026-11-17", "2026-11-19", "면접 예상 질문 10개 적어 오기", False),
              ("action", "2026-11-17", "2026-11-20", "학교장추천 필요 여부 모집요강에서 확인하기", False),
              ("question", "2026-11-24", "2026-11-24", "교과 전형 수능 최저 기준은 어디서 확인하나요?", False),
              ("action", "2026-11-17", "2026-11-27", "2028 전형계획에서 모집인원 찾아 적기", False),
              ("question", "2026-11-24", None, "종합 전형 준비로 겨울방학에 무엇부터 할까요?", False),
              ("question", "2026-11-24", None, "6장 지원 순서는 어떤 기준으로 정하면 좋을까요?", False),
              ("action", "2026-11-10", "2026-11-14", "2028 교과 전형 모집인원 찾아보기", True),
              ("question", "2026-11-10", None, "내신과 모의고사 중 지금 어디에 시간을 더 쓸까요?", True)]
_APPS = _apps(_NOW)
SEED = {
    "jinhak-navi-student-v1": {
        "grades": SEED_GRADES, "attendance": SEED_ATTENDANCE, "applications": _APPS,
        "tasks": [{"id": f"seed-task-{i}", "application_id": None, "kind": k, "title": t, "note": "", "session_date": sd,
                   "due_date": due, "done": done, "completed_at": _NOW if done else None, "created_at": _NOW, "updated_at": _NOW}
                  for i, (k, sd, due, t, done) in enumerate(SEED_TASKS)],
        "interests": [{"id": json.dumps([u, "학생부종합", d], ensure_ascii=False, separators=(",", ":")), "university": u,
                       "program": "학생부종합", "department": d, "created_at": _NOW} for u, d in SEED_INTERESTS]},
    "jinhak-navi-teacher-v1": {
        "meta": [{"key": "class", "name": "2학년 3반", "code": "HNL7", "created_at": _NOW}],
        "students": [{"number": f"{i:02d}", "alias": n} for i, n in enumerate(
            "새벽 들꽃 노을 단비 햇살 바람 하늘 이슬 소나무 별빛 구름 가람 달빛 시내 바다 봄비 윤슬 여울 너울 버들 "
            "모래 은하 안개 파도 꽃잎 서리 샘물 솔잎".split(), 1)]},
}
# 앱이 만든 Dexie 저장소(이름·테이블 그대로)에 바로 넣는다. 빌드본이라 /src 모듈을 불러올 수 없어서.
SEED_JS = """async (seed) => {
  const have = (await indexedDB.databases()).map(d => d.name);
  for (const name of Object.keys(seed)) if (!have.includes(name)) throw new Error(name + ' 저장소를 앱이 아직 만들지 않았어요');  // 빈 DB를 대신 만들지 않게
  for (const [name, stores] of Object.entries(seed)) await new Promise((res, rej) => {
    const r = indexedDB.open(name);
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const db = r.result, names = Object.keys(stores).filter(s => db.objectStoreNames.contains(s));
      if (names.length !== Object.keys(stores).length) { db.close(); rej(new Error(name + ' 저장소 테이블이 달라요')); return; }
      const tx = db.transaction(names, 'readwrite');
      for (const s of names) { const os = tx.objectStore(s); os.clear(); stores[s].forEach(x => os.put(x)); }
      tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); };
  });
}"""

# 앱 측정: 글자 모음 · 블록(문서 순, 가장 바깥 것만) · 간격
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
  const blocks = top.map(([k, e]) => ({ name: k, ...R(e) }));
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
    m.header_top = tt.length ? Math.min(...tt.map(t => t.y)) : null;
    m.header_left = tt.length ? Math.min(...tt.map(t => t.x)) : null;
    const bottom = Math.max(...[...topbar.querySelectorAll('*')].filter(vis).map(e => e.getBoundingClientRect().bottom + sy));
    m.header_pad = topbar.getBoundingClientRect().bottom + sy - parseFloat(getComputedStyle(topbar).borderBottomWidth) - bottom;
    const tops = [...content.querySelectorAll('*')].filter(e => vis(e) && !skip(e) && getComputedStyle(e).position !== 'fixed').map(e => e.getBoundingClientRect().top + sy);
    m.header_gap = tops.length ? Math.min(...tops) - bottom : null;
  }
  return { text, blocks, metrics: m };
}"""


def seed_app(page, url):
    """게이트의 유일한 시드 지점. 시안(데이터 있음)과 비교하려고 브라우저 저장소에 demo-dataset 값을 넣는다.
    shortcut: 앱 '샘플 데이터 모드'(첫 실행 시 demo-dataset 자동 적재 + 공개 로더 샘플 반환)가 들어오면
    이 함수 몸통만 그 모드를 켜는 코드(예: 쿼리 파라미터·localStorage 플래그 후 새로고침)로 바꾼다. 그 전엔 아래 직접 적재."""
    for path in ("/grade-input", "/teacher/teacher-dashboard"):  # 두 저장소를 앱이 먼저 만들게 연다(각 저장소를 바로 읽는 화면)
        page.goto(url + path, wait_until="networkidle", timeout=180_000)
        page.wait_for_timeout(1000)
    page.evaluate(SEED_JS, SEED)


class App:
    """앱 빌드 스냅샷(work/_cache/impl-dist) + vite preview + Playwright. 다른 세션이 src를 고쳐도 측정 중 화면이 바뀌지 않게
    dev 서버 대신 빌드본을 쓴다. 시드는 한 번, 화면마다 두 뷰포트로 잰다."""

    def __init__(self, url=None, port=5199):
        import subprocess
        self.proc = None
        self.url = url or f"http://localhost:{port}"
        if not url:
            # node로 바로 부른다(cmd·npx를 거치면 한글 경로에서 vite가 죽음). 출력 폴더는 상대 경로.
            vite = ["node", "node_modules/vite/bin/vite.js"]
            dist = ["--outDir", "../work/_cache/impl-dist"]
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

    def measure(self, route, width):
        p = self.page
        p.set_viewport_size({"width": width, "height": 844 if width < 1000 else 900})
        # 교사 화면을 한 번 열면 학생 화면도 교사 셸로 남는다(workspace.ts). 시안은 화면마다 제 셸이라 매번 지운다.
        p.evaluate("sessionStorage.clear()")
        p.goto(self.url + route, wait_until="networkidle", timeout=120_000)
        # 자료를 비동기로 읽는 화면이 많아서, 글자가 1.2초 동안 그대로일 때까지(최대 15초) 기다린다
        last, same = None, 0
        for _ in range(50):
            p.wait_for_timeout(300)
            now = p.evaluate("document.body.innerText.length + ':' + document.querySelectorAll('*').length")
            same = same + 1 if now == last else 0
            last = now
            if same >= 4:
                break
        # 샘플 데이터 띠는 시안에 없는, 사용자가 요청한 앱 전용 요소라 재기 전에 빼고 본다(2026-11-24 사용자 결정)
        p.evaluate("document.querySelectorAll('.sample-band').forEach(e => e.remove())")
        return p.evaluate(MEASURE_JS, BLOCKS)

    def close(self):
        import subprocess
        self.browser.close()
        self.pw.stop()
        if self.proc:
            subprocess.run(f"taskkill /PID {self.proc.pid} /T /F", shell=True, capture_output=True)


# ---------------------------------------------------------------- 비교

TOL_SHELL, TOL_BLOCK = 2, 4


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


def spacing_errors(fig, app, width):
    v, errs = f"{width}", []
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

    afirst = {}
    for b in app["blocks"]:
        afirst.setdefault(b["name"], b)
    done = {"page-header", "sub-nav"}  # 셸은 위 수치로 본다
    for b in fig["blocks"]:
        a = afirst.get(b["name"])
        if not a or b["name"] in done:
            continue
        done.add(b["name"])
        if not within(a["x"], b["x"], TOL_BLOCK):
            errs.append(f"P {v}: {b['name']} x {_r(a['x'])} (시안 {_r(b['x'])}±{TOL_BLOCK})")
        if not b["hug"] and not within(a["w"], b["w"], TOL_BLOCK):
            errs.append(f"P {v}: {b['name']} 폭 {_r(a['w'])} (시안 {_r(b['w'])}±{TOL_BLOCK})")
    return errs


def compare(fig, app, width):
    """한 뷰포트 비교 → 오류 문자열 목록. fig = figma_frame(), app = MEASURE_JS 결과."""
    fseq = [b["name"] for b in fig["blocks"] if BLOCKS.get(b["name"])]
    aseq = [b["name"] for b in app["blocks"]]
    return (text_errors(fig, app["text"], width)
            + [f"S {width}: {e}" for e in order_errors(fseq, aseq)]
            + spacing_errors(fig, app, width))


def _r(x):
    return None if x is None else round(x)


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
    data, ids = fetch_figma(slug, refresh)
    route = route_of(slug)
    errors, notes = [], []
    for key, nid in zip(FRAMES, ids):
        fig = figma_frame(data["nodes"][nid])
        unmapped = sorted({b["name"] for b in fig["blocks"] if not BLOCKS.get(b["name"])})
        if unmapped:
            notes.append(f"{key}: 앱 표식 없는 블록(구조 미검사) {', '.join(unmapped)}")
        errors += compare(fig, app.measure(route, int(key)), int(key))
    return route, errors, notes


def record(slug, route, errors, notes):
    errors, allowed = apply_allow(slug, errors)
    out_path = WORK / slug / "07-impl.json"
    passed = not errors
    streak = 0
    if not passed:
        prev = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
        streak = prev.get("same_fail_streak", 0) + 1 if sorted(prev.get("errors", [])) == sorted(errors) else 1
    result = {"slug": slug, "gate": "G5", "pass": passed, "errors": errors, "back_to": None if passed else "S5",
              "same_fail_streak": streak, "route": route, "allowed": allowed, "notes": notes}
    if slug in IN_PROGRESS:
        result["status"] = IN_PROGRESS[slug]
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


# 다른 작업이 지금 다시 구현하는 화면: 전수조사 맨 끝에 돌리고 결과에 표시한다
IN_PROGRESS = {"doelgak": "재구현 중(2026-11-24 다른 에이전트가 시안대로 다시 구현하는 중)"}


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
