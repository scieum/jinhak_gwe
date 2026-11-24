"""Prepare isolated data handoff artifacts; never modify app or original inputs."""
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
PACKAGES = ROOT / 'work/_data/admission-plans/structured/universities'
TEXT_KEYS = ('source_text', 'source_statement', 'source_conditions', 'source_wording')


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def main():
    records, inventory, problems, inputs = [], [], [], []
    statuses = Counter()
    fields = Counter()
    for path in sorted(PACKAGES.glob('*.json')):
        raw = path.read_bytes()
        package = json.loads(raw.decode('utf-8-sig'))
        relative = path.relative_to(ROOT).as_posix()
        fingerprint = sha256(raw).hexdigest()
        inputs.append((path, fingerprint))
        programs = {p['id']: p for p in package['programs']}
        units = {u['id']: u for u in package['recruit_units']}
        documents = [package['source'], *package.get('additional_sources', [])]
        docs = {d['id']: d for d in documents}
        totals = {key: len(package.get(key, [])) for key in
                  ('programs', 'recruit_units', 'allocations', 'minimum_rules', 'minimum_scope_pending')}
        inventory.append({'package_id': package['university_id'], 'university': package['university'],
                          'campus': package.get('campus', ''), 'admission_year': package['admission_year'],
                          'source_file': relative, 'source_sha256': fingerprint, **totals})
        for index, rule in enumerate(package.get('minimum_rules', [])):
            record_id = f"{package['university_id']}:minimum_rules:{index}"
            issues = []
            for pid in rule['program_ids']:
                if pid not in programs:
                    issues.append(f'unknown_program:{pid}')
                elif not set(rule['unit_ids']) <= set(programs[pid]['recruit_unit_ids']):
                    issues.append(f'unoffered_unit_in_program:{pid}')
            for uid in rule['unit_ids']:
                if uid not in units:
                    issues.append(f'unknown_unit:{uid}')

            evidence_docs = set()
            def walk(value):
                if isinstance(value, dict):
                    if 'document_id' in value:
                        evidence_docs.add(value['document_id'])
                        if value['document_id'] not in docs:
                            issues.append(f"unknown_document:{value['document_id']}")
                    if 'pdf_pages' in value:
                        doc = docs.get(value.get('document_id', package['source']['id']), {})
                        if not all(type(p) is int and 1 <= p <= doc.get('pages', 0) for p in value['pdf_pages']):
                            issues.append('evidence_page_out_of_range')
                    for item in value.values():
                        walk(item)
                elif isinstance(value, list):
                    for item in value:
                        walk(item)
            walk(rule)
            if rule.get('executable') is not False or rule.get('review_status') != 'draft':
                issues.append('unexpected_source_review_state')
            has_text = any(isinstance(rule.get(k), str) and rule[k].strip() for k in TEXT_KEYS)
            statuses[str(rule.get('status', '(status field absent)'))] += 1
            fields.update(rule.keys())
            records.append({
                'id': record_id, 'package_id': package['university_id'],
                'university': package['university'], 'campus': package.get('campus', ''),
                'admission_year': package['admission_year'],
                'source_file': relative, 'source_pointer': f'/minimum_rules/{index}',
                'source_sha256': fingerprint,
                'programs': [{k: programs[pid].get(k) for k in ('id', 'name', 'round', 'type')}
                             for pid in rule['program_ids'] if pid in programs],
                'recruit_units': [{'id': uid, 'name': units[uid]['name']} for uid in rule['unit_ids'] if uid in units],
                'evidence_documents': [docs[did] for did in sorted(evidence_docs) if did in docs],
                'has_source_sentence': bool(has_text), 'original_rule': rule,
                'review_status': 'draft', 'executable': False,
                'checks': {'references_valid': not issues, 'issues': issues},
            })
            problems.extend({'record_id': record_id, 'issue': issue} for issue in issues)

    # Detect concurrent changes before writing a mixed snapshot.
    assert all(sha256(p.read_bytes()).hexdigest() == digest for p, digest in inputs), 'Source changed during build; rerun.'
    assert len({r['id'] for r in records}) == len(records)
    assert len(records) == sum(p['minimum_rules'] for p in inventory)
    payload = {'format': 'unavi-minimum-source-review', 'version': 1, 'review_status': 'draft',
               'executable': False, 'purpose': 'Lossless source review; not MinimumRule runtime data.', 'records': records}
    write('minimum-source-review.json', payload)
    write('package-inventory.json', inventory)
    summary = {'packages': len(inventory), 'counts': {k: sum(p[k] for p in inventory) for k in totals},
               'minimum_source_records': len(records),
               'with_source_sentence': sum(r['has_source_sentence'] for r in records),
               'without_source_sentence': sum(not r['has_source_sentence'] for r in records),
               'source_status_counts': dict(statuses), 'source_field_counts': dict(fields),
               'reference_issues': problems, 'original_rules_preserved': True,
               'validation_scope': 'Local package references and PDF page ranges; not original-document content review.'}
    write('summary.json', summary)
    # Round-trip proof: output rule dictionaries are identical to source dictionaries.
    saved = json.loads((OUT / 'minimum-source-review.json').read_text(encoding='utf-8'))
    by_file = {}
    for record in saved['records']:
        source = by_file.setdefault(record['source_file'], None)
        if source is None:
            source = json.loads((ROOT / record['source_file']).read_text(encoding='utf-8-sig'))
            by_file[record['source_file']] = source
        idx = int(record['source_pointer'].rsplit('/', 1)[1])
        assert record['original_rule'] == source['minimum_rules'][idx]
        assert record['review_status'] == 'draft' and record['executable'] is False
    print(json.dumps({k: v for k, v in summary.items() if k not in ('source_field_counts', 'source_status_counts', 'reference_issues')}, ensure_ascii=True))
    print(f'reference_issues={len(problems)}; round_trip=passed')
    if problems:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
