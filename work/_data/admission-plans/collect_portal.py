"""Collect university-provided 2028 plan links from the public Adiga university pages."""
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / 'sources'
HEADERS = {'User-Agent': 'Mozilla/5.0'}


def fetch_university(university):
    url = 'https://www.adiga.kr/ucp/uvt/uni/univDetail.do?' + urlencode({'menuId': 'PCUVTINF2000', 'searchSyr': '2028', 'unvCd': university['code']})
    record = {**university, 'url': url, 'checked_at': datetime.now(timezone.utc).isoformat()}
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=25) as response:
            raw = response.read()
        (SOURCES / f"portal-{university['code']}.html").write_bytes(raw)
        soup = BeautifulSoup(raw, 'html.parser')
        for a in soup.select('a[onclick]'):
            if '시행계획' not in a.get_text():
                continue
            args = re.findall(r"'([^']*)'", a.get('onclick', ''))
            if 'fnUnvFileDownOne' in a.get('onclick', '') and len(args) >= 5 and args[4] == '2028':
                record['file_url'] = 'https://www.adiga.kr/cmm/com/file/fileDown.do?' + urlencode({'fileId': args[0], 'fileSn': args[1]})
        record['official_links'] = []
        for a in soup.select('a'):
            if a.get_text(' ', strip=True) not in ['홈페이지', '입시홈페이지']:
                continue
            href = a.get('href', '')
            if not href.startswith('http'):
                args = re.findall(r"['\"](https?://[^'\"]+)['\"]", a.get('onclick', ''))
                href = args[0] if args else ''
            if href.startswith('https:'):
                record['official_links'].append({'label': a.get_text(' ', strip=True), 'url': href})
    except Exception as e:
        record['error'] = str(e)
    return record


if __name__ == '__main__':
    params = {'searchSyr': '2027', 'pagination.currentPage': '1', 'pagination.cntPerPage': '300', 'searchConstIndex': '0'}
    request = Request('https://www.adiga.kr/uct/acd/ade/criteriaAndResultAjax.do', data=urlencode(params).encode(), headers={**HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'})
    with urlopen(request, timeout=30) as response:
        raw = response.read()
    (SOURCES / 'portal-roster.html').write_bytes(raw)
    universities = []
    for el in BeautifulSoup(raw, 'html.parser').select('input[onchange]'):
        match = re.search(r'fnSelCompUnv\(this, (\{.*\})\)', el['onchange'])
        if match:
            value = json.loads(match[1])
            universities.append({'code': value['unvCd'], 'name': value['unvNm'], 'region': value['stdClsfRgnNm']})
    print(json.dumps({'roster': len(universities)}), flush=True)
    records = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for record in pool.map(fetch_university, universities):
            records.append(record)
            if len(records) % 40 == 0:
                print(json.dumps({'checked': len(records), 'plans': sum('file_url' in r for r in records)}), flush=True)
    (ROOT / 'portal-plans.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({'total': len(records), 'plans': sum('file_url' in r for r in records), 'errors': sum('error' in r for r in records)}), flush=True)
