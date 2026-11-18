"""S5 판정: Figma 최종 화면을 rules/design-rules.json(J1~J9)으로 센다. 종료코드 0 = 통과.

사용: python scripts/judge.py <slug> [--fixture <nodes 응답 json>]
"""
import hashlib
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RULES_PATH = ROOT / "rules" / "design-rules.json"
DESIGN_PATH = ROOT / "docs" / "design.md"
JS = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8", "J9"]


def load_rules():
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def fetch_nodes(file_key, ids):
    """Figma REST API로 노드 트리를 직접 읽는다(만든 에이전트가 판정 데이터를 만지지 못하게)."""
    token = os.environ.get("FIGMA_TOKEN")
    if not token:
        sys.exit("FIGMA_TOKEN 환경변수가 없어요.")
    url = f"https://api.figma.com/v1/files/{file_key}/nodes?ids={','.join(ids)}"
    req = urllib.request.Request(url, headers={"X-Figma-Token": token})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def to_hex(c):
    return "#" + "".join(f"{round(c[k] * 255):02x}" for k in ("r", "g", "b"))


def walk(node, ancestors=()):
    yield node, ancestors
    for ch in node.get("children", []):
        yield from walk(ch, ancestors + (node.get("name", ""),))


def rules_hash_ok(rules, design_path=DESIGN_PATH):
    return hashlib.sha256(Path(design_path).read_bytes()).hexdigest() == rules["source"]["sha256"]


def count_forbidden(text, rules):
    for ex in rules["forbidden_word_exceptions"]:
        text = text.replace(ex, "")
    return sum(text.count(w) for w in rules["forbidden_words"])


def judge(nodes_response, rules, design_path=DESIGN_PATH):
    colors = {c.lower() for c in rules["colors"]}
    shadow_ok = set(rules["shadow_allowed_on"])
    v = []  # (rule, node_id, name, detail)

    if not rules_hash_ok(rules, design_path):
        v.append(("J9", "-", "rules/design-rules.json", "design.md가 바뀌었어요. 규칙 파일을 갱신해야 해요."))

    exempt = tuple(rules.get("palette_exempt", []))  # 대학 로고: 원본 색·모양 그대로라 J1·J2·J7 제외
    for entry in nodes_response["nodes"].values():
        for n, anc in walk(entry["document"]):
            nid, name = n.get("id", "?"), n.get("name", "")
            node_bv = n.get("boundVariables", {})
            in_logo = bool(exempt) and any(x.startswith(exempt) for x in (name, *anc))
            for field in () if in_logo else ("fills", "strokes"):
                for i, p in enumerate(n.get(field, [])):
                    if p.get("type") != "SOLID" or p.get("visible") is False:
                        continue  # shortcut: 그라디언트·이미지 paint는 세지 않음, 쓰게 되면 stop 색까지 확장
                    hx = to_hex(p["color"])
                    if hx not in colors:
                        v.append(("J1", nid, name, f"{field} {hx}"))
                    bound = p.get("boundVariables", {}).get("color") or (
                        i < len(node_bv.get(field, [])) and node_bv[field][i])
                    if not bound:
                        v.append(("J7", nid, name, f"{field}[{i}] {hx} 변수 미연결"))

            if not in_logo and name not in rules["radius_exceptions"]:
                radii = n.get("rectangleCornerRadii") or (
                    [n["cornerRadius"]] if "cornerRadius" in n else [])
                bad = [r for r in radii if r not in rules["radius"]]
                if bad:
                    v.append(("J2", nid, name, f"radius {bad}"))

            if n.get("type") == "TEXT":
                styles = [n.get("style", {})] + list(n.get("styleOverrideTable", {}).values())
                for s in styles:
                    if "fontFamily" in s and s["fontFamily"] not in rules["font_family"]:
                        v.append(("J3", nid, name, s["fontFamily"]))
                    if "fontWeight" in s and s["fontWeight"] not in rules["font_weight"]:
                        v.append(("J4", nid, name, s["fontWeight"]))
                    if "letterSpacing" in s and s["letterSpacing"] not in rules["letter_spacing"]:
                        v.append(("J5", nid, name, s["letterSpacing"]))
                k = count_forbidden(n.get("characters", ""), rules)
                if k:
                    v.append(("J8", nid, name, f"금지어 {k}회: {n.get('characters', '')[:40]}"))

            shadows = [e for e in n.get("effects", [])
                       if e.get("type") == "DROP_SHADOW" and e.get("visible", True)]
            if shadows and not ({name, *anc} & shadow_ok):
                v.append(("J6", nid, name, "허용 안 된 그림자"))

    counts = {j: sum(1 for x in v if x[0] == j) for j in JS}
    return counts, v


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows 기본 cp949면 한글이 깨짐
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    slug = args[0]
    work = ROOT / "work" / slug
    rules = load_rules()
    if "--fixture" in args:
        resp = json.loads(Path(args[args.index("--fixture") + 1]).read_text(encoding="utf-8"))
    else:
        build = json.loads((work / "05-build.json").read_text(encoding="utf-8"))
        resp = fetch_nodes(build["file_key"], list(build["frames"].values()))

    counts, v = judge(resp, rules)
    failed = sorted(j for j, c in counts.items() if c)
    out_path = work / "06-judge.json"
    streak = 0
    if failed and out_path.exists():
        prev = json.loads(out_path.read_text(encoding="utf-8"))
        streak = prev.get("same_fail_streak", 0) + 1 if prev.get("failed") == failed else 1
    elif failed:
        streak = 1
    result = {
        "slug": slug, "pass": not failed, "failed": failed, "same_fail_streak": streak,
        "counts": counts,
        "violations": [dict(zip(("rule", "node_id", "name", "detail"), x)) for x in v],
    }
    work.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
