"""Fill admission-plans.json programs from the local structured 2028 plan packages.

Pipeline: build_catalog.py (sources, documents, curated summaries) -> this script (per-type rows).
Only values with a PDF page in the same document are published; the rest stay '원문 확인 필요'.
Entries with hand-written curated summaries keep them. Everything stays draft and reference-only.
"""
import importlib.util
import json
import logging
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
PLANS = ROOT / 'work/_data/admission-plans'
PACKAGES = PLANS / 'structured/universities'
SCOPES = ROOT / 'work/_data/data-integration/minimum-scope-review.json'
NORMALIZED = ROOT / 'work/_data/data-integration/minimum-normalized-review.json'
OUT = ROOT / 'app/public/data/admission-plans.json'
UNKNOWN = '원문 확인 필요'
TYPES = {'학생부교과': '교과', '학생부위주(교과)': '교과', '학생부종합': '종합', '학생부위주(종합)': '종합',
         '실기/실적': '실기', '실적': '실기', '특기자': '실기'}


def https_url(value):
    parsed = urlsplit(value or '')
    return parsed.scheme == 'https' and bool(parsed.netloc) and not parsed.username and not parsed.password


def local_original(src, sources_dir):
    """The kept original whose bytes match the recorded hash, or None."""
    for path in ([ROOT / src['local_path']] if src.get('local_path') else []) + [sources_dir / (src['id'] + '.pdf')]:
        if path.is_file() and sha256(path.read_bytes()).hexdigest() == src['sha256']:
            return path
    return None


@lru_cache(maxsize=None)
def pdf_mentions_2028(path, first_pages=3):
    from pypdf import PdfReader
    logging.getLogger('pypdf').setLevel(logging.ERROR)
    try:
        reader = PdfReader(str(path))
        return any('2028' in (page.extract_text() or '') for page in reader.pages[:first_pages])
    except Exception:  # unreadable text layer: no text year check
        return False


def plan_document(src, sources_dir=PLANS / 'sources'):
    """A package source as a catalog PlanDocument, or None when it cannot carry page evidence."""
    if src.get('kind') != 'pdf' or 'archive' in src or not isinstance(src.get('pages'), int) or src['pages'] < 1:
        return None  # ZIP members and HWP have no linkable PDF page
    if not https_url(src.get('url')) or not re.fullmatch(r'[a-f0-9]{64}', src.get('sha256', '')):
        return None
    meta_path = sources_dir / (src['id'] + '.meta.json')
    meta = json.loads(meta_path.read_text(encoding='utf-8')) if meta_path.exists() else {}
    if meta and meta.get('sha256') != src['sha256']:
        return None
    checked = src.get('checked_at') or meta.get('checked_at') or ''
    original = None
    if not re.match(r'\d{4}-\d{2}-\d{2}', checked) or not (src.get('has_2028') or meta.get('has_2028')):
        original = local_original(src, sources_dir)
        if not original:
            return None
    if not re.match(r'\d{4}-\d{2}-\d{2}', checked):
        # Download date of the hash-verified original is the date it was checked.
        checked = datetime.fromtimestamp(original.stat().st_mtime, timezone.utc).isoformat()
    if src.get('has_2028') or meta.get('has_2028') or pdf_mentions_2028(original):
        year_check = 'text'
    elif '2028' in unquote(src['url']) + src.get('attachment_label', ''):
        year_check = 'filename'
    else:
        return None  # 2028 not confirmed for this file
    landing = src.get('notice_url') if https_url(src.get('notice_url')) else src['url']
    return {'id': src['id'], 'label': '입학처 2028 시행계획 원문', 'provider': 'adiga' if 'adiga.kr' in src['url'] else 'university',
            'source_url': quote(landing, safe=':/?&=%+#'), 'download_url': quote(src['url'], safe=':/?&=%+#'),
            'format': 'pdf', 'sha256': src['sha256'], 'checked_at': checked[:10], 'page_count': src['pages'],
            'filename': '', 'year_check': year_check, 'topics': [], 'note': ''}


def quota_text(quota):
    quota = quota if isinstance(quota, dict) else {}
    if quota.get('status') == 'fixed' and isinstance(quota.get('value'), int):
        return f"{quota['value']}명"
    if quota.get('status') == 'unlimited':
        return '인원 제한 없음'
    if quota.get('status') in ('carryover', 'carryover_only'):
        return '수시 미충원 이월 인원'
    return UNKNOWN


def same_doc_pages(evidence, doc_ids):
    return list((evidence or {}).get('pdf_pages') or []) if (evidence or {}).get('document_id') in doc_ids else []


def method_text(program, doc_ids):
    """'1단계 서류 100% → 2단계 1단계 70% · 면접 30%' from the evaluation table, with its pages."""
    stages, pages = [], []
    for stage in program.get('evaluation') or []:
        elements, found = stage.get('elements') or {}, same_doc_pages(stage.get('evidence'), doc_ids)
        if not elements or not found or sum(elements.values()) != 100:
            return None, []
        parts = ' · '.join(f"{'1단계 성적' if k == 'stage1' else k} {v}%" for k, v in elements.items())
        stages.append(f"{str(stage['stage']).removesuffix('단계')}단계 {parts}" if len(program['evaluation']) > 1 else parts)
        pages += found
    return (' → '.join(stages), pages) if stages else (None, [])


def minimum_text(rows, rules, applicability, doc_ids):
    """Explicit rule statuses only. Pending, unclassified or other-document evidence -> unknown."""
    if not rows or any(r['scope_status'] != 'classified' for r in rows):
        return None, []
    kinds, pages = set(), []
    for rule_id in {i for r in rows for i in r['rule_ids']}:
        rule = rules[int(rule_id.rsplit(':', 1)[1])]
        found = same_doc_pages(rule.get('evidence'), doc_ids)
        if not found or applicability.get(rule_id) not in ('required', 'not_required'):
            return None, []
        kinds.add(applicability[rule_id])
        pages += found
    if kinds == {'not_required'}:
        return '미적용(원문 명시)', pages
    return ('적용 · 기준은 원문 확인' if kinds == {'required'} else '모집단위별 적용 다름 · 원문 확인'), pages


QUALIFIERS = [lambda p: p.get('round'), lambda p: p.get('type'), lambda p: p.get('group') and f"{str(p['group']).removesuffix('군')}군",
              lambda p: '정원외' if p.get('out_of_quota') else '정원내' if p.get('out_of_quota') is False else None,
              lambda p: p.get('campus'), lambda p: p.get('admission_term'), lambda p: p.get('intake_month')]


def unique_names(programs):
    """Row keys and interests use the name, so same-name programs get the fields that tell them apart."""
    groups = defaultdict(list)
    for p in programs:
        groups[p['name']].append(p)
    names = {}
    for name, group in groups.items():
        used = [q for q in QUALIFIERS if len(group) > 1 and len({str(q(p)) for p in group}) > 1]
        for p in group:
            tags = [str(q(p)) for q in used if q(p)]
            names[id(p)] = f"{name} ({' · '.join(tags)})" if tags else name
    seen = Counter()
    for p in programs:  # last resort: source order number
        seen[names[id(p)]] += 1
    order = Counter()
    for p in programs:
        label = names[id(p)]
        if seen[label] > 1:
            order[label] += 1
            names[id(p)] = f'{label} #{order[label]}'
    return names


def package_programs(package, entry_docs, scope_rows, applicability):
    sources = {s['id']: s for s in [package['source'], *package.get('additional_sources', [])]}
    units = {u['id']: u['name'] for u in package.get('recruit_units', [])}
    rows_by_program = defaultdict(list)
    for row in scope_rows:
        rows_by_program[row['program_id']].append(row)
    by_sha = {d['sha256']: d['id'] for d in entry_docs.values() if d['format'] == 'pdf' and d['page_count']}
    names, programs, added, skipped = unique_names(package['programs']), [], {}, Counter()
    for p in package['programs']:
        evidence = p.get('evidence') or {}
        doc_id, pages = evidence.get('document_id'), list(evidence.get('pdf_pages') or [])
        doc_ids = {doc_id}
        same_bytes = by_sha.get((sources.get(doc_id) or {}).get('sha256'))
        if doc_id not in entry_docs and same_bytes:
            doc_id = same_bytes; doc_ids.add(doc_id)  # the catalog already lists this exact file under another id
        doc = entry_docs.get(doc_id) or added.get(doc_id) or plan_document(sources.get(doc_id) or {})
        if not pages or not doc or doc['format'] != 'pdf' or not p.get('name'):
            skipped['no_pdf_page_evidence'] += 1
            continue
        if doc_id not in entry_docs:
            added[doc_id] = doc
        method, method_pages = method_text(p, doc_ids)
        minimum, minimum_pages = minimum_text(rows_by_program.get(p.get('id'), []), package.get('minimum_rules', []), applicability, doc_ids)
        interview = '있음' if method and re.search('면접', method) else None
        unit_ids = p.get('recruit_unit_ids') or []
        all_pages = sorted(set(pages + method_pages + minimum_pages))
        if not all(isinstance(n, int) and 1 <= n <= doc['page_count'] for n in all_pages):
            skipped['page_out_of_range'] += 1
            continue
        programs.append({
            'name': names[id(p)], 'round': p.get('round') or UNKNOWN, 'type': TYPES.get(p.get('type'), p.get('type') or UNKNOWN),
            'unit': units[unit_ids[0]] if len(unit_ids) == 1 and len(units.get(unit_ids[0], '')) <= 20 else f'모집단위 {len(unit_ids)}개' if unit_ids else '원문 확인',
            'quota': quota_text(p.get('quota')), 'method': method or UNKNOWN, 'minimum': minimum or UNKNOWN,
            'interview': interview or UNKNOWN, 'eligibility': UNKNOWN, 'pages': all_pages, 'document_id': doc_id,
        })
    return programs, list(added.values()), skipped


def load_build_catalog():
    spec = importlib.util.spec_from_file_location('build_catalog', PLANS / 'build_catalog.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    load_build_catalog().build()  # base catalog: documents + curated summaries
    catalog = json.loads(OUT.read_text(encoding='utf-8'))
    curated = {u['name'] + '|' + u['campus'] for u in json.loads((PLANS / 'curated.json').read_text(encoding='utf-8'))['universities']}
    scopes = json.loads(SCOPES.read_text(encoding='utf-8'))
    normalized = json.loads(NORMALIZED.read_text(encoding='utf-8'))
    assert scopes['executable'] is False and normalized['executable'] is False
    applicability = {r['id']: r['applicability'] for r in normalized['records']}
    rows = defaultdict(list)
    for row in scopes['rows']:
        rows[row['package_id']].append(row)
    entries = {e['id']: e for e in catalog['entries']}
    report = Counter()
    for path in sorted(PACKAGES.glob('plan-*.json')):
        raw = path.read_bytes()
        package = json.loads(raw.decode('utf-8-sig'))
        entry = entries.get(package['university_id'])
        if not entry or package.get('admission_year') != 2028 or package.get('review_status') != 'draft':
            report['package_not_matched'] += 1
            continue
        if entry['university'] + '|' + entry['campus'] in curated:
            report['curated_kept'] += 1
            continue
        package_rows = [r for r in rows[package['university_id']] if r['source_sha256'] == sha256(raw).hexdigest()]
        if rows[package['university_id']] and not package_rows:
            report['minimum_review_stale'] += 1  # package changed after normalize_minimum.py: no minimum values
        programs, docs, skipped = package_programs(package, {d['id']: d for d in entry['documents']}, package_rows, applicability)
        report.update(skipped)
        entry['programs'], entry['documents'] = programs, entry['documents'] + docs
        report['programs'] += len(programs)
    # Source check date, not build date: the newest document check in the catalog.
    catalog['checked_at'] = max(d['checked_at'] for e in catalog['entries'] for d in e['documents'])
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    filled = [e for e in catalog['entries'] if e['programs']]
    programs = [p for e in filled for p in e['programs']]
    summary = {**report, 'entries_with_programs': len(filled), 'entries': len(catalog['entries']), 'program_rows': len(programs),
               'filled': {k: sum(p.get(k, UNKNOWN) != UNKNOWN for p in programs) for k in ['quota', 'method', 'minimum', 'interview', 'eligibility']},
               'types': Counter(p['type'] for p in programs).most_common()}
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
