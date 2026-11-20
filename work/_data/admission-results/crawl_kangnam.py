from expand_gyeonggi import fetch,ROOT
from urllib.parse import urlparse,parse_qs
import json,concurrent.futures
seen=set();queue=[]
for f in ROOT.glob('kangnam-20*-1.meta.json'):
 d=json.loads(f.read_text(encoding='utf8'));queue.append((d['key'],d['url']))
for iteration in range(20):
 todo={}
 for key,url in queue:
  seen.add(key)
  for a in json.loads((ROOT/(key+'.links.json')).read_text(encoding='utf8')):
   if not a['url'].startswith('https://admission.kangnam.ac.kr/iphak/stats.htm?'):continue
   q=parse_qs(urlparse(a['url']).query)
   if all(x in q for x in ['s_year','s_ctg_cd','page','gubun']) and q['gubun']==['score']:
    k=f"kangnam-{q['s_year'][0]}-{q['s_ctg_cd'][0]}-{q['page'][0]}"
    if q['s_year'][0] in ['2024','2025','2026'] and k not in seen:todo[k]=a['url']
 if not todo:break
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  results=list(pool.map(fetch,todo.items()))
 for r in results:
  if 'error' in r:raise RuntimeError(r)
 queue=list(todo.items())
print('pages',len(seen))
