"""Build offline SVG boundaries from admdongkor 2025-10-01 (Shapely 2.1.2).

python app/tools/build_map_boundaries.py work/_cache/map-boundaries/source.geojson
Input is pinned by hash in the generated asset; no network is used by the app.
"""
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'work/_cache/map-python'))
from shapely import coverage_simplify, make_valid, union_all
from shapely.geometry import shape
from shapely.ops import polylabel, transform


def polygons(geometry):
    if geometry.geom_type == 'Polygon':
        return [geometry]
    return [p for g in geometry.geoms for p in polygons(g)] if hasattr(geometry, 'geoms') else []


def svg_path(geometry):
    return ''.join('M' + 'L'.join(f'{x:.2f},{y:.2f}' for x, y in ring.coords) + 'Z'
                   for p in polygons(geometry) for ring in [p.exterior, *p.interiors])


def bbox(geometry):
    x, y, right, bottom = geometry.bounds
    return dict(x=round(x, 3), y=round(y, 3), w=round(right-x, 3), h=round(bottom-y, 3))


def build(source):
    raw = source.read_bytes()
    features = json.loads(raw)['features']
    grouped = defaultdict(list)
    for feature in features:
        props = feature['properties']
        parts = props['adm_nm'].split()
        sido = parts[0]
        # General districts belong to their city; metropolitan autonomous gu stay separate.
        name = parts[1] if sido != '세종특별자치시' else '세종시'
        name = re.sub(r'(?<=시).+구$', '', name)
        grouped[sido, name].append(make_valid(shape(feature['geometry'])))
    keys = sorted(grouped)
    merged = [transform(lambda x, y, z=None: ((x-125.8)*90, (38.75-y)*111),
                        union_all(grouped[key])) for key in keys]
    # Simplify shared edges together, preserving matching boundaries between neighbors.
    simplified = coverage_simplify(merged, tolerance=0.18)
    regions = {}
    for sido in sorted({k[0] for k in keys}):
        indexes = [i for i, key in enumerate(keys) if key[0] == sido]
        outline = union_all([simplified[i] for i in indexes])
        districts = []
        for i in indexes:
            geo = simplified[i]
            largest = max(polygons(geo), key=lambda p: p.area)
            label = polylabel(largest, tolerance=0.1)
            districts.append(dict(name=keys[i][1], d=svg_path(geo),
                                  label=[round(label.x, 3), round(label.y, 3)]))
        # Focus the mainland/main island. Campus coordinates expand the viewport at runtime.
        regions[sido] = dict(d=svg_path(outline), bbox=bbox(max(polygons(outline), key=lambda p: p.area)), districts=districts)
    assert len(regions) == 17, list(regions)
    result = dict(source='https://github.com/vuski/admdongkor', date='2025-10-01',
                  source_file='ver20251001/HangJeongDong_ver20251001.geojson',
                  sha256=hashlib.sha256(raw).hexdigest(), license='CC BY 4.0; upstream KOGL Type 1', regions=regions)
    target = ROOT / 'app/src/assets/map/districts.json'
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    print(f'{len(regions)} regions, {len(keys)} districts, {target.stat().st_size:,} bytes')


if __name__ == '__main__':
    build(Path(sys.argv[1]))
