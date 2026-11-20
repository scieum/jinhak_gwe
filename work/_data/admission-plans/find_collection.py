"""Read the public Adiga archive search using the form declared by its page."""
import json
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
url = 'https://www.adiga.kr/uct/ces/archiveAjax.do'
params = {'pagination.currentPage': '1', 'pagination.cntPerPage': '30', 'searchSyr': '2028',
          'searchKey': 'searchTtlCn', 'searchWord': '대학입학전형시행계획', 'prtlBbsId': ''}
with urlopen(Request(url, data=urlencode(params).encode(), headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://www.adiga.kr/uct/ces/archiveView.do?menuId=PCUCTCES1000'}), timeout=30) as response:
    raw = response.read()
(ROOT / 'sources/adiga-search.html').write_bytes(raw)
soup = BeautifulSoup(raw, 'html.parser')
files = []
for el in soup.select('[onclick]'):
    onclick = el.get('onclick', '')
    if 'fnDownloadAll(' not in onclick:
        continue
    title = el.get('title') or el.get_text(' ', strip=True)
    if '2028' not in title:
        continue
    matches = re.search(r'fnDownloadAll\((\[.*?\])\)', onclick)
    if matches:
        for item in json.loads(matches[1]):
            files.append({'title': title, 'url': 'https://www.adiga.kr/cmm/com/file/fileDown.do?' + urlencode(item)})
(ROOT / 'collection-files.json').write_text(json.dumps(files, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps(files, ensure_ascii=True))
