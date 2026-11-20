"""Read the public result accordions using the request declared in their page JS."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import requests,json,re,hashlib,sys
P=Path(__file__).parent/'national-expansion'
def fetch(job):
 key,params,source=job
 try:
  r=requests.post('https://www.adiga.kr/uct/acd/ade/criteriaAndResultItemNewAjax.do',data=params,headers={'Referer':source,'User-Agent':'Mozilla/5.0'},timeout=40);r.raise_for_status();r.encoding='utf8'
  (P/(key+'.html')).write_text(r.text,encoding='utf8')
  meta={'url':source,'request_url':r.url,'method':'POST (public page accordion)','params':params,'bytes':len(r.content),'sha256':hashlib.sha256(r.content).hexdigest()}
  (P/(key+'.meta.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
  return {'key':key,'bytes':len(r.content),'tables':len(BeautifulSoup(r.text,'html.parser').find_all('table'))}
 except Exception as e:return {'key':key,'error':str(e)}
if __name__=='__main__':
 jobs=[]
 for key in sys.argv[1:]:
  s=BeautifulSoup((P/(key+'.html')).read_text(encoding='utf8'),'html.parser');source=json.loads((P/(key+'.meta.json')).read_text())['url']
  for b in s.select('button[onclick]'):
   if '전형 결과' not in b.get_text():continue
   a=re.findall(r'"([^"]*)"',b['onclick']);assert len(a)==4
   jobs.append((key+'-'+a[2],dict(zip(['searchSyr','unvCd','tsrdCmphSlcnArtclUpCd','compUnvCd'],a)),source))
 with ThreadPoolExecutor(max_workers=4) as pool:
  for r in pool.map(fetch,jobs):print(json.dumps(r,ensure_ascii=False))
