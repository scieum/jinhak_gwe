"""Official-source discovery and cached downloads for the Gyeonggi expansion."""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, re, sys
from urllib.parse import urljoin
import requests, urllib3
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent / 'gyeonggi-expansion'
ROOT.mkdir(exist_ok=True)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
def fetch(item):
    key,url=item
    try:
        r=requests.get(url,timeout=40,verify=False,headers={'User-Agent':'Mozilla/5.0'})
        r.raise_for_status()
        ext='pdf' if r.content.startswith(b'%PDF') else ('xlsx' if r.content.startswith(b'PK') else ('xls' if r.content.startswith(bytes.fromhex('d0cf11e0')) else 'html'))
        path=ROOT/f'{key}.{ext}'
        path.write_bytes(r.content)
        if ext=='html':
            r.encoding=r.apparent_encoding
            path.write_text(r.text,encoding='utf-8')
            soup=BeautifulSoup(r.text,'html.parser')
            (ROOT/f'{key}.txt').write_text(soup.get_text(' ',strip=True),encoding='utf-8')
            links=[{'text':a.get_text(' ',strip=True),'url':urljoin(r.url,a.get('href',''))} for a in soup.select('a[href]')]
            (ROOT/f'{key}.links.json').write_text(json.dumps(links,ensure_ascii=False,indent=2),encoding='utf-8')
            selected=[x for x in links if re.search('결과|202[456]|download|첨부|입학|입시',x['text']+' '+x['url'],re.I)]
        elif ext=='pdf':
            import fitz
            doc=fitz.open(path)
            (ROOT/f'{key}.txt').write_text('\n'.join(f'\nPAGE {i+1}\n'+p.get_text(sort=True) for i,p in enumerate(doc)),encoding='utf-8')
            selected={'pages':len(doc)}
        else:
            selected={'format':ext}
        meta={'key':key,'url':url,'final_url':r.url,'sha256':hashlib.sha256(r.content).hexdigest(),'bytes':len(r.content),'path':str(path),'links':selected}
        (ROOT/f'{key}.meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
        return meta
    except Exception as e:return {'key':key,'error':str(e)}
if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    items=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(fetch,items.items()):print(json.dumps(result,ensure_ascii=False))
