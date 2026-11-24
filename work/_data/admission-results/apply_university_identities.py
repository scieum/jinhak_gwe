"""Apply current-name view and verify every original score/source row is preserved.

Per-university input CSVs remain unchanged. Rebuilds use merge.py and the shared
registry. The current 4-year master excludes explicitly identified associate rows,
which are retained losslessly in _excluded-degree.csv and the untouched inputs.
"""
import csv
import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path

import merge
import university_identity as identity

HERE = Path(__file__).resolve().parent
OUT = HERE / 'university-identity-review'


def rows(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def unchanged_key(row):
    return tuple(row[k] for k in merge.COLS if k not in {'university', 'note'})


def main():
    OUT.mkdir(exist_ok=True)
    before_path = OUT / 'before-all.csv'
    if not before_path.exists():
        shutil.copy2(HERE / '_all.csv', before_path)
    before = rows(before_path)
    assert len(before) == 132621, 'Baseline changed; review before proceeding'
    assert merge.main() == 0
    after, excluded = rows(HERE / '_all.csv'), rows(HERE / '_excluded-degree.csv')
    assert len(before) == len(after) + len(excluded)
    assert Counter(map(unchanged_key, before)) == Counter(map(unchanged_key, after + excluded)), 'Numeric/source/academic-year change'
    expected = [identity.normalize(r) for r in before if not identity.exclusion_reason(r)]
    assert Counter(tuple(r[k] for k in merge.COLS) for r in expected) == Counter(tuple(r[k] for k in merge.COLS) for r in after)
    assert len({tuple(r[k] for k in merge.COLS) for r in after}) == len(after)
    assert all(identity.normalize(r) == r for r in after), 'Normalization must be idempotent'
    names = Counter(r['university'] for r in after)
    changes = []
    for index, r in enumerate(before, 2):
        updated = identity.normalize(r)
        if updated != r or identity.exclusion_reason(r):
            changes.append(dict(baseline_csv_record=index, result_year=r['result_year'],
                previous_name=r['university'], current_name=updated['university'],
                recruit_unit=r['recruit_unit'], disposition='associate_separate' if identity.exclusion_reason(r) else 'four_year',
                source_url=r['source_url'], source_page=r['source_page'],
                previous_note=r['note'], current_note=updated['note']))
    with (OUT / 'row-changes.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, list(changes[0])); w.writeheader(); w.writerows(changes)
    survey = []
    display_names = json.loads((identity.REGISTRY_PATH.parent / 'universityDisplayNames.json').read_text(encoding='utf-8'))
    for name in identity.REGISTRY['roster']:
        event_ids = [e['id'] for e in identity.REGISTRY['events'] if name == e['successor'] or name in e['predecessors']]
        current_rows = sum(count for label, count in names.items()
                           if display_names.get(label, label) == name or display_names.get(label, label).startswith(name+'('))
        survey.append(dict(university=name, event_ids='; '.join(event_ids), current_rows=current_rows,
                           conclusion='이력/추진 상태 확인' if event_ids else '현행 명단 대조; 이번 범위의 통합 반영 없음'))
    with (OUT / 'national-roster-survey.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, list(survey[0])); w.writeheader(); w.writerows(survey)
    summary = dict(as_of=identity.AS_OF, original_rows=len(before), current_four_year_rows=len(after),
        separately_preserved_associate_rows=len(excluded),
        renamed_rows=sum(r['university'] != identity.normalize(r)['university'] and not identity.exclusion_reason(r) for r in before),
        history_only_rows=sum(r['university'] == identity.normalize(r)['university'] and r != identity.normalize(r) for r in before),
        campus_rows={name: count for name, count in names.items() if name in ['강원대학교(강릉)','강원대학교(원주)','국립경국대학교(예천)','국립목포대학교(담양)']},
        event_counts=dict(Counter(f"{e['status']}:{e['type']}" for e in identity.REGISTRY['events'])),
        roster_count=len(survey), numeric_and_source_fields_preserved=True,
        source_input_csvs_modified=False, registry_sha256=sha(identity.REGISTRY_PATH),
        before_sha256=sha(before_path), current_sha256=sha(HERE / '_all.csv'),
        excluded_sha256=sha(HERE / '_excluded-degree.csv'))
    (OUT / 'audit.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__': main()
