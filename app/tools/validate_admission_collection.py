"""Read-only structural checks for private draft admissions packages."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'work/_data/admission-plans/structured'


def validate(package):
    errors = []
    def check(ok, message):
        if not ok: errors.append(message)
    check(package['review_status'] == 'draft', 'Collection must not self-approve')
    check(package['calculation_enabled'] is False, 'Draft calculation must be disabled')
    source = package['source']
    sources = {s['id']:s for s in [source] + package.get('additional_sources', [])}
    hwp_extractions = {}
    for sid, item in sources.items():
        path = (ROOT / item['local_path']).resolve()
        check(path.is_relative_to(ROOT.resolve()), f'Source outside project: {sid}')
        if path.is_file(): check(hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], f'Source hash mismatch: {sid}')
        else: errors.append(f'Source file missing: {sid}')
        extraction = item.get('extraction')
        if extraction:
            extracted_path = (ROOT / extraction['local_path']).resolve()
            check(extracted_path.is_relative_to(ROOT.resolve()), f'Extraction outside project: {sid}')
            if extracted_path.is_file():
                check(hashlib.sha256(extracted_path.read_bytes()).hexdigest()==extraction['sha256'], f'Extraction hash mismatch: {sid}')
                extracted = json.loads(extracted_path.read_text(encoding='utf-8'))
                check(extracted['source_sha256']==item['sha256'], f'Extraction source mismatch: {sid}')
                hwp_extractions[sid] = extracted
            else: errors.append(f'Extraction missing: {sid}')
    programs = {p['id']: p for p in package['programs']}
    units = {u['id']: u for u in package['recruit_units']}
    check(len(programs) == len(package['programs']), 'Duplicate program ID')
    check(len(units) == len(package['recruit_units']), 'Duplicate unit ID')
    sums, keys = Counter(), set()
    for a in package['allocations']:
        key = a['program_id'], a['unit_id']
        check(key not in keys, f'Duplicate allocation {key}'); keys.add(key)
        check(key[0] in programs and key[1] in units, f'Unknown allocation {key}')
        check(type(a['quota']) is int and a['quota'] >= 0, f'Invalid quota {key}')
        sums[a['program_id']] += a['quota']
    for pool in package['pooled_quotas']:
        check(pool['program_id'] in programs, 'Unknown pool program')
        check(bool(pool['unit_ids']) and set(pool['unit_ids']) <= units.keys(), 'Unknown pool units')
        check(len(pool['unit_ids']) == len(set(pool['unit_ids'])), 'Duplicate unit in pool')
        if pool.get('includes_fixed_allocations'):
            check(sums[pool['program_id']] <= pool['quota'], 'Fixed allocation exceeds inclusive pool')
            sums[pool['program_id']] = pool['quota']
        else:
            sums[pool['program_id']] += pool['quota']
    for a in package.get('unlimited_allocations', []) + package.get('carryover_allocations', []) + package.get('unspecified_allocations', []):
        check(a['program_id'] in programs and a['unit_id'] in units, 'Unknown nonfixed allocation')
        check(a['quota'] is None, 'Nonfixed quota must remain null')
        if a['program_id'] in programs: check(a['unit_id'] in programs[a['program_id']]['recruit_unit_ids'], 'Nonfixed allocation outside program scope')
    for a in package.get('unit_quota_caps', []):
        check(a['program_id'] in programs and a['unit_id'] in units, 'Unknown unit cap scope')
        check(a['quota'] is None and type(a['maximum']) is int and a['maximum']>=0, 'Unit cap treated as fixed quota')
        check(any(pool['program_id']==a['program_id'] and a['unit_id'] in pool['unit_ids'] for pool in package['pooled_quotas']), 'Unit cap outside pooled quota')
    for p in programs.values():
        if p['quota']['status'] == 'fixed': check(sums[p['id']] == p['quota']['value'], f"Quota total {p['id']}")
        check(set(p['recruit_unit_ids']) <= units.keys(), 'Unknown program scope')
        for v in p.get('evaluation_variants', []):
            check(set(v['unit_ids']) <= set(p['recruit_unit_ids']), 'Evaluation outside program scope')
        stages = p.get('evaluation', []) + [s for v in p.get('evaluation_variants', []) for s in v['stages']]
        for s in stages: check(abs(sum(s['elements'].values()) - 100) < 1e-8, 'Evaluation weights do not sum to 100')
    shared_source = package.get('shared_quota_source')
    shared_refs = package.get('shared_quota_references', [])
    if shared_refs: check(bool(shared_source), 'Shared quota reference missing ledger')
    if shared_source:
        ledger_path = (ROOT / shared_source['local_path']).resolve()
        check(ledger_path.is_relative_to(ROOT.resolve()), 'Shared quota ledger outside project')
        if ledger_path.is_file():
            check(hashlib.sha256(ledger_path.read_bytes()).hexdigest()==shared_source['sha256'], 'Shared quota ledger hash mismatch')
            ledger = json.loads(ledger_path.read_text(encoding='utf-8'))
            check(ledger['id']==shared_source['id'], 'Shared quota ledger ID mismatch')
            check(ledger['review_status']=='draft' and ledger['calculation_enabled'] is False, 'Shared quota ledger enabled')
            check(ledger['source']['sha256']==source['sha256'], 'Shared quota source mismatch')
            pools = {p['id']:p for p in ledger['pools']}
            check(len(pools)==len(ledger['pools']), 'Duplicate shared quota pool ID')
            for pool in pools.values():
                check(type(pool['quota']) is int and pool['quota']>=0, 'Invalid shared pool quota')
                member_keys = [(m['university_id'],m['program_id']) for m in pool['members']]
                check(len(member_keys)==len(set(member_keys)), 'Duplicate shared pool member')
                for member in pool['members']:
                    peer_path = DATA / 'universities' / (member['university_id']+'.json')
                    if not peer_path.is_file():
                        errors.append('Shared pool campus package missing'); continue
                    peer = package if member['university_id']==package['university_id'] else json.loads(peer_path.read_text(encoding='utf-8'))
                    peer_program = next((p for p in peer['programs'] if p['id']==member['program_id']), None)
                    check(bool(peer_program), 'Shared pool campus program missing')
                    if peer_program:
                        check(peer_program['quota']=={'status':'shared_pool','value':None}, 'Shared pool copied into campus quota')
                        check(set(member['unit_ids'])==set(peer_program['recruit_unit_ids']), 'Shared pool member scope mismatch')
                    peer_refs = [r for r in peer.get('shared_quota_references',[]) if r['pool_id']==pool['id'] and r['program_id']==member['program_id']]
                    check(len(peer_refs)==1, 'Shared pool campus reference missing or duplicated')
            for ref in shared_refs:
                check(ref['quota'] is None, 'Shared pool local quota must remain null')
                check(ref['program_id'] in programs and ref['pool_id'] in pools, 'Unknown shared pool reference')
                check(not any(a['program_id']==ref['program_id'] for a in package['allocations']+package['pooled_quotas']), 'Shared pool counted again locally')
                if ref['pool_id'] in pools:
                    members = [m for m in pools[ref['pool_id']]['members'] if m['university_id']==package['university_id'] and m['program_id']==ref['program_id']]
                    check(len(members)==1, 'Shared pool membership missing or duplicated')
                    if members: check(set(ref['unit_ids'])==set(members[0]['unit_ids']), 'Shared pool local scope mismatch')
        else: errors.append('Shared quota ledger missing')
    minimum_pairs = set()
    for m in package['minimum_rules']:
        check(m['review_status'] == 'draft' and m['executable'] is False, 'Minimum rule enabled')
        check(set(m['program_ids']) <= programs.keys() and set(m['unit_ids']) <= units.keys(), 'Unknown minimum scope')
        for pid in m['program_ids']:
            check(set(m['unit_ids']) <= set(programs[pid]['recruit_unit_ids']), 'Minimum targets unoffered unit')
            for uid in m['unit_ids']:
                pair = (pid, uid)
                check(pair not in minimum_pairs, f'Duplicate minimum scope: {pair}')
                minimum_pairs.add(pair)
    if package.get('minimum_scope_status') == 'all_susi_and_flexible_pairs_classified_with_explicit_pending_scope':
        pending = {(x['program_id'],x['unit_id']) for x in package['minimum_scope_pending']}
        expected = {(p['id'],uid) for p in programs.values() if p['round'] in ('수시','자율화') for uid in p['recruit_unit_ids']}
        check(not pending & minimum_pairs, 'Pending minimum also classified')
        check(expected == pending | minimum_pairs, 'Minimum scope coverage mismatch')
    if package.get('minimum_scope_status') == 'all_susi_and_jeongsi_pairs_classified':
        expected = {(p['id'],uid) for p in programs.values() if p['round'] in ('수시','정시') for uid in p['recruit_unit_ids']}
        check(expected == minimum_pairs, 'All-round minimum scope coverage mismatch')
    if package.get('minimum_scope_status') == 'all_program_pairs_classified_with_explicit_pending_scope':
        pending_list = [(x['program_id'],x['unit_id']) for x in package['minimum_scope_pending']]
        pending = set(pending_list)
        expected = {(p['id'],uid) for p in programs.values() for uid in p['recruit_unit_ids']}
        check(len(pending_list)==len(pending), 'Duplicate pending minimum scope')
        check(not pending & minimum_pairs, 'Pending minimum also classified')
        check(expected == pending | minimum_pairs, 'All-program minimum scope coverage mismatch')
    def walk(value):
        if isinstance(value, dict):
            if 'document_id' in value:
                check(value['document_id'] in sources, 'Unknown evidence document')
            if 'pdf_pages' in value:
                doc = sources.get(value.get('document_id', source['id']), {})
                check(all(type(n) is int and 1 <= n <= doc.get('pages', 0) for n in value['pdf_pages']), 'Evidence page outside source')
            if 'hwp_table_index' in value:
                extracted = hwp_extractions.get(value.get('document_id'), {})
                index = value['hwp_table_index']; tables = extracted.get('tables', [])
                valid = type(index) is int and 0 <= index < len(tables)
                check(valid, 'Evidence HWP table outside source')
                if valid and 'row_index' in value:
                    check(any(int(c['attributes']['row'])==value['row_index'] and int(c['attributes']['col'])==value['column_index']
                              for c in tables[index]['cells']), 'Evidence HWP cell missing')
            if 'hwp_text_range' in value:
                extracted = hwp_extractions.get(value.get('document_id'), {})
                lo,hi = value['hwp_text_range']
                check(type(lo) is int and type(hi) is int and 0 <= lo < hi <= len(extracted.get('texts', [])), 'Evidence HWP text range outside source')
            for v in value.values(): walk(v)
        elif isinstance(value, list):
            for v in value: walk(v)
    walk(package)
    return errors


def main():
    reports = []
    for path in sorted((DATA / 'universities').glob('*.json')):
        package = json.loads(path.read_text(encoding='utf-8'))
        errors = validate(package)
        reports.append({'file':path.name, 'pass':not errors, 'errors':errors})
    print(json.dumps(reports, ensure_ascii=True, indent=2))
    raise SystemExit(1 if any(not r['pass'] for r in reports) else 0)


if __name__ == '__main__':
    main()
