from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import requests,json,re,hashlib
C=Path(__file__).parent/'national-expansion'
def fetch(job):
 name,y=job;params={'searchSyr':str(y),'searchUnvNm':name,'pagination.currentPage':'1','pagination.cntPerPage':'100','searchConstIndex':'0'}
 url='https://www.adiga.kr/uct/acd/ade/criteriaAndResultAjax.do'
 r=requests.post(url,data=params,timeout=40);r.raise_for_status();r.encoding='utf8';key=f'honam-roster-{name}-{y}'
 (C/(key+'.html')).write_text(r.text,encoding='utf8');(C/(key+'.meta.json')).write_text(json.dumps(dict(url=url,params=params,sha256=hashlib.sha256(r.content).hexdigest()),ensure_ascii=False),encoding='utf8')
 out=[]
 for t in BeautifulSoup(r.text,'html.parser').select('input[onchange]'):
  m=re.search(r'fnSelCompUnv\(this, (\{.*\})\)',t['onchange'])
  if m:
   d=json.loads(m[1]);out.append({k:d[k] for k in ['unvCd','unvNm','stdClsfRgnNm']})
 return dict(name=name,year=y,results=out)
with ThreadPoolExecutor(max_workers=3) as pool:
 results=list(pool.map(fetch,[(n,y) for n in ['광신','한일장신','예원'] for y in [2026,2027]]))
(C/'honam-roster-extra.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(results,ensure_ascii=False,indent=2))
