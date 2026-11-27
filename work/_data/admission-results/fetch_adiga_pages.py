"""Save the public adiga university pages (results year y -> searchSyr y+1) as national-expansion/<slug>-adiga-<y>.html + .meta.json.
Usage: python fetch_adiga_pages.py slug:unvCd [slug:unvCd ...]   then  python fetch_adiga_results.py <slug>-adiga-2026 (accordions)
"""
from pathlib import Path
import requests,json,hashlib,sys,time
P=Path(__file__).parent/'national-expansion'
URL='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=%s&searchSyr=%d'
for arg in sys.argv[1:]:
 slug,cd=arg.split(':')
 for y in (2024,2025,2026):
  key=f'{slug}-adiga-{y}';url=URL%(cd,y+1)
  r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=60);r.raise_for_status();r.encoding='utf8'
  (P/(key+'.html')).write_text(r.text,encoding='utf8')
  (P/(key+'.meta.json')).write_text(json.dumps({'key':key,'url':url,'final_url':r.url,'method':'GET','bytes':len(r.content),'sha256':hashlib.sha256(r.content).hexdigest()},ensure_ascii=False,indent=2),encoding='utf8')
  print(key,len(r.content));time.sleep(1)
