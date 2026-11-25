"""Organize collected 수시 observations without changing scores, merging sources or approving them.

Run from the repository root: python app/tools/organize_susi_results.py
Outputs remain in the private collection directory. susi.csv uses the app's existing import schema.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlsplit

from import_admission_results import COLUMNS, build as pack

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'work/_data/admission-results/_all.csv'
DIRECTORY = ROOT / 'work/_data/university-directory/directory.json'
OUTPUT = SOURCE.parent / 'susi-organized'
KEY = ['university', 'result_year', 'round', 'admission_type', 'program', 'recruit_unit', 'metric', 'basis', 'grade_system']
MEASURES = ['quota', 'applicants', 'competition_rate', 'fill_count', 'fill_rate', 'cut_50', 'cut_70', 'cut_other']
GRADE = {'교과등급', '수능등급'}
SCORE = {'환산점수', '백분위', '표준점수', '논술점수'}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def number(text):
    # Only literal decimal scores qualify. Suppressed values, ranges and composite cells stay raw.
    if not re.fullmatch(r'\d+(?:\.\d+)?', text):
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def provider(url):
    try:
        host = (urlsplit(url).hostname or '').lower()
        return 'adiga' if host in {'adiga.kr', 'www.adiga.kr'} else 'collected_source'
    except ValueError:
        return 'unresolved'


def classify(row):
    issues = []
    for field in ['university', 'program', 'recruit_unit', 'source_url', 'source_page']:
        if not row[field].strip(): issues.append('missing_' + field)
    if not re.fullmatch(r'20\d{2}', row['result_year']): issues.append('invalid_year')
    try:
        url = urlsplit(row['source_url'])
        if url.scheme not in {'https', 'http'} or not url.netloc or url.username or url.password:
            issues.append('invalid_source_url')
        elif url.scheme == 'http': issues.append('http_source_requires_review')
    except ValueError:
        issues.append('invalid_source_url')
    values = {c: number(row[c]) for c in ['cut_50', 'cut_70']}
    has_cut = any(row[c] for c in values)
    if has_cut:
        if not row['metric']: issues.append('cut_without_metric')
        elif row['metric'] not in GRADE | SCORE: issues.append('cut_metric_requires_review')
        if not row['basis'].strip(): issues.append('cut_without_basis')
        for field, value in values.items():
            if not row[field]: continue
            if value is None: issues.append(field + '_not_numeric')
            elif row['metric'] in GRADE and not 1 <= value <= 9: issues.append(field + '_grade_range')
            elif row['metric'] == '백분위' and not 0 <= value <= 100: issues.append(field + '_percentile_range')
        a, b = values.values()
        if a is not None and b is not None:
            if row['metric'] in GRADE and a > b: issues.append('cut_order_requires_review')
            if row['metric'] in SCORE and a < b: issues.append('cut_order_requires_review')
        if row['metric'] in GRADE and row['grade_system'] not in {'5', '9'}:
            issues.append('grade_system_requires_review')
        if row['grade_system'] == '5' and any(v is not None and v > 5 for v in values.values()):
            issues.append('five_grade_range')
    if not row['admission_type']: issues.append('admission_type_unspecified')
    if any('\ufffd' in v for v in row.values()): issues.append('replacement_character')
    # These are explicit total labels, not guessed department aliases.
    aggregate = row['recruit_unit'].strip() in {'합계', '총계', '소계', '계', '전체', '전체 합계', '총합계'}
    if aggregate: issues.append('aggregate_scope')
    if has_cut:
        kind = 'percentile_cut'
    elif row['cut_other'].strip():
        kind = 'other_statistic_or_note'
    elif any(row[c].strip() for c in MEASURES[:5]):
        kind = 'counts_only'
    else:
        kind = 'no_numeric_result'
    # Labels only: no number is extracted from prose or converted into a 50/70% cut.
    labels = [name for name, pattern in [('평균', r'평균'), ('최저', r'최저'), ('최고', r'최고'),
        ('50%', r'50\s*%'), ('70%', r'70\s*%'), ('기타백분위컷', r'(?:75|80|85|90|95|100)\s*%'),
        ('비공개안내', r'비공개|미공개|공개하지|공개안'), ('등록자없음안내', r'등록자\s*없|등록인원\s*없')]
        if re.search(pattern, row['cut_other'])]
    return kind, issues, labels, aggregate


def write_csv(path, rows, fields):
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fields, extrasaction='ignore')
        writer.writeheader(); writer.writerows(rows)


def organize(source=SOURCE, directory_path=DIRECTORY, output=OUTPUT, make_packages=True):
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    with source.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != COLUMNS: raise ValueError('Unexpected source columns')
        all_rows = list(reader)
    if any(None in r or any(v is None for v in r.values()) for r in all_rows):
        raise ValueError('Malformed source record')
    directory = json.loads(directory_path.read_text(encoding='utf-8'))['universities']
    labels = {}
    for university in directory:
        for entry in university['result_entries']:
            label = entry['source_label']
            if label in labels: raise ValueError('Ambiguous campus source label: ' + label)
            labels[label] = (university['id'], university['university'], entry['campus_label'], entry['campus_status'])
    observations = []
    by_key, exact, by_year = defaultdict(list), defaultdict(list), defaultdict(list)
    for record, row in enumerate(all_rows, 2):
        if row['round'] != '수시': continue
        kind, issues, statistics, aggregate = classify(row)
        identity = labels.get(row['university'])
        if not identity:
            issues.append('unmapped_university_label')
            identity = ('', row['university'], '', 'unresolved')
        row_hash = digest([row[c] for c in COLUMNS])
        item = dict(row, master_record=record, row_sha256=row_hash, university_id=identity[0],
            university_name=identity[1], campus_label=identity[2], campus_status=identity[3],
            result_kind=kind, statistic_labels=';'.join(statistics), aggregate=aggregate,
            review_status='draft', issues=issues, comparison_group=digest([row[k] for k in KEY]),
            comparison_status='single_observation', exact_duplicate_of='',
            source_provider=provider(row['source_url']))
        observations.append(item)
        by_key[item['comparison_group']].append(item)
        exact[row_hash].append(item)
        by_year[(identity[0], row['result_year'])].append(item)
    for group in exact.values():
        for item in group[1:]:
            item['exact_duplicate_of'] = group[0]['master_record']
            item['issues'].append('exact_duplicate')
    for group in by_key.values():
        if len(group) < 2: continue
        status = 'same_key_same_values' if len({tuple(i[c] for c in MEASURES) for i in group}) == 1 else 'same_key_different_values'
        for item in group:
            item['comparison_status'] = status
            # This is a candidate, not a proven conflict: note/cohort/method differences may explain it.
            if status == 'same_key_different_values': item['issues'].append('different_values_requires_review')
    observations.sort(key=lambda r: tuple(str(r[k]) for k in ['university_name', 'university', 'result_year', 'admission_type', 'program', 'recruit_unit', 'metric', 'basis', 'source_url', 'source_page', 'master_record']))
    for item in observations:
        item['review_queue'] = 'review_required' if item['issues'] else 'structured_cut_candidate' if item['result_kind'] == 'percentile_cut' else 'source_text_review'
        item['issues'] = ';'.join(item['issues'])
    output.mkdir(parents=True, exist_ok=True)
    meta = ['master_record', 'row_sha256', 'university_id', 'university_name', 'campus_label', 'campus_status',
        'result_kind', 'statistic_labels', 'aggregate', 'review_status', 'review_queue', 'issues',
        'comparison_group', 'comparison_status', 'exact_duplicate_of', 'source_provider']
    write_csv(output/'susi.csv', observations, COLUMNS)
    write_csv(output/'row-index.csv', observations, meta + COLUMNS)
    write_csv(output/'review-queue.csv', [r for r in observations if r['issues']], meta + COLUMNS)
    write_csv(output/'same-key-candidates.csv', [r for r in observations if r['comparison_status'] != 'single_observation'], meta + COLUMNS)
    years = sorted({r['result_year'] for r in observations})
    coverage = []
    for university in directory:
        for year in years:
            items = by_year[(university['id'], year)]
            cuts = sum(r['result_kind'] == 'percentile_cut' for r in items)
            coverage.append(dict(university_id=university['id'], university=university['university'], year=year,
                rows=len(items), campus_source_labels=len({r['university'] for r in items}),
                cut_rows=cuts, other_statistic_or_note_rows=sum(r['result_kind']=='other_statistic_or_note' for r in items),
                counts_only_rows=sum(r['result_kind']=='counts_only' for r in items),
                review_rows=sum(bool(r['issues']) for r in items),
                status='no_collected_susi_rows' if not items else 'partial_cut_data' if cuts else 'other_statistics_or_counts_only'))
    write_csv(output/'university-year-coverage.csv', coverage, list(coverage[0]))
    program_groups = defaultdict(list)
    for item in observations:
        program_groups[tuple(item[k] for k in ['university_name', 'university', 'result_year', 'admission_type', 'program'])].append(item)
    programs = [dict(zip(['university', 'source_label', 'year', 'admission_type', 'program'], key),
        observations=len(items), recruit_unit_labels=len({r['recruit_unit'] for r in items}),
        metrics=';'.join(sorted({r['metric'] for r in items})), source_urls=len({r['source_url'] for r in items}))
        for key, items in program_groups.items()]
    write_csv(output/'program-index.csv', programs, list(programs[0]) if programs else ['university'])
    summary = dict(format='jinhak-navi-susi-organization', version=1, status='draft', calculation_enabled=False,
        source_file=source.name, source_sha256=before, source_rows=len(all_rows),
        susi_rows=len(observations), non_susi_rows=len(all_rows)-len(observations),
        university_labels=len({r['university'] for r in observations}),
        mapped_universities=len({r['university_id'] for r in observations if r['university_id']}),
        directory_universities=len(directory), years=dict(Counter(r['result_year'] for r in observations)),
        admission_types=dict(Counter(r['admission_type'] for r in observations)),
        metrics=dict(Counter(r['metric'] for r in observations)), result_kinds=dict(Counter(r['result_kind'] for r in observations)),
        queues=dict(Counter(r['review_queue'] for r in observations)),
        issue_counts=dict(Counter(code for r in observations for code in r['issues'].split(';') if code)),
        exact_duplicate_rows=sum(len(g)-1 for g in exact.values()),
        different_values_groups=sum(g[0]['comparison_status']=='same_key_different_values' for g in by_key.values()),
        empty_university_years=[r for r in coverage if not r['rows']],
        limitation='Source observations, not unique admissions programs. No approval, score conversion, inferred campus, renamed-unit continuity, or completeness claim.')
    # Round trip is lossless, including newlines/precision/empty cells. The input is never rewritten.
    with (output/'susi.csv').open(encoding='utf-8-sig', newline='') as f:
        restored = list(csv.DictReader(f))
    assert Counter(tuple(r[c] for c in COLUMNS) for r in restored) == Counter(tuple(r[c] for c in COLUMNS) for r in all_rows if r['round']=='수시')
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before
    if make_packages:
        manifest = pack(output/'susi.csv', output/'app-import')
        assert manifest['rows'] == len(observations) and manifest['status'] == 'draft'
    (output/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return summary


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SOURCE)
    parser.add_argument('--directory', type=Path, default=DIRECTORY)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    result = organize(args.source, args.directory, args.output)
    print(json.dumps({k:v for k,v in result.items() if k not in {'empty_university_years', 'limitation'}}, ensure_ascii=False, indent=2))
