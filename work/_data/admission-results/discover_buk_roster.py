from pathlib import Path
import requests,json,re,hashlib
from bs4 import BeautifulSoup
P=Path(__file__).parent/'national-expansion'
url='https://www.adiga.kr/uct/acd/ade/criteriaAndResultView.do?menuId=PCUCTACD2000'
r=requests.get(url,timeout=40);r.raise_for_status();r.encoding='utf8'
(P/'buk-roster-search.html').write_text(r.text,encoding='utf8')
s=BeautifulSoup(r.text,'html.parser')
regions=[(s.find(id=o['for'])['value'],o.get_text(strip=True)) for o in s.select('label[for]') if o.get_text(strip=True) in ['부산','울산','경남','경상남도']]
print('regions',regions,flush=True)
assert len(regions)==3,regions
out=[]
for region,name in regions:
 params={'searchSyr':'2027','searchStdClsfRgnCn':region,'pagination.currentPage':'1','pagination.cntPerPage':'100','searchConstIndex':'0'}
 url='https://www.adiga.kr/uct/acd/ade/criteriaAndResultAjax.do'
 r=requests.post(url,data=params,timeout=40);r.raise_for_status();r.encoding='utf8'
 (P/f'buk-roster-{region}.html').write_text(r.text,encoding='utf8')
 for t in BeautifulSoup(r.text,'html.parser').select('input[onchange]'):
  m=re.search(r'fnSelCompUnv\(this, (\{.*\})\)',t['onchange'])
  if not m:continue
  d=json.loads(m[1]);out.append({k:d[k] for k in ['unvCd','unvNm','stdClsfRgnNm']})
 (P/f'buk-roster-{region}.meta.json').write_text(json.dumps({'url':url,'params':params,'sha256':hashlib.sha256(r.content).hexdigest()},ensure_ascii=False,indent=2),encoding='utf8')
(P/'buk-roster.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(out,ensure_ascii=False,indent=2))
