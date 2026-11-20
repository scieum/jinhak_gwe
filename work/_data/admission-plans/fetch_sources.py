"""Read public admission-plan pages and keep reproducible local evidence."""
import hashlib
import json
import sys
import io
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup
import fitz
fitz.TOOLS.mupdf_display_errors(False)
fitz.TOOLS.mupdf_display_warnings(False)

ROOT = Path(__file__).resolve().parent
RAW = ROOT / 'sources'


def fetch(job):
    key, url = job['id'], job['url']
    if not key.replace('-', '').replace('_', '').isalnum() or urlparse(url).scheme != 'https':
        raise ValueError('Expected a safe ID and HTTPS URL')
    RAW.mkdir(parents=True, exist_ok=True)
    meta = {'id': key, 'url': url, 'checked_at': datetime.now(timezone.utc).isoformat()}
    try:
        with urlopen(Request(quote(url, safe=':/?&=%+#'), headers={'User-Agent': 'Mozilla/5.0'}), timeout=25) as response:
            data = response.read()
            final_url, status = response.url, response.status
        meta.update(final_url=final_url, status=status, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        if data.startswith(b'%PDF'):
            (RAW / f'{key}.pdf').write_bytes(data)
            doc = fitz.open(stream=data, filetype='pdf')
            pages = [{'pdf_page': i + 1, 'text': page.get_text()} for i, page in enumerate(doc)]
            (RAW / f'{key}.pages.json').write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf8')
            meta.update(kind='pdf', pages=len(pages), has_2028=any('2028' in p['text'].replace(' ', '') for p in pages[:3]))
        elif data.startswith(bytes.fromhex('d0cf11e0a1b11ae1')):
            (RAW / f'{key}.hwp').write_bytes(data)
            import olefile
            with olefile.OleFileIO(io.BytesIO(data)) as document:
                preview = document.openstream('PrvText').read().decode('utf-16le', errors='replace') if document.exists('PrvText') else ''
            (RAW / f'{key}.preview.txt').write_text(preview, encoding='utf8')
            meta.update(kind='hwp', has_2028='2028' in preview.replace(' ', ''))
        elif data.startswith(b'PK'):
            with zipfile.ZipFile(io.BytesIO(data)) as document:
                if 'Contents/content.hpf' in document.namelist():
                    text = '\n'.join(document.read(n).decode('utf8') for n in document.namelist() if n.startswith('Contents/section') and n.endswith('.xml'))
                    (RAW / f'{key}.hwpx').write_bytes(data)
                    meta.update(kind='hwpx', has_2028='2028' in text.replace(' ', ''))
                else:
                    members = []
                    for member in document.infolist():
                        if member.is_dir():
                            continue
                        name = member.filename
                        if not member.flag_bits & 0x800:
                            try:
                                name = name.encode('cp437').decode('cp949')
                            except UnicodeError:
                                pass
                        members.append({'name': name, 'zip_name': member.filename, 'bytes': member.file_size})
                    (RAW / f'{key}.zip').write_bytes(data)
                    meta.update(kind='zip', members=members, has_2028=any('2028' in m['name'] for m in members))
        else:
            soup = BeautifulSoup(data, 'html.parser')
            html = str(soup)
            (RAW / f'{key}.html').write_text(html, encoding='utf8')
            links = [{'text': a.get_text(' ', strip=True), 'url': urljoin(final_url, a.get('href', '')), 'onclick': a.get('onclick', '')} for a in soup.select('a[href],a[onclick]')]
            for tag in soup(['script', 'style', 'noscript']):
                tag.decompose()
            text = soup.get_text('\n', strip=True)
            (RAW / f'{key}.txt').write_text(text, encoding='utf8')
            (RAW / f'{key}.links.json').write_text(json.dumps(links, ensure_ascii=False, indent=2), encoding='utf8')
            meta.update(kind='html', has_2028='2028' in text)
    except Exception as e:
        meta['error'] = str(e)
    (RAW / f'{key}.meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf8')
    return meta


if __name__ == '__main__':
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
    with ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(fetch, jobs):
            print(json.dumps({k: result[k] for k in ['id', 'kind', 'pages', 'has_2028', 'error'] if k in result}, ensure_ascii=True), flush=True)
