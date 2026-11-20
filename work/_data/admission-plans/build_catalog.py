"""Build a factual plan-source catalog, without publishing document text or scoring rules."""
import hashlib
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, quote

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
OUT = PROJECT / 'app/public/data/admission-plans.json'
TOPICS = {
    '모집인원': ['모집인원', '모집인원표'], '지원자격': ['지원자격'],
    '전형방법': ['전형방법', '전형요소', '반영비율'], '수능최저': ['최저학력', '수능최저'],
    '면접': ['면접'], '일정': ['전형일정', '원서접수'], '변경사항': ['변경사항', '주요변경'],
}
NOTICE_NAMES = {
    'dju.ac.kr':'대전대학교', 'hannam.ac.kr':'한남대학교', 'koreatech.ac.kr':'한국기술교육대학교',
    'mokwon.ac.kr':'목원대학교', 'namseoul.net':'남서울대학교', 'seowon.ac.kr':'서원대학교',
    'halla.ac.kr':'한라대학교', 'iajou.ac.kr':'아주대학교', 'acts.ac.kr':'아신대학교',
    'catholic.ac.kr':'가톨릭대학교', 'dyu.ac.kr':'동양대학교', 'joongbu.ac.kr':'중부대학교',
    'sjs.ac.kr':'서울장신대학교', 'sungkyul.ac.kr':'성결대학교', 'suwoncatholic.ac.kr':'수원가톨릭대학교',
    'bpu.ac.kr':'부산장신대학교', 'cdu.ac.kr':'초당대학교', 'chosun.ac.kr':'조선대학교',
    'gimcheon.ac.kr':'김천대학교', 'gjc.ac.kr':'광주가톨릭대학교', 'gwangju.ac.kr':'광주대학교',
    'inha.ac.kr':'인하대학교', 'jj.ac.kr':'전주대학교', 'kaya.ac.kr':'가야대학교',
    'kyungnam.ac.kr':'경남대학교', 'mcu.ac.kr':'목포가톨릭대학교', 'mmu.ac.kr':'국립목포해양대학교',
    'nambu.ac.kr':'남부대학교', 'sgu.ac.kr':'신경주대학교', 'postech.ac.kr':'포항공과대학교',
}


def read(path):
    return json.loads(path.read_text(encoding='utf8'))


def topic_index(pages):
    normalized = [(p['pdf_page'], re.sub(r'[\s\x00-\x1f]+', '', p['text'])) for p in pages]
    return [{'label': label, 'pages': [n for n, text in normalized if any(term in text for term in terms)]}
            for label, terms in TOPICS.items() if any(any(term in text for term in terms) for _, text in normalized)]


def source_document(key, label, landing, visual):
    meta = read(ROOT / 'sources' / (key + '.meta.json'))
    if 'error' in meta or meta.get('kind') not in ['pdf', 'hwp', 'hwpx', 'zip']:
        raise ValueError(f'Unreadable source {key}')
    pages_path = ROOT / 'sources' / (key + '.pages.json')
    pages = read(pages_path) if pages_path.exists() else []
    return {'id': key, 'label': label, 'provider': 'university' if not key.startswith('document-') else 'adiga',
            'source_url': landing, 'download_url': quote(meta['url'], safe=':/?&=%+#'),
            'format': meta['kind'], 'sha256': meta['sha256'], 'checked_at': meta['checked_at'][:10],
            'page_count': meta.get('pages'), 'filename': '',
            'year_check': 'visual' if key in visual else 'text' if meta.get('has_2028') and pages else 'filename' if meta.get('has_2028') else 'portal',
            'topics': topic_index(pages),
            'note': ''}


def build():
    curated = read(ROOT / 'curated.json')
    entries = {}
    for portal in read(ROOT / 'portal-plans.json'):
        match = re.fullmatch(r'(.+)\[([^]]+)\]', portal['name'])
        if not match:
            raise ValueError(portal['name'])
        university, campus = match.groups()
        key = university + '|' + campus
        doc = source_document('document-' + portal['code'], '대학 제공 시행계획 · 어디가', portal['url'], curated['visual_year_checks'])
        entries[key] = {'id': 'plan-' + portal['code'], 'university': university, 'campus': campus,
                        'region': portal['region'], 'year': 2028, 'review_status': 'draft',
                        'documents': [doc], 'notices': [], 'programs': []}
    archive_only = []
    for archive in read(ROOT / 'collection/index.json'):
        with zipfile.ZipFile(ROOT / 'collection' / archive['path']) as container:
            for member in archive['members']:
                match = re.fullmatch(r'(.+)\[([^]]+)\]\[([^]]+)\]_2028_.+', member['name'])
                if not match:
                    raise ValueError(member['name'])
                university, region, campus = match.groups()
                key = university + '|' + campus
                if key in entries:
                    continue
                raw = container.read(member['zip_name'])
                digest = hashlib.sha256(raw).hexdigest()
                document = {'id': 'archive-' + digest[:16], 'label': '2026-05-15 공식 모음집 수록본', 'provider': 'adiga',
                            'source_url': 'https://www.adiga.kr/uct/ces/archiveView.do?menuId=PCUCTCES1000',
                            'download_url': archive['url'], 'format': 'zip', 'sha256': archive['sha256'],
                            'checked_at': archive['checked_at'][:10], 'page_count': None, 'topics': [],
                            'filename': member['name'], 'year_check': 'filename',
                            'note': 'ZIP에서 표시된 대학·캠퍼스 파일을 찾아 확인해 주세요.'}
                entries[key] = {'id': 'plan-' + hashlib.sha256(key.encode('utf8')).hexdigest()[:12], 'university': university, 'campus': campus,
                                'region': region, 'year': 2028, 'review_status': 'draft', 'documents': [document], 'notices': [], 'programs': []}
                archive_only.append({'university': university, 'campus': campus, 'file': member['name'], 'member_sha256': digest})
    # Attach only explicitly identified university notices, not generic search-result pages.
    for notice in read(ROOT / 'discovered-notices.json'):
        host = urlparse(notice['url']).hostname or ''
        name = next((name for domain, name in NOTICE_NAMES.items() if host == domain or host.endswith('.' + domain)), None)
        meta_path = ROOT / 'sources' / (notice['id'] + '.meta.json')
        if not name or not meta_path.exists() or 'error' in read(meta_path) or not read(meta_path).get('has_2028'):
            continue
        if '재외국민' in notice['title'] or '외국인' in notice['title']:
            continue
        for entry in entries.values():
            if entry['university'] == name:
                title = notice['title'].split('\n')[0][:180]
                entry['notices'].append({'title': title, 'url': quote(notice['url'], safe=':/?&=%+#'), 'checked_at': read(meta_path)['checked_at'][:10], 'change_notice': '변경' in title or '수정' in title})
    for extra in curated['universities']:
        entry = entries[extra['name'] + '|' + extra['campus']]
        document = source_document(extra['document'], extra['version_label'], extra['notice_url'], curated['visual_year_checks'])
        entry['documents'].insert(0, document)
        entry['programs'] = [{**p, 'document_id': document['id']} for p in extra['programs']]
    result = {'format': 'jinhak-navi-admission-plans', 'version': 1, 'year': 2028,
              'checked_at': datetime.now(timezone.utc).date().isoformat(), 'review_status': 'draft',
              'entries': sorted(entries.values(), key=lambda e: (e['university'], e['campus']))}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    report = {'entries': len(entries), 'university_names': len(set(e['university'] for e in entries.values())),
              'program_summaries': sum(len(e['programs']) for e in entries.values()),
              'archive_only': archive_only, 'source_only': sum(not e['programs'] for e in entries.values())}
    (ROOT / 'coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({k: v for k, v in report.items() if k != 'archive_only'}))


if __name__ == '__main__':
    build()
