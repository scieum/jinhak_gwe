"""Fetch adiga detail pages (searchSyr=year+1) and their result accordions for cut-gap batch 0."""
import requests,json,re,hashlib,sys,time
from pathlib import Path
from bs4 import BeautifulSoup
P=Path(sys.argv[1])
PAGE='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=%s&searchSyr=%d'
H={'User-Agent':'Mozilla/5.0'}
def save(key,r,meta):
    (P/(key+'.html')).write_text(r.text,encoding='utf8')
    meta.update(bytes=len(r.content),sha256=hashlib.sha256(r.content).hexdigest())
    (P/(key+'.meta.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
for spec in sys.argv[2:]:  # slug:unvCd[:multi]
    slug,cd,*multi=spec.split(':')
    for y in (2024,2025,2026):
        key=f'{slug}-adiga-{y}'+(f'-{cd}' if multi else '')
        url=PAGE%(cd,y+1)
        r=requests.get(url,headers=H,timeout=60);r.raise_for_status();r.encoding='utf8'
        save(key,r,{'url':url,'final_url':r.url,'method':'GET'})
        s=BeautifulSoup(r.text,'html.parser')
        print(key,len(r.content),'tables',len(s.find_all('table')),flush=True)
        time.sleep(1)
        for b in s.select('button[onclick]'):
            if '전형 결과' not in b.get_text():continue
            a=re.findall(r'"([^"]*)"',b['onclick']);assert len(a)==4,b['onclick']
            params=dict(zip(['searchSyr','unvCd','tsrdCmphSlcnArtclUpCd','compUnvCd'],a))
            rr=requests.post('https://www.adiga.kr/uct/acd/ade/criteriaAndResultItemNewAjax.do',data=params,headers={**H,'Referer':url},timeout=60);rr.raise_for_status();rr.encoding='utf8'
            save(key+'-'+a[2],rr,{'url':url,'request_url':rr.url,'method':'POST (public page accordion)','params':params})
            print(' ',key+'-'+a[2],len(rr.content),'tables',len(BeautifulSoup(rr.text,'html.parser').find_all('table')),flush=True)
            time.sleep(1)
