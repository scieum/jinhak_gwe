"""Export source references only; never export executable minimum criteria."""
import json
from collections import defaultdict
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'work/_data/data-integration'
OUT = ROOT / 'app/public/data/minimum-references'


def read(name):
    return json.loads((SOURCE / name).read_text(encoding='utf-8'))


def encode(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')


def safe_url(value):
    parsed = urlsplit(value)
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc) and not parsed.username and not parsed.password


def main():
    inventory = read('package-inventory.json')
    source = read('minimum-source-review.json')
    normalized = read('minimum-normalized-review.json')
    scopes = read('minimum-scope-review.json')
    assert normalized['source_sha256'] == sha256((SOURCE / 'minimum-source-review.json').read_bytes()).hexdigest()
    for data in [source, normalized, scopes]:
        assert data['review_status'] == 'draft' and data['executable'] is False
    originals = {r['id']: r for r in source['records']}
    normalized_rules = {r['id']: r for r in normalized['records']}
    assert originals.keys() == normalized_rules.keys()
    grouped = defaultdict(list)
    for row in scopes['rows']:
        grouped[row['package_id']].append(row)
    outputs, entries = [], []
    for entry in inventory:
        raw = (ROOT / entry['source_file']).read_bytes()
        assert sha256(raw).hexdigest() == entry['source_sha256'], f"Stale package: {entry['package_id']}"
        package = json.loads(raw.decode('utf-8-sig'))
        docs = {d['id']: d for d in [package['source'], *package.get('additional_sources', [])]}

        def evidence(value):
            doc = docs[value['document_id']]
            url = doc['url']
            assert safe_url(url), f'Unsafe source URL: {entry["package_id"]}'
            pages = value.get('pdf_pages', [])
            assert all(isinstance(p, int) and 1 <= p <= doc['pages'] for p in pages)
            return {'document_id': doc['id'], 'url': url, 'sha256': doc['sha256'],
                    'pages': pages, 'checked_at': doc.get('checked_at', '')[:10]}

        rules = []
        for record in source['records']:
            if record['package_id'] != entry['package_id']:
                continue
            assert record['checks']['references_valid'] and record['source_sha256'] == entry['source_sha256']
            rule = record['original_rule']
            rules.append({'id': record['id'], 'source_pointer': record['source_pointer'],
                          'applicability': normalized_rules[record['id']]['applicability'],
                          'sentences': [rule[k].strip() for k in ('source_text', 'source_statement', 'source_conditions', 'source_wording')
                                        if isinstance(rule.get(k), str) and rule[k].strip()],
                          'evidence': evidence(rule['evidence'])})
        rows = []
        keys = set()
        for row in grouped[entry['package_id']]:
            assert row['source_sha256'] == entry['source_sha256']
            key = (row['program_id'], row['unit_id'])
            assert key not in keys
            keys.add(key)
            assert all(rid in originals and originals[rid]['package_id'] == entry['package_id'] for rid in row['rule_ids'])
            rows.append({**{k: row[k] for k in ('program_id', 'program', 'round', 'unit_id', 'unit', 'scope_status', 'rule_ids')},
                         'pending': [{'reason': p['original'].get('reason', ''),
                                      'evidence': evidence(p['original']['evidence']) if p['original'].get('evidence') else None}
                                     for p in row['pending']]})
        metadata = {k: entry[k] for k in ('package_id', 'university', 'campus', 'admission_year', 'source_sha256')}
        payload = {'format': 'unavi-minimum-reference-package', 'version': 1, 'review_status': 'draft', 'executable': False,
                   **metadata, 'rules': rules, 'rows': rows}
        content = encode(payload)
        digest = sha256(content).hexdigest()
        outputs.append((f'{digest}.json', content))
        entries.append({**metadata, 'file': f'{digest}.json', 'sha256': digest, 'bytes': len(content), 'rules': len(rules), 'rows': len(rows)})
    manifest = {'format': 'unavi-minimum-reference-index', 'version': 1, 'review_status': 'draft', 'executable': False,
                'prepared_at': '2026-11-24', 'source_sha256': normalized['source_sha256'], 'entries': entries}
    assert sum(e['rules'] for e in entries) == len(originals)
    assert sum(e['rows'] for e in entries) == len(scopes['rows'])
    # Check the whole snapshot again before publishing its manifest.
    assert all(sha256((ROOT / e['source_file']).read_bytes()).hexdigest() == e['source_sha256'] for e in inventory)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, content in outputs:
        (OUT / name).write_bytes(content)
    (OUT / 'index.json').write_bytes(encode(manifest))
    print(json.dumps({'packages': len(entries), 'rules': len(originals), 'scopes': len(scopes['rows']),
                      'bytes': sum(e['bytes'] for e in entries), 'executable': False}))


if __name__ == '__main__':
    main()
