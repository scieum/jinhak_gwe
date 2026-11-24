"""Normalize local review data, preserving source fields and unresolved conditions."""
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
CORE = ['국어', '수학', '영어', '탐구']
META = {'id', 'key', 'program_ids', 'unit_ids', 'evidence', 'review_status', 'executable'}
ALIASES = {
    'areas': ('areas', 'subjects', 'candidate_areas', 'eligible_domains', 'eligible_areas'),
    'count': ('count', 'choose', 'select', 'choose_count', 'area_count', 'selection_count', 'selected_area_count', 'best_n'),
    'sum': ('max_sum', 'maximum_sum', 'sum_max', 'sum_limit', 'maximum_grade_sum', 'max_grade_sum', 'grade_sum_at_most', 'grade_sum_max', 'sum_maximum', 'grade_sum'),
    'required_areas': ('required_selected_areas', 'required_domains', 'required_in_selected', 'required_domains_in_count', 'mandatory_areas', 'mandatory_selected_areas', 'designated_required_area'),
    'history_max': ('korean_history_max_grade', 'korean_history_grade_max', 'korean_history_grade_at_most', 'korean_history_max', 'korean_history_maximum_grade', '한국사 최대 등급'),
    'per_area_max': ('max_grade', 'each_grade_max', 'each_area_max_grade', 'per_area_maximum', 'maximum_grade_each'),
    'inquiry_method': ('inquiry_method', 'inquiry_mode', 'inquiry_aggregation', 'inquiry_selection_method', 'inquiry_strategy'),
    'inquiry_count': ('inquiry_count', 'inquiry_subject_count', 'inquiry_top_count', 'highest_inquiry_count'),
}
REVERSE = {alias: canonical for canonical, aliases in ALIASES.items() for alias in aliases}
NO = {'not_applicable', 'not_applied', 'none', 'not_required', 'none_explicit', 'none_by_explicit_exclusive_scope'}
YES = {'applies', 'applied', 'required'}
SUM_OPERATORS = {'choose_sum_at_most', 'sum_grades_lte', 'sum_best_selected_area_grades', 'grade_sum'}


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def applicability(rule):
    signals = []
    for key in ('required', 'applies'):
        if type(rule.get(key)) is bool:
            signals.append({'path': '/' + key, 'value': rule[key]})
    status = rule.get('status')
    if status in NO | YES:
        signals.append({'path': '/status', 'value': status in YES})
    for key in ('expression', 'rule', 'condition'):
        value = rule.get(key)
        if isinstance(value, dict) and any(value.get(k) == 'none' for k in ('kind', 'type', 'operator')):
            signals.append({'path': '/' + key, 'value': False})
    values = {s['value'] for s in signals}
    if len(values) > 1:
        return 'conflict', signals
    if status in {'conditional', 'applies_with_unresolved_condition'}:
        return 'conditional', signals
    if values:
        return ('required' if True in values else 'not_required'), signals
    return 'unspecified', signals


def condition_blocks(rule):
    """Canonicalize names without flattening boolean logic or losing alias conflicts."""
    blocks = []
    def visit(value, pointer):
        if isinstance(value, dict):
            params = defaultdict(list)
            for key, val in value.items():
                if key in REVERSE:
                    params[REVERSE[key]].append({'source_path': pointer + '/' + key, 'value': val})
            if params or any(k in value for k in ('operator', 'kind', 'type')):
                blocks.append({'source_path': pointer or '/', 'operators': {k: value[k] for k in ('operator', 'kind', 'type') if k in value},
                               'parameters': dict(params)})
            for key, val in value.items():
                if key not in META:
                    visit(val, pointer + '/' + key)
        elif isinstance(value, list):
            for i, val in enumerate(value):
                visit(val, pointer + '/' + str(i))
    visit(rule, '')
    return blocks


def criterion_candidate(rule):
    """Strict allowlist. Unconsumed conditions always prevent a runtime-shaped candidate."""
    reasons = set()
    payload = {k: v for k, v in rule.items() if k not in META | {'status'} and not (k in {'required', 'applies'} and type(v) is bool)}
    wrappers = [k for k in ('expression', 'rule', 'condition') if isinstance(payload.get(k), dict)]
    if len(wrappers) > 1:
        return None, ['multiple_condition_containers']
    container = dict(payload)
    if wrappers:
        wrapper = wrappers[0]
        container = dict(payload[wrapper])
        for key in payload.keys() - {wrapper}:
            reasons.add('additional_outer_condition:' + key)
    # A conjunction of one sum rule and one Korean-history upper bound is expressible.
    history = None
    if container.get('operator') == 'all_of':
        terms = container.get('terms', [])
        sum_terms = [t for t in terms if isinstance(t, dict) and t.get('operator') in SUM_OPERATORS]
        history_terms = [t for t in terms if isinstance(t, dict) and t.get('operator') == 'grade_at_most' and t.get('area') == '한국사' and set(t) == {'operator', 'area', 'max_grade'}]
        if set(container) == {'operator', 'terms'} and len(terms) == 2 and len(sum_terms) == len(history_terms) == 1:
            container = dict(sum_terms[0]); history = history_terms[0]['max_grade']
        else:
            return None, sorted(reasons | {'complex_conjunction'})
    operators = [container.pop(key) for key in ('operator', 'type', 'kind') if key in container]
    op = operators[0] if operators else None
    if any(value != op for value in operators):
        reasons.add('conflicting_operators')
    if op is not None and op not in SUM_OPERATORS:
        reasons.add('unsupported_operator:' + str(op))
    found = {}
    used = set()
    for canonical in ('areas', 'count', 'sum', 'required_areas', 'history_max'):
        values = [(key, container[key]) for key in ALIASES[canonical] if key in container]
        used.update(key for key, _ in values)
        if values:
            if any(v != values[0][1] for _, v in values[1:]):
                reasons.add('conflicting_alias:' + canonical)
            found[canonical] = values[0][1]
    if isinstance(container.get('required'), list):
        if 'required_areas' in found and found['required_areas'] != container['required']:
            reasons.add('conflicting_required_areas')
        found['required_areas'] = container['required']; used.add('required')

    areas = found.get('areas')
    mode = None
    if not isinstance(areas, list):
        reasons.add('missing_areas'); areas = []
    normalized_areas = []
    for area in areas:
        if isinstance(area, str) and area in CORE:
            normalized_areas.append(area)
        elif isinstance(area, dict) and set(area) == {'choose_best_one'} and sorted(area['choose_best_one']) == sorted(['사회탐구', '과학탐구']):
            normalized_areas.append('탐구'); mode = 'best'
        else:
            reasons.add('distinct_or_restricted_area:' + json.dumps(area, ensure_ascii=False))
    if len(normalized_areas) != len(set(normalized_areas)):
        reasons.add('duplicate_areas')

    # Explicit method only: a bare inquiry_count=1 does not prove best-of-two.
    for key in ('inquiry', 'inquiry_method'):
        if key not in container:
            continue
        value = container[key]
        if isinstance(value, str) and value.replace(' ', '') in {'사회/과학중상위1', '사탐·과탐중상위1과목', '통합사회/통합과학중우수1과목', '사회/과학중상위1과목', '사회·과학상위1과목'}:
            mode = 'best'; used.add(key)
        elif isinstance(value, dict) and set(value) == {'subjects', 'count', 'method'} and value == {'subjects': '사회/과학', 'count': 1, 'method': '상위1과목'}:
            mode = 'best'; used.add(key)
    if '탐구' in normalized_areas and mode is None:
        reasons.add('inquiry_method_not_explicitly_supported')
    required = found.get('required_areas')
    required = [] if required is None else [required] if isinstance(required, str) else required
    if not isinstance(required, list) or len(required) > 1 or any(a not in normalized_areas for a in required):
        reasons.add('unsupported_required_areas'); required = []
    if history is not None and 'history_max' in found and found['history_max'] != history:
        reasons.add('conflicting_history_max')
    history = found.get('history_max', history)
    count, limit = found.get('count'), found.get('sum')
    if type(count) is not int or not 1 <= count <= len(normalized_areas):
        reasons.add('missing_or_invalid_count')
    if type(limit) is not int or type(count) is not int or not count <= limit <= count * 9:
        reasons.add('missing_or_invalid_sum')
    if history is not None and (type(history) is not int or not 1 <= history <= 9):
        reasons.add('invalid_history_max')
    reasons.update('unmapped_condition:' + key for key in container.keys() - used)
    if reasons:
        return None, sorted(reasons)
    return {'areas': normalized_areas, 'count': count, 'sum': limit,
            'required': required[0] if required else None, 'history_max': history,
            'tamgu': mode or 'best'}, []


def normalize(record):
    rule = record['original_rule']
    state, signals = applicability(rule)
    blocks = condition_blocks(rule)
    if state == 'not_required' and any(item['value'] is not None for block in blocks for key in ('sum', 'per_area_max') for item in block['parameters'].get(key, [])):
        state = 'conflict'
    candidate, reasons = (None, []) if state == 'not_required' else criterion_candidate(rule)
    if state in {'conditional', 'conflict'}:
        candidate = None; reasons = sorted(set(reasons) | {'applicability_' + state})
    category = 'no_minimum_source_statement' if state == 'not_required' else 'criterion_candidate' if candidate else 'needs_condition_review'
    return {'id': record['id'], 'package_id': record['package_id'], 'university': record['university'],
            'campus': record['campus'], 'admission_year': record['admission_year'],
            'source_file': record['source_file'], 'source_pointer': record['source_pointer'], 'source_sha256': record['source_sha256'],
            'applicability': state, 'applicability_signals': signals, 'category': category,
            'condition_blocks': blocks, 'criterion_candidate': candidate, 'review_reasons': reasons,
            'review_status': 'draft', 'executable': False}


def main():
    source = OUT / 'minimum-source-review.json'
    raw = source.read_bytes(); source_hash = sha256(raw).hexdigest()
    records = json.loads(raw)['records']
    normalized = [normalize(r) for r in records]
    by_id = {r['id']: r for r in normalized}
    rules_by_package = defaultdict(list)
    for r in records:
        rules_by_package[r['package_id']].append(r)
    scope, errors, snapshot = [], [], []
    for inv in json.loads((OUT / 'package-inventory.json').read_text(encoding='utf-8')):
        path = ROOT / inv['source_file']; data = path.read_bytes()
        assert sha256(data).hexdigest() == inv['source_sha256'], 'Stale source review; run build.py first.'
        snapshot.append((path, inv['source_sha256']))
        pkg = json.loads(data)
        units = {u['id']: u['name'] for u in pkg['recruit_units']}
        offered = {(p['id'], uid) for p in pkg['programs'] for uid in p['recruit_unit_ids']}
        classified, pending = defaultdict(list), defaultdict(list)
        for r in rules_by_package[pkg['university_id']]:
            for pid in r['original_rule']['program_ids']:
                for uid in r['original_rule']['unit_ids']:
                    classified[pid, uid].append(r['id'])
        for i, entry in enumerate(pkg.get('minimum_scope_pending', [])):
            pending[entry['program_id'], entry['unit_id']].append({'source_pointer': f'/minimum_scope_pending/{i}', 'original': entry})
        for pair in (classified.keys() | pending.keys()) - offered:
            errors.append({'package_id': pkg['university_id'], 'pair': list(pair), 'reason': 'unoffered_pair'})
        for p in pkg['programs']:
            for uid in p['recruit_unit_ids']:
                pair = p['id'], uid
                ids = classified[pair]; waits = pending[pair]
                state = 'conflict' if len(ids) > 1 or (ids and waits) or len(waits) > 1 else 'classified' if ids else 'explicit_pending' if waits else 'unclassified'
                if state == 'conflict':
                    errors.append({'package_id': pkg['university_id'], 'pair': list(pair), 'reason': 'overlapping_scope'})
                scope.append({'package_id': pkg['university_id'], 'university': pkg['university'], 'campus': pkg.get('campus', ''),
                              'admission_year': pkg['admission_year'], 'program_id': p['id'], 'program': p['name'], 'round': p.get('round'),
                              'unit_id': uid, 'unit': units[uid], 'source_file': inv['source_file'], 'source_sha256': inv['source_sha256'],
                              'scope_status': state, 'rule_ids': ids, 'rule_categories': [by_id[i]['category'] for i in ids],
                              'pending': waits, 'review_status': 'draft', 'executable': False})
    assert sha256(source.read_bytes()).hexdigest() == source_hash
    assert all(sha256(p.read_bytes()).hexdigest() == digest for p, digest in snapshot)
    assert len(by_id) == len(records)
    assert len({(r['package_id'], r['program_id'], r['unit_id']) for r in scope}) == len(scope)
    summary = {'source_sha256': source_hash, 'rules': len(normalized), 'categories': dict(Counter(r['category'] for r in normalized)),
               'applicability': dict(Counter(r['applicability'] for r in normalized)), 'scope_pairs': len(scope),
               'scope_statuses': dict(Counter(r['scope_status'] for r in scope)),
               'review_reasons': dict(Counter(reason for r in normalized for reason in r['review_reasons'])), 'integrity_errors': errors,
               'validation': 'Source hashes, unique scoped IDs and referential coverage checked. No official content review or approval.'}
    missing = [r for r in scope if r['scope_status'] == 'unclassified']
    missing.sort(key=lambda r: (r['round'] != '수시', r['university'], r['campus'], r['program'], r['unit']))
    candidates = []
    for row in scope:
        if row['scope_status'] != 'classified':
            continue
        rule = by_id[row['rule_ids'][0]]
        if rule['criterion_candidate'] is not None:
            candidates.append({**row, 'criterion': rule['criterion_candidate'],
                               'source_pointer': rule['source_pointer'], 'approval_status': 'not_reviewed'})
    summary['criterion_candidate_pairs'] = len(candidates)
    summary['unclassified_by_round'] = dict(Counter(r['round'] for r in missing))
    summary['unclassified_packages'] = [
        {'package_id': pid, 'university': university, 'campus': campus, 'pairs': count}
        for (pid, university, campus), count in Counter((r['package_id'], r['university'], r['campus']) for r in missing).most_common()]
    write('minimum-normalized-review.json', {'format': 'unavi-minimum-normalized-review', 'version': 1, 'source_sha256': source_hash, 'review_status': 'draft', 'executable': False, 'records': normalized})
    write('minimum-scope-review.json', {'format': 'unavi-minimum-scope-review', 'version': 1, 'review_status': 'draft', 'executable': False, 'rows': scope})
    write('minimum-unclassified-review.json', {'format': 'unavi-minimum-unclassified-review', 'version': 1, 'review_status': 'draft', 'executable': False, 'rows': missing})
    write('minimum-criterion-candidates.json', {'format': 'unavi-minimum-criterion-candidates', 'version': 1, 'review_status': 'draft', 'executable': False,
                                               'purpose': 'Review candidates only. Not an approved MinimumRule release.', 'rows': candidates})
    write('normalization-summary.json', summary)
    print(json.dumps({k: v for k, v in summary.items() if k not in {'review_reasons', 'source_sha256'}}, ensure_ascii=True))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
