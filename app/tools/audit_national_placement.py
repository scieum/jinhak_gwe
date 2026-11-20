"""Reconcile every local source row and write reproducible coverage evidence."""
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from build_national_placement import APP, FIELDS, grade
from placement_statistics import EXTRA_KEYS, extract_statistics


def audit():
    source = APP / 'public/data/collected-results'
    output = APP / 'public/data/national-placement'
    manifest = json.loads((source / 'index.json').read_text(encoding='utf-8'))
    index = json.loads((output / 'index.json').read_text(encoding='utf-8'))
    assert index['collection_sha256'] == manifest['source_sha256']
    assert index['collection_rows'] == manifest['rows']
    packages = {}
    for entry in manifest['universities']:
        raw = (source / entry['file']).read_bytes()
        assert len(raw) == entry['bytes'] and hashlib.sha256(raw).hexdigest() == entry['sha256']
        package = json.loads(raw)
        packages[entry['university']] = [dict(zip(package['columns'], [package['strings'][v] for v in cells])) for cells in package['rows']]
    seen = set()
    for year in index['years']:
        raw = (output / year['file']).read_bytes()
        assert len(raw) == year['bytes'] and hashlib.sha256(raw).hexdigest() == year['sha256']
        package = json.loads(raw)
        actual_stats = defaultdict(dict)
        for ordinal, key, value, population, evidence in package['statistics']:
            assert key not in actual_stats[ordinal]
            actual_stats[ordinal][key] = dict(value=package['strings'][value], population=package['strings'][population], evidence=package['strings'][evidence])
        for ordinal, cells in enumerate(package['rows']):
            row = dict(zip(package['columns'], [package['strings'][v] for v in cells[1:]]))
            key = (row['university'], cells[0])
            assert key not in seen
            seen.add(key)
            original = packages[key[0]][key[1]]
            assert original['result_year'] == year['year']
            assert all(row[field] == original[field] for field in FIELDS)
            assert actual_stats[ordinal] == extract_statistics(original)
            assert all(stat['evidence'] in original['cut_other'] for stat in actual_stats[ordinal].values())
    expected = {(name, i) for name, rows in packages.items() for i in range(len(rows))}
    assert seen == expected and len(seen) == manifest['rows']

    totals = Counter()
    summary = []
    before, after = set(), set()
    for name, rows in packages.items():
        for year in sorted({year['year'] for year in index['years']}, reverse=True):
            counts = Counter()
            for row in rows:
                if row['result_year'] != year:
                    continue
                counts['rows'] += 1
                extra = extract_statistics(row)
                valid = row['grade_system'] == '9' and row['metric'] in ('교과등급', '수능등급')
                primary = valid and (grade(row['cut_50']) or grade(row['cut_70']))
                if primary:
                    reason = 'original_coordinates'; before.add(name)
                elif extra:
                    reason = 'additional_coordinates'
                elif row['metric'] not in ('교과등급', '수능등급'):
                    reason = 'other_metric'
                elif row['grade_system'] != '9':
                    reason = 'unconfirmed_grade_system'
                else:
                    reason = 'no_unambiguous_statistic'
                counts[reason] += 1
                if primary or extra:
                    after.add(name)
                for key in ('cut_50', 'cut_70'):
                    counts[key] += int(valid and grade(row[key]))
                for key in extra:
                    counts[key] += 1
            totals.update(counts)
            summary.append(dict(university=name, year=year, **{key: counts[key] for key in ['rows', 'original_coordinates', 'additional_coordinates', 'other_metric', 'unconfirmed_grade_system', 'no_unambiguous_statistic', 'cut_50', 'cut_70', *EXTRA_KEYS]}))
    report = dict(collection_sha256=manifest['source_sha256'], source_rows=len(seen), universities=len(packages),
                  original_coordinate_universities=len(before), expanded_coordinate_universities=len(after),
                  newly_connected_coordinate_universities=sorted(after-before), source_only_universities=sorted(set(packages)-after),
                  totals=dict(totals), university_years=summary,
                  scope='Local collected-package integrity and display coverage; not an official-source or licensing approval.')
    target = APP.parent / 'work/_pending'
    (target / 'national-placement-audit-2026-11-20.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    with (target / 'national-placement-audit-2026-11-20.csv').open('w', encoding='utf-8-sig', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=list(summary[0]))
        writer.writeheader(); writer.writerows(summary)
    print(json.dumps({key: value for key, value in report.items() if key != 'university_years'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    audit()
