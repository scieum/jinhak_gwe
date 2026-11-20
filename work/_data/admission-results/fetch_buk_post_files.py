"""Public attachment forms observed on official university result pages."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import requests,json,hashlib,re,urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
P=Path(__file__).parent/'national-expansion'
jobs=[]
for f in P.glob('tu-results-list-13-post-*.html'):
 source=json.loads(f.with_suffix('.meta.json').read_text(encoding='utf8'))['url']
 for a in BeautifulSoup(f.read_text(encoding='utf8'),'html.parser').select('a[data-attach]'):
  title=a.get_text(' ',strip=True);y=re.search('202[456]',title)
  if not y:continue
  rd='susi' if '수시' in title else 'jeongsi';ext='xlsx' if 'xlsx' in title else 'pdf'
  jobs.append((f'tu-{y[0]}-{rd}-{ext}',source,urljoin(source,'?mode=download'),{'articleNo':a['data-article'],'attachNo':a['data-attach']}))
for f in list(P.glob('pknu-results-list*-list-*.html'))+[P/'pknu-2026-susi-page.html']:
 source=json.loads(f.with_suffix('.meta.json').read_text(encoding='utf8'))['url']
 for a in BeautifulSoup(f.read_text(encoding='utf8'),'html.parser').select('a[data-file]'):
  title=a.get_text();y=re.search('202[456]',title)
  if not y or '편입' in title:continue
  rd='susi' if '수시' in title else 'jeongsi'
  jobs.append((f'pknu-{y[0]}-{rd}',source,'https://iphak.pknu.ac.kr/lib/down.php',{'number':a['data-file'],'filename':a['data-filename'],'tn':a['data-tn']}))
def fetch(job):
 key,source,url,data=job
 try:
  r=requests.post(url,data=data,headers={'Referer':source,'User-Agent':'Mozilla/5.0'},timeout=45,verify=False);r.raise_for_status()
  ext='pdf' if r.content.startswith(b'%PDF') else 'xlsx' if r.content.startswith(b'PK') else 'html'
  (P/(key+'.'+ext)).write_bytes(r.content)
  m=dict(url=source,request_url=url,method='POST public attachment form',params=data,sha256=hashlib.sha256(r.content).hexdigest(),bytes=len(r.content),ext=ext)
  (P/(key+'.meta.json')).write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
  return dict(key=key,ext=ext,bytes=len(r.content))
 except Exception as e:return dict(key=key,error=str(e))
with ThreadPoolExecutor(max_workers=4) as pool:
 for r in pool.map(fetch,list({j[0]:j for j in jobs}.values())):print(json.dumps(r,ensure_ascii=False))
