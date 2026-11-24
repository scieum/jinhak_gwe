"""Apply only source-backed Hallym minimum additions, preserving all other data."""
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import runpy

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
PACKAGE = ROOT / 'work/_data/admission-plans/structured/universities/plan-0000198.json'


def main():
    raw = PACKAGE.read_bytes()
    original = json.loads(raw)
    package = deepcopy(original)
    complete = runpy.run_path(str(ROOT / 'work/_data/admission-plans/structured/hallym_minimum.py'))['complete_susi_minimum']
    result = complete(package, ROOT / original['source']['local_path'])
    mutable = {'minimum_rules', 'minimum_scope_status', 'minimum_scope_pending'}
    assert {k: v for k, v in original.items() if k not in mutable} == {k: v for k, v in package.items() if k not in mutable}
    old_rules = {r['id']: r for r in original['minimum_rules']}
    assert all(r == next(new for new in package['minimum_rules'] if new['id'] == key) for key, r in old_rules.items())
    duplicate = deepcopy(package)
    complete(duplicate, ROOT / original['source']['local_path'])
    assert duplicate == package, 'Supplement must be idempotent.'
    # Special-case regression checks: medical/nursing cannot inherit a blanket none.
    by_pair = {(pid, uid): r for r in package['minimum_rules'] for pid in r['program_ids'] for uid in r['unit_ids']}
    for pid, uid in [('s-holistic-school', 'unit-24'), ('s-holistic-regional', 'unit-24'), ('s-holistic-doctor', 'unit-24'),
                     ('s-grade-general', 'unit-25'), ('s-grade-regional', 'unit-25')]:
        assert by_pair[pid, uid]['status'] == 'applies'
    for pid, uid in [('s-holistic-rural', 'unit-24'), ('s-holistic-regional-equity', 'unit-24'),
                     ('s-grade-care1', 'unit-25'), ('s-grade-regional-equity', 'unit-25')]:
        assert by_pair[pid, uid]['status'] == 'not_applicable'
    validate = runpy.run_path(str(ROOT / 'app/tools/validate_admission_collection.py'))['validate']
    errors = validate(package)
    assert not errors, errors
    assert PACKAGE.read_bytes() == raw, 'Package changed concurrently; rerun.'
    encoded = (json.dumps(package, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if raw != encoded:
        PACKAGE.write_bytes(encoded)
    report = {'package': PACKAGE.relative_to(ROOT).as_posix(), 'source_document_sha256': original['source']['sha256'],
              'package_sha256_before': sha256(raw).hexdigest(), 'package_sha256_after': sha256(encoded).hexdigest(),
              **result, 'checks': {'unrelated_fields_preserved': True, 'existing_rules_preserved': True,
                                  'idempotent': True, 'medical_nursing_exceptions': True, 'package_validation_errors': errors}}
    (OUT / 'hallym-supplement-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True))


if __name__ == '__main__':
    main()
