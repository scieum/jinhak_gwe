"""Export the organized 수시 draft with row-level review flags for the reference browser."""
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from import_admission_results import COLUMNS, encode, write_atomic
from organize_susi_results import OUTPUT, SOURCE, digest

APP = Path(__file__).resolve().parents[1]


def export(source=OUTPUT, output=APP/'public/data/susi-results'):
    report = json.loads((source/'summary.json').read_text(encoding='utf-8'))
    index = json.loads((source/'app-import/index.json').read_text(encoding='utf-8'))
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != report['source_sha256']:
        raise ValueError('Master changed; rerun organize_susi_results.py')
    if hashlib.sha256((source/'susi.csv').read_bytes()).hexdigest() != index['source_sha256']:
        raise ValueError('Organized CSV changed; rerun organizer')
    grouped = defaultdict(list)
    with (source/'row-index.csv').open(encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f): grouped[row['university']].append(row)
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    for entry in index['universities']:
        raw = (source/'app-import'/entry['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == entry['sha256']
        payload = json.loads(raw)
        review = grouped[entry['university']]
        assert len(review) == len(payload['rows'])
        codes = sorted({code for r in review for code in r['issues'].split(';') if code})
        flags = []
        for cells, row in zip(payload['rows'], review):
            values = [payload['strings'][i] for i in cells]
            assert values == [row[c] for c in COLUMNS]
            assert digest(values) == row['row_sha256']
            flags.append([codes.index(code) for code in row['issues'].split(';') if code])
        payload.update(review_format='susi-row-review-v1', review_codes=codes, review_flags=flags)
        raw = encode(payload)
        sha = hashlib.sha256(raw).hexdigest()
        write_atomic(output/(sha+'.json'), raw)
        entries.append(dict(entry, file=sha+'.json', sha256=sha, bytes=len(raw)))
    index.update(universities=entries, dataset='organized-susi', review_format='susi-row-review-v1',
                 master_sha256=report['source_sha256'], university_count=report['mapped_universities'],
                 review_rows=report['queues']['review_required'])
    write_atomic(output/'index.json', encode(index))
    print(json.dumps({'susi_rows':index['rows'], 'packages':len(entries), 'review_rows':index['review_rows']}))
    return index


if __name__ == '__main__': export()
