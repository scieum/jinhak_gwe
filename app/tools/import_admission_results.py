"""Package the collected CSV for on-demand review. Never creates approvals."""
import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
COLUMNS = 'university result_year round admission_type program recruit_unit quota applicants competition_rate fill_count fill_rate cut_50 cut_70 cut_other metric basis grade_system source_url source_page note'.split()


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def write_atomic(path, content):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_bytes(content)
    temp.replace(path)


def build(source, output):
    raw = source.read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    grouped = defaultdict(list)
    with source.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != COLUMNS:
            raise ValueError('CSV columns do not match the admission result schema')
        for record, row in enumerate(reader, 2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f'CSV record {record}: expected exactly 20 columns')
            if not row['university'].strip():
                raise ValueError(f'CSV record {record}: university is missing')
            grouped[row['university']].append([row[c] for c in COLUMNS])
    if not grouped:
        raise ValueError('CSV contains no results')
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    for university, rows in sorted(grouped.items()):
        strings, lookup, packed = [], {}, []
        for row in rows:
            ids = []
            for cell in row:
                if cell not in lookup:
                    lookup[cell] = len(strings)
                    strings.append(cell)
                ids.append(lookup[cell])
            packed.append(ids)
        payload = encode({'format': 'jinhak-navi-collected-results', 'version': 1,
                         'status': 'draft', 'university': university,
                         'columns': COLUMNS, 'strings': strings, 'rows': packed})
        digest = hashlib.sha256(payload).hexdigest()
        filename = digest + '.json'
        write_atomic(output / filename, payload)
        entries.append({'university': university, 'file': filename, 'sha256': digest,
                        'bytes': len(payload), 'rows': len(rows),
                        'years': sorted(set(r[1] for r in rows)),
                        'rounds': dict(Counter(r[2] for r in rows)),
                        'sources': len(set((r[1], r[17]) for r in rows))})
    manifest = {'format': 'jinhak-navi-collected-index', 'version': 1, 'status': 'draft',
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'source_file': source.name, 'source_sha256': source_hash,
                'rows': sum(e['rows'] for e in entries),
                'sources': sum(e['sources'] for e in entries),
                'universities': entries}
    # Publish the index last, so readers never see a half-written import.
    write_atomic(output / 'index.json', encode(manifest))
    print(json.dumps({'rows': manifest['rows'], 'universities': len(entries),
                      'sources': manifest['sources'], 'source_bytes': len(raw),
                      'packed_bytes': sum(e['bytes'] for e in entries),
                      'source_sha256': source_hash}))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=APP.parent / 'work/_data/admission-results/_all.csv')
    parser.add_argument('--output', type=Path, default=APP / 'public/data/collected-results')
    args = parser.parse_args()
    build(args.source.resolve(), args.output.resolve())
