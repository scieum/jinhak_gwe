"""Build a small, lossless grade-coordinate index from the local collected packages.
No approvals, calculated grades, geographic inference or admission judgments are created.
"""
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
FIELDS = ['university', 'round', 'admission_type', 'program', 'recruit_unit', 'metric', 'basis', 'cut_50', 'cut_70']


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def grade(value):
    value = value.strip()
    if not re.fullmatch(r'[+-]?(?:(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:\.[0-9]*)?|\.[0-9]+)', value):
        return False
    try:
        number = float(value.replace(',', ''))
        return math.isfinite(number) and 1 <= number <= 9
    except ValueError:
        return False


def build(source=APP / 'public/data/collected-results', output=APP / 'public/data/national-placement'):
    manifest = json.loads((source / 'index.json').read_text(encoding='utf-8'))
    years = defaultdict(list)
    hashes = {}
    for entry in manifest['universities']:
        raw = (source / entry['file']).read_bytes()
        if len(raw) != entry['bytes'] or hashlib.sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError('Collected package does not match its manifest')
        package = json.loads(raw)
        hashes[entry['university']] = entry['sha256']
        for row_index, cells in enumerate(package['rows']):
            row = dict(zip(package['columns'], (package['strings'][i] for i in cells)))
            if row['grade_system'] != '9' or row['metric'] not in ('교과등급', '수능등급'):
                continue
            if not grade(row['cut_50']) and not grade(row['cut_70']):
                continue
            years[row['result_year']].append((row_index, row))
    output.mkdir(parents=True, exist_ok=True)
    files = []
    for year, records in sorted(years.items(), reverse=True):
        strings, ids, packed = [], {}, []
        for row_index, row in records:
            values = []
            for field in FIELDS:
                value = row[field]
                if value not in ids:
                    ids[value] = len(strings)
                    strings.append(value)
                values.append(ids[value])
            packed.append([row_index, *values])
        universities = sorted({r['university'] for _, r in records})
        payload = encode({'format': 'jinhak-national-placement', 'version': 1, 'status': 'draft', 'year': year,
                          'columns': FIELDS, 'strings': strings, 'rows': packed,
                          'sources': {name: hashes[name] for name in universities}})
        digest = hashlib.sha256(payload).hexdigest()
        (output / f'{digest}.json').write_bytes(payload)
        files.append({'year': year, 'file': f'{digest}.json', 'sha256': digest, 'bytes': len(payload),
                      'rows': len(records), 'universities': len(universities)})
    index = {'format': 'jinhak-national-placement-index', 'version': 1, 'status': 'draft',
             'collection_sha256': manifest['source_sha256'], 'collection_rows': manifest['rows'],
             'collection_universities': len(manifest['universities']), 'years': files}
    (output / 'index.json').write_bytes(encode(index))
    print(json.dumps({'years': files, 'indexed_rows': sum(f['rows'] for f in files)}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
