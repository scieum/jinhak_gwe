from pathlib import Path
import sys,json,fitz,re
sys.stdout.reconfigure(encoding='utf8')
p=Path(__file__).parent/'chungcheong-expansion'
for key in sys.argv[1:]:
 f=p/(key+'.tables.json')
 if not f.exists():
  d=fitz.open(p/(key+'.pdf'));out=[]
  for i,pg in enumerate(d):
   ts=[]
   for t in pg.find_tables():
    pre=pg.get_text(clip=fitz.Rect(t.bbox[0],max(0,t.bbox[1]-100),t.bbox[2],t.bbox[1]),sort=True)
    ts.append({'bbox':list(t.bbox),'before':pre,'rows':t.extract()})
   out.append({'page':i+1,'text':pg.get_text(sort=True),'tables':ts})
  f.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 out=json.loads(f.read_text(encoding='utf8'));print('\nFILE',key)
 for pg in out:
  for j,t in enumerate(pg['tables']):
   if len(t['rows'])<3:continue
   print('p',pg['page'],'t',j,'rows',len(t['rows']),'cols',len(t['rows'][0]),'BEFORE',re.sub(r'\s+',' ',t['before'])[-180:])
   print(t['rows'][:4])
