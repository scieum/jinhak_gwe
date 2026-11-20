"""Cache university logos from their exact campus records on the public Adiga portal.
Original raster bytes are preserved; no invented or recolored university marks.
"""
import hashlib
import io
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup
from PIL import Image

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
CACHE = ROOT / 'work/_data/university-logos'
OUTPUT = APP / 'public/assets/universities'
PORTAL = 'https://www.adiga.kr'
ROSTER = PORTAL + '/ucp/uvt/uni/univView.do?menuId=PCUVTINF2000'
OFFICIAL = {
    'plan-0000254': ('https://www.bnue.ac.kr/content/intro03_02', 'https://www.bnue.ac.kr/resources/custom/images/main/sub/bnue_logo.png'),
    'plan-0000238': ('https://www.daejeon.ac.kr/', 'https://www.daejeon.ac.kr/images/common/logo.png'),
    'plan-0000184': ('http://www.calvin.ac.kr/main/index.do', 'http://www.calvin.ac.kr/jsp/main/images/h_logo.png'),
}


def fetch(url):
    parsed = urlparse(url)
    if not ((parsed.scheme == 'https' and parsed.hostname in {'www.adiga.kr', 'www.bnue.ac.kr', 'www.daejeon.ac.kr'})
            or (parsed.scheme == 'http' and parsed.hostname == 'www.calvin.ac.kr')):
        raise ValueError('Unexpected logo source host')
    with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
        data = response.read(5_000_001)
    if len(data) > 5_000_000:
        raise ValueError('Image exceeds size limit')
    return data


def logo_source(entry, codes):
    if entry['id'] in OFFICIAL:
        return OFFICIAL[entry['id']]
    key = re.sub(r'\s', '', f"{entry['university']}[{entry['campus']}]")
    code = codes[key]
    page = PORTAL + '/ucp/uvt/uni/univDetail.do?' + urlencode({'menuId': 'PCUVTINF2000', 'searchSyr': '2028', 'unvCd': code})
    cached = CACHE / f'{code}.html'
    previous = ROOT / 'work/_data/admission-plans/sources' / f'portal-{code}.html'
    raw = cached.read_bytes() if cached.exists() else previous.read_bytes() if previous.exists() else fetch(page)
    cached.write_bytes(raw)
    image = BeautifulSoup(raw, 'html.parser').select_one('img.logoImg')
    if image is None or 'imageFileDown.do?' not in image.get('src', ''):
        raise ValueError('University logo is not provided')
    return page, urljoin(PORTAL, image['src'])


def write_mappings(records):
    mapping = {r['id']: r['file'] for r in records if 'file' in r}
    names = {}
    for record in sorted(records, key=lambda r: r['campus'] != '본교'):
        if 'file' in record:
            names.setdefault(record['university'], record['file'])
    for filename, data in [('universityLogos.json', mapping), ('universityLogoNames.json', names)]:
        (APP / 'src/data' / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return mapping


def build():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    roster = fetch(ROSTER)
    (CACHE / 'roster.html').write_bytes(roster)
    codes = {}
    for label in BeautifulSoup(roster, 'html.parser').select('label[for^="UNI_"]'):
        match = re.search(r'(.+\[[^]]+\])', label.get_text(' ', strip=True))
        if match:
            codes[re.sub(r'\s', '', match[1])] = label['for'][4:]
    catalog = json.loads((APP / 'public/data/admission-plans.json').read_text(encoding='utf-8'))

    def discover(entry):
        record = {k: entry[k] for k in ('id', 'university', 'campus')}
        try:
            page, source = logo_source(entry, codes)
            return {**record, 'source_page': page, 'source_image': source}
        except Exception as error:
            return {**record, 'error': str(error)}

    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(discover, catalog['entries']))
    # This campus has no separate portal mark; use the same university's main-campus logo.
    main = next(r for r in records if r['id'] == 'plan-0000028')
    for record in records:
        if record['id'] == 'plan-f27ad1f504ed' and main.get('source_image'):
            record.pop('error', None)
            record.update(source_page=main['source_page'], source_image=main['source_image'], shared_from=main['id'])

    def download(url):
        try:
            cache = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.image')
            raw = cache.read_bytes() if cache.exists() else fetch(url)
            image = Image.open(io.BytesIO(raw))
            extension = {'PNG': 'png', 'JPEG': 'jpg', 'GIF': 'gif', 'WEBP': 'webp', 'BMP': 'bmp'}.get(image.format)
            if not extension or min(image.size) < 16:
                raise ValueError('Unsupported or undersized logo')
            width, height = image.size
            image.verify()
            digest = hashlib.sha256(raw).hexdigest()
            filename = f'{digest}.{extension}'
            (OUTPUT / filename).write_bytes(raw)
            cache.write_bytes(raw)
            return url, {'file': filename, 'sha256': digest, 'bytes': len(raw), 'width': width, 'height': height}
        except Exception as error:
            return url, {'error': str(error)}

    urls = sorted({r['source_image'] for r in records if 'source_image' in r})
    images = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, (url, result) in enumerate(pool.map(download, urls), 1):
            images[url] = result
            if i % 40 == 0:
                print(json.dumps({'downloaded': i, 'total': len(urls)}), flush=True)
    records = [{**r, **images.get(r.get('source_image'), {})} for r in records]
    manifest = {'provider': '대입정보포털 어디가 및 대학 공식 홈페이지', 'checked_at': datetime.now(timezone.utc).isoformat(), 'entries': records}
    (OUTPUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    mapping = write_mappings(records)
    print(json.dumps({'cards': len(records), 'logos': len(mapping), 'unique_images': len({r['file'] for r in records if 'file' in r}), 'missing': [r for r in records if 'file' not in r]}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    build()
