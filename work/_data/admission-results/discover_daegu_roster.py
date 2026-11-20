from pathlib import Path
import requests,json,re,hashlib
from bs4 import BeautifulSoup
P=Path(__file__).parent/'national-expansion'
out=[]
for region in ['03','14']:
 params={'searchSyr':'2027','searchStdClsfRgnCn':region,'pagination.currentPage':'1','pagination.cntPerPage':'100','searchConstIndex':'0'}
 url='https://www.adiga.kr/uct/acd/ade/criteriaAndResultAjax.do'
 r=requests.post(url,data=params,timeout=40);r.raise_for_status();r.encoding='utf8'
 (P/f'adiga-roster-{region}.html').write_text(r.text,encoding='utf8')
 for t in BeautifulSoup(r.text,'html.parser').select('input[onchange]'):
  a=t['onchange'];m=re.search(r'fnSelCompUnv\(this, (\{.*\})\)',a)
  if not m:continue
  d=json.loads(m[1]);out.append({k:d[k] for k in ['unvCd','unvNm','stdClsfRgnNm']})
 (P/f'adiga-roster-{region}.meta.json').write_text(json.dumps({'url':url,'params':params,'sha256':hashlib.sha256(r.content).hexdigest()},ensure_ascii=False,indent=2),encoding='utf8')
(P/'daegu-roster.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(out,ensure_ascii=False,indent=2))
