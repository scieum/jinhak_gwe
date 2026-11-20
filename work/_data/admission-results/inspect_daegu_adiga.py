from normalize_incheon_adiga import htmlgrid
from normalize_national import *
from bs4 import BeautifulSoup
for slug in sys.argv[1:]:
 for y in [2024,2025]:
  key=f'{slug}-adiga-{y}';p=CACHE/(key+'.html')
  if not p.exists():continue
  s=BeautifulSoup(p.read_text(encoding='utf8'),'html.parser')
  print('\n',key)
  for i,t in enumerate(s.find_all('table')):
   text=compact(t.get_text())
   if '70%' not in text or not ('경쟁률' in text or '충원' in text):continue
   g=htmlgrid(t)
   prev=[]
   for e in t.previous_elements:
    if getattr(e,'name',None)=='table':break
    if getattr(e,'name',None) in ['h3','h4','h5','strong','p']:
     z=clean(e.get_text(' ',strip=True))
     if z and len(z)<130:prev.append(z)
     if len(prev)>=5:break
   print('TABLE',i,'shape',len(g),len(g[0]),'CONTEXT',prev)
   print(json.dumps(g[:5],ensure_ascii=False))
