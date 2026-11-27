"""Fetch public adiga detail pages (+ result accordions) for the cut-gap batch.
Saves national-expansion/<slug>-adiga-cut-<year>[-<code>].html + .meta.json (sha256).
usage: python fetch_cut_gap_adiga.py slug:unvCd [slug:unvCd ...]"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import requests,json,re,hashlib,sys,time
P=Path(__file__).parent/'national-expansion'
PAGE='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=%s&searchSyr=%d'
AJAX='https://www.adiga.kr/uct/acd/ade/criteriaAndResultItemNewAjax.do'
def save(key,r,meta):
 r.encoding='utf8';(P/(key+'.html')).write_text(r.text,encoding='utf8')
 meta.update(bytes=len(r.content),sha256=hashlib.sha256(r.content).hexdigest())
 (P/(key+'.meta.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
 return r.text
def job(arg):
 slug,cd=arg;log=[]
 for y in (2024,2025,2026):
  url=PAGE%(cd,y+1);key=f'{slug}-adiga-cut-{y}'
  r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=40);r.raise_for_status()
  html=save(key,r,{'url':url,'method':'GET'});s=BeautifulSoup(html,'html.parser')
  log.append((key,len(s.find_all('table'))))
  for b in s.select('button[onclick]'):
   if '결과' not in b.get_text() or 'fnItemSearchInclude' not in b['onclick']:continue
   a=re.findall(r'"([^"]*)"',b['onclick']);assert len(a)==4,b['onclick']
   p=dict(zip(['searchSyr','unvCd','tsrdCmphSlcnArtclUpCd','compUnvCd'],a))
   time.sleep(1)
   r2=requests.post(AJAX,data=p,headers={'Referer':url,'User-Agent':'Mozilla/5.0'},timeout=40);r2.raise_for_status()
   k2=f'{key}-{a[2]}';h2=save(k2,r2,{'url':url,'request_url':AJAX,'method':'POST (public page accordion)','params':p})
   log.append((k2,len(BeautifulSoup(h2,'html.parser').find_all('table'))))
  time.sleep(1)
 return log
if __name__=='__main__':
 with ThreadPoolExecutor(max_workers=3) as pool:
  for res in pool.map(job,[a.split(':') for a in sys.argv[1:]]):print(json.dumps(res,ensure_ascii=False))
