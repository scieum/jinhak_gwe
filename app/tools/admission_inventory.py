"""Build a private, resumable inventory. Never release draft admissions data."""
from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANS = ROOT / 'work/_data/admission-plans'
OUT = PLANS / 'structured'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    catalog_path = ROOT / 'app/public/data/admission-plans.json'
    results_path = ROOT / 'app/public/data/collected-results/index.json'
    catalog, results = read(catalog_path), read(results_path)
    priorities = [
        ('한림대학교', '본교'), ('강원대학교', '본교'), ('강원대학교', '제2캠퍼스'),
        ('가톨릭관동대학교', '본교'), ('춘천교육대학교', '본교'), ('가천대학교', '본교'),
        ('한국교원대학교', '본교'), ('포항공과대학교', '본교'),
    ]
    regions = ['강원', '서울', '경기', '충북', '충남', '대전', '세종', '인천', '제주',
               '대구', '경북', '부산', '울산', '경남', '광주', '전북', '전남']
    result_names = {r['university'] for r in results['universities']}
    inventory = []
    for e in catalog['entries']:
        documents = []
        for d in e['documents']:
            path = PLANS / 'sources' / f"{d['id']}.{d['format']}"
            text_path = PLANS / 'sources' / f"{d['id']}.pages.json"
            documents.append({'id': d['id'], 'format': d['format'], 'url': d['download_url'],
                'sha256': d['sha256'], 'local_exists': path.exists(),
                'local_hash_matches': sha(path) == d['sha256'] if path.exists() else None,
                'page_text_exists': text_path.exists(), 'checked_at': d['checked_at']})
        package_path = OUT / 'universities' / f"{e['id']}.json"
        package = read(package_path) if package_path.exists() else None
        source_review_path = OUT / 'source-reviews' / f"{e['id']}.json"
        source_review = read(source_review_path) if source_review_path.is_file() else None
        candidate_path = OUT / 'result-links' / f"{e['id']}.json"
        candidate = read(candidate_path) if candidate_path.is_file() else None
        candidate_current = bool(candidate and package and candidate['package_sha256']==sha(package_path))
        if package or source_review:
            existing_ids = {d['id'] for d in documents}
            extra_sources = ([package['source']] + package.get('additional_sources', [])) if package else []
            extra_sources += source_review.get('sources', []) if source_review else []
            for d in extra_sources:
                if d['id'] in existing_ids: continue
                existing_ids.add(d['id'])
                path = ROOT / d['local_path']
                documents.append({'id': d['id'], 'format': path.suffix.lstrip('.'),
                    'url': d['url'], 'sha256': d['sha256'], 'local_exists':path.is_file(),
                    'local_hash_matches':sha(path)==d['sha256'] if path.is_file() else None,
                    'page_text_exists':False, 'checked_at':d.get('checked_at'),
                    'role':'structured_primary_source' if package and d['id']==package['source']['id'] else 'additional_official_source'})
        key = (e['university'], e['campus'])
        rank = priorities.index(key) if key in priorities else 100 + (regions.index(e['region']) if e['region'] in regions else 99)
        inventory.append({'id': e['id'], 'university': e['university'], 'campus': e['campus'],
            'region': e['region'], 'year': e['year'], 'priority': rank,
            'existing_summary_count': len(e['programs']), 'documents': documents,
            'exact_result_name_candidate': e['university'] if e['university'] in result_names else None,
            'result_mapping_status': 'not_reviewed',
            'result_candidate_report': candidate_path.relative_to(ROOT).as_posix() if candidate else None,
            'result_candidate_report_current': candidate_current,
            'result_candidate_pairs': sum(x['status']=='same_label_candidate' for x in candidate['program_unit_links']) if candidate_current else 0,
            'status': package.get('collection_status', 'partial') if package else source_review['status'] if source_review else 'queued',
            'source_review': source_review_path.relative_to(ROOT).as_posix() if source_review else None,
            'source_review_next_action': source_review.get('next_action') if source_review else None,
            'completion_review': source_review.get('completion_review') if source_review else None,
            'structured_program_count': len(package.get('programs', [])) if package else 0,
            'structured_unit_count': len(package.get('recruit_units', [])) if package else 0,
            'fixed_quota_checks': len(package.get('validation', {}).get('quota_checks', [])) if package else 0,
            'issues_count': len(package.get('issues', [])) if package else len(source_review.get('issues', [])) if source_review else 0,
            'review_status': 'draft', 'package': str(package_path.relative_to(ROOT)).replace('\\', '/') if package else None})
    inventory.sort(key=lambda e: (e['priority'], e['university'], e['campus']))
    write(OUT / 'inventory.json', {'format': 'admission-collection-inventory', 'version': 1,
        'catalog_sha256': sha(catalog_path), 'results_index_sha256': sha(results_path),
        'counts': {'plan_entries': len(inventory), 'university_names': len({e['university'] for e in inventory}),
                   'result_labels': len(results['universities']), 'result_rows': results['rows']},
        'entries': inventory})
    fields = ['id', 'university', 'campus', 'region', 'year', 'priority', 'status',
              'existing_summary_count', 'structured_program_count', 'structured_unit_count',
              'fixed_quota_checks', 'issues_count', 'result_candidate_pairs', 'result_candidate_report_current', 'review_status', 'package']
    with (OUT / 'inventory.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore'); w.writeheader(); w.writerows(inventory)
    # Pending evidence and human review do not block extraction of the next school.
    write(OUT / 'queue.json', [{'id': e['id'], 'university': e['university'], 'campus': e['campus'],
        'status': e['status'], 'completion_review': e['completion_review'],
        'next_action': 'continue_extraction' if e['status'] == 'partial' else e['source_review_next_action'] or 'start_source_review'}
        for e in inventory if e['status'] in ('queued', 'partial', 'source_review_in_progress')])
    write(OUT / 'review-queue.json', [{'id':e['id'], 'university':e['university'], 'campus':e['campus'],
        'issues_count':e['issues_count'], 'package':e['package']} for e in inventory if e['package']])
    write(OUT / 'results-inventory.json', {'source_sha256': results['source_sha256'],
        'note': 'Original university labels, not canonical institution IDs. Presence is not completeness.',
        'universities': results['universities']})
    print(json.dumps({'plan_entries': len(inventory), 'statuses': dict(Counter(e['status'] for e in inventory)),
        'local_hash_mismatches': sum(d['local_hash_matches'] is False for e in inventory for d in e['documents'])}, ensure_ascii=True))


if __name__ == '__main__':
    build()
