from pathlib import Path
import fitz,json,re,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).parent/'gangwon-expansion'
for key in sys.argv[1:]:
 p=root/(key+'.pdf')
 if p.exists():
  d=fitz.open(p);result=[]
  for i,page in enumerate(d):
   tables=page.find_tables()
   entries=[{'bbox':list(t.bbox),'rows':t.extract()} for t in tables]
   result.append({'page':i+1,'text':page.get_text(sort=True),'tables':entries})
   print(key,i+1,len(tables.tables),page.get_text(sort=True)[:180].replace('\n',' '))
   for t in entries: print('TABLE',len(t['rows']),t['rows'][:3])
  (root/(key+'.tables.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 else:
  p=root/(key+'.links.json')
  print(key)
  if not p.exists():continue
  for a in json.loads(p.read_text(encoding='utf-8')):
   if re.search('202[456]|download|다운|결과|컷|커트|입학안내',a['text']+' '+a['url'],re.I):print(a)
