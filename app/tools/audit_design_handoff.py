"""Validate local design handoff references against an observed Figma inventory."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILE_KEY = 'AqkVdYZ4hvPYuAlewoBs4W'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def main():
    inventory = read(ROOT / 'work/_data/design-inventory-2026-11-24.json')
    nodes = {f['id']: f for section in inventory for f in section['frames']}
    by_name = {f['name']: f for f in nodes.values()}
    rules = read(ROOT / 'rules/design-rules.json')['screens']
    supplemented = read(ROOT / 'work/_data/design-supplemented-2026-11-24.json')['bases']
    design_only = read(ROOT / 'work/_data/screen-delivery.json')['design_only']
    errors, screens = [], []
    for title, slug in rules.items():
        draft_path = ROOT / f'work/{slug}/03-draft.json'
        draft = read(draft_path) if draft_path.exists() else {}
        frames = {}
        for width, height in [(390, 844), (1440, 900)]:
            recorded_id = draft.get('frames', {}).get(str(width))
            node = nodes.get(recorded_id) if recorded_id else by_name.get(f'{slug}/{width}')
            if not node:
                errors.append(f'{slug}/{width}: missing live frame')
                continue
            if node['name'] != f'{slug}/{width}':
                errors.append(f'{slug}/{width}: frame name mismatch')
            if (node['width'], node['height']) != (width, height):
                errors.append(f'{slug}/{width}: wrong dimensions')
            frames[str(width)] = node['id']
        states = draft.get('states', {})
        if slug in supplemented:
            for key, node_id in {**draft.get('frames', {}), **states}.items():
                if node_id not in nodes:
                    errors.append(f'{slug}/{key}: stale reference {node_id}')
            spec = (ROOT / f'work/{slug}/02-spec.md').read_text(encoding='utf-8')
            expected = set(re.findall(r'^\|\s*' + re.escape(slug) + r'/(?:((?:390|1440)-[\w-]+))', spec, re.M))
            missing = sorted(expected - set(states))
            errors.extend(f'{slug}/{s}: required state missing' for s in missing)
        approval_path = ROOT / f'work/{slug}/04-approval.md'
        approved = approval_path.exists() and '상태: 승인' in approval_path.read_text(encoding='utf-8-sig')
        screens.append({'slug': slug, 'title': title, 'frames': frames, 'states': len(states),
                        'approval': 'existing-approval' if approved else 'awaiting-human-review',
                        'delivery': 'design-only' if slug in design_only else 'app-route',
                        'figma': {w: f'https://www.figma.com/design/{FILE_KEY}?node-id={n.replace(":", "-")}' for w, n in frames.items()}})
    report = {'date': '2026-11-24', 'status': 'pass' if not errors else 'fail',
              'screen_count': len(screens), 'base_frame_count': sum(len(s['frames']) for s in screens),
              'errors': errors, 'screens': screens}
    path = ROOT / 'work/_data/design-handoff-2026-11-24.json'
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['status', 'screen_count', 'base_frame_count', 'errors']}, ensure_ascii=False))
    return 0 if not errors else 1


if __name__ == '__main__':
    raise SystemExit(main())
