from pathlib import Path
import fitz,json
P=Path(__file__).parent/'national-expansion'
slugs=[d['slug'] for d in json.loads((P/'honam-roster.json').read_text(encoding='utf8'))]
slugs+=['woosuk']
for f in P.glob('*.pdf'):
 if not any(f.name.startswith(s+'-') for s in slugs) or f.with_suffix('.tables.json').exists():continue
 d=fitz.open(f);out=[]
 for i,p in enumerate(d):
  ts=[{'bbox':list(t.bbox),'rows':t.extract()} for t in p.find_tables()]
  out.append({'page':i+1,'text':p.get_text(sort=True),'tables':ts})
 f.with_suffix('.tables.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 print(f.stem,len(d),sum(len(x['tables']) for x in out),flush=True)
