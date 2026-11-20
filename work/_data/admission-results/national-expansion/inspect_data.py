from pathlib import Path
import sys,json,openpyxl,fitz
sys.stdout.reconfigure(encoding='utf8')
P=Path(__file__).parent
for k in sys.argv[1:]:
 if (P/(k+'.xlsx')).exists():
  w=openpyxl.load_workbook(P/(k+'.xlsx'),data_only=True,read_only=True)
  for s in w:
   print('\nSHEET',s.title,s.max_row,s.max_column)
   for i,v in enumerate(s.iter_rows(values_only=True),1):
    if i<=14:print(i,json.dumps(v,ensure_ascii=False,default=str))
 elif (P/(k+'.pdf')).exists():
  d=fitz.open(P/(k+'.pdf'));out=[]
  for i,p in enumerate(d):
   ts=[{'bbox':list(t.bbox),'rows':t.extract()} for t in p.find_tables()]
   out.append({'page':i+1,'text':p.get_text(sort=True),'tables':ts})
   print('\nPAGE',k,i+1, p.get_text(sort=True)[:200])
   for t in ts:print('TABLE',len(t['rows']),json.dumps(t['rows'][:5],ensure_ascii=False))
  (P/(k+'.tables.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
