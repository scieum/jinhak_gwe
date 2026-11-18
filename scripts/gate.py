"""단계 게이트 G1·G2·G3·approval. 종료코드 0 = 통과.

사용: python scripts/gate.py <slug> <G1|G2|G3|approval> [--fixture <nodes 응답 json>]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from judge import ROOT, count_forbidden, fetch_nodes, load_rules  # noqa: E402

LINK = re.compile(r"^\s*[-*]?\s*\[L(\d+)\].*https?://", re.M)
POINT = re.compile(r"^\s*[-*]\s*P\d+\s*:(.*)$", re.M)
COMPONENT = re.compile(r"`([a-z0-9]+(?:-[a-z0-9]+)+)`")


def g1(text, rules):
    links = set(LINK.findall(text))
    points = POINT.findall(text)
    g = rules["gates"]["G1"]
    no_ref = [p.strip()[:30] for p in points
              if len(set(re.findall(r"L(\d+)", p)) & links) < g["min_links_per_point"]]
    errors = []
    if len(links) < g["min_links"]:
        errors.append(f"링크 {len(links)}개 (최소 {g['min_links']})")
    if len(points) < g["min_points"]:
        errors.append(f"반영 포인트 {len(points)}개 (최소 {g['min_points']})")
    errors += [f"근거 링크 없는 포인트: {p}" for p in no_ref]
    return errors


def g2(text, slug, rules):
    used = set(COMPONENT.findall(text))
    errors = [f"design.md에 없는 컴포넌트: {c}" for c in sorted(used - set(rules["components"]))]
    k = count_forbidden(text, rules)
    if k:
        errors.append(f"금지어 {k}회 (NEVER-2)")
    for key, comp in (("requires_trace_accordion", "trace-accordion"),
                      ("requires_disclaimer_note", "disclaimer-note")):
        if slug in rules[key] and comp not in used:
            errors.append(f"필수 컴포넌트 없음: {comp}")
    return errors


def g3(nodes_response, slug, rules):
    want = {f"{slug}/{w}": (w, h) for w, h in rules["frames"]}
    found = {}
    for entry in nodes_response["nodes"].values():
        d = entry["document"]
        box = d.get("absoluteBoundingBox", {})
        found[d.get("name")] = (round(box.get("width", 0)), round(box.get("height", 0)))
    errors = [f"프레임 없음: {n}" for n in want if n not in found]
    errors += [f"{n} 크기 {found[n]} (기대 {s})" for n, s in want.items() if n in found and found[n] != s]
    if len(found) != len(want):
        errors.append(f"프레임 {len(found)}개 (정확히 {len(want)}개)")
    return errors


def approval(text):
    """반환: (errors, back_to). 반려면 back_to = S1 또는 S2."""
    if re.search(r"상태\s*:\s*반려", text):
        m = re.search(r"반려 사유\s*:\s*(.*)", text)
        reason = m.group(1).strip() if m else ""
        return [f"반려: {reason or '사유 없음'}"], ("S1" if "레퍼런스 방향" in reason else "S2")
    errors = []
    if not re.search(r"상태\s*:\s*승인\s*$", text, re.M):
        errors.append("'상태: 승인' 없음")
    checked = len(re.findall(r"^\s*-\s*\[[xX]\]", text, re.M))
    unchecked = len(re.findall(r"^\s*-\s*\[ \]", text, re.M))
    if checked != 3 or unchecked:
        errors.append(f"체크리스트 체크 {checked}/3")
    return errors, None


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows 기본 cp949면 한글이 깨짐
    args = sys.argv[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    slug, gate = args[0], args[1]
    work = ROOT / "work" / slug
    rules = load_rules()
    back_to = None
    read = lambda f: (work / f).read_text(encoding="utf-8")  # noqa: E731

    if gate == "G1":
        errors = g1(read("01-research.md"), rules)
    elif gate == "G2":
        errors = g2(read("02-spec.md"), slug, rules)
    elif gate == "G3":
        if "--fixture" in args:
            resp = json.loads(Path(args[args.index("--fixture") + 1]).read_text(encoding="utf-8"))
        else:
            draft = json.loads(read("03-draft.json"))
            resp = fetch_nodes(draft["file_key"], list(draft["frames"].values()))
        errors = g3(resp, slug, rules)
    elif gate == "approval":
        errors, back_to = approval(read("04-approval.md"))
    else:
        sys.exit(f"알 수 없는 게이트: {gate}")

    print(json.dumps({"slug": slug, "gate": gate, "pass": not errors,
                      "errors": errors, "back_to": back_to}, ensure_ascii=False, indent=2))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
