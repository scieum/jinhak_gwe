"""Recover the two aligned halves of CNU 2025 image tables using OCR coordinates.
Raw OCR is retained separately; this module does not write admissions CSVs.
"""
from pathlib import Path
import json, re
D=Path(__file__).parent/'chungcheong-expansion'/'cnu25-ocr'

def geometry(width):
 if width in (2236,2305):
  left=[0,69,170,271,327,383,439,495,551,607,663,709,755,801,847,893,939,1010]
  extra=width==2305; offset=69 if extra else 0
  if extra:left=[0]+[x+69 for x in left]
  right=[1030+offset,1130+offset]+[1130+offset+85*i for i in range(1,14)]
 elif width in (2184,2253):
  left=[0,69,170,271,350,429,508,587,666,745,824,877,930,983,1036,1089,1142,1213]
  extra=width==2253; offset=69 if extra else 0
  if extra:left=[0]+[x+69 for x in left]
  right=[1233+offset,1333+offset]+[1333+offset+85*i for i in range(1,11)]
 elif width in (2262,2250):
  left=[0,69,170,271,327,383,439,495,551,597,643,689,735,781,852]
  extra=width==2250;offset=69 if extra else 0
  if extra:left=[0]+[x+69 for x in left]
  right=[872+offset,972+offset,1073+offset]+[1073+offset+(123 if extra else 132)*i for i in range(1,10)]
 elif width==1605:
  left=[0,117,234,351,549,643,737,831,925,1019,1105,1191,1277,1363,1449,1535,1605];right=[];extra=True
 else:raise ValueError(width)
 return left,right,extra

def extract():
 out=[]
 for item in json.loads((D/'manifest.json').read_text(encoding='utf8')):
  if item['width']==1600:continue # Scatterplots, not numerical tables.
  left,right,extra=geometry(item['width']);step=24 if item['height'] in (733,877,1213,853) else 30
  assert (item['height']-61)%step==0,item
  steps=[step]*((item['height']-61)//step)
  if item['key'].endswith('16') and item['page']==23:steps=[30]*10+[24]*20
  if item['key'].endswith('16') and item['page']==24:steps=[24]*40
  if item['key'].endswith('19') and item['page']==8:steps=[30]*4+[24]*28
  edges=[60]
  for st in steps:edges.append(edges[-1]+st)
  assert edges[-1]==item['height']-1
  n=len(steps);words=[]
  for pc in item['pieces']:
   data=json.loads(Path(pc['path']+'.ocr.json').read_text(encoding='utf-8-sig'))
   for line in data['lines']:
    for w in line['words']:
     x=(w['x']+w['width']/2)/2+pc['crop'][0];y=(w['y']+w['height']/2)/2+pc['crop'][1]
     if pc['core'][0]<=x<pc['core'][2] and pc['core'][1]<=y<pc['core'][3]:words.append((x,y,w['text']))
  def cell(bounds,col,ri):
   ww=[w for w in words if bounds[col]<=w[0]<bounds[col+1] and edges[ri]<=w[1]<edges[ri+1]]
   return ''.join(w[2] for w in sorted(ww,key=lambda w:(round(w[1]/10),w[0])))
  rows=[]
  for ri in range(n):rows.append({'row':ri+1,'y':[edges[ri],edges[ri+1]],'left':[cell(left,c,ri) for c in range(len(left)-1)],'right':[cell(right,c,ri) for c in range(len(right)-1)]})
  out.append({'key':item['key'],'page':item['page'],'width':item['width'],'title':item['text'].splitlines()[2] if item['page']!=29 and not(item['key'].endswith('19') and item['page']==8) else '', 'extra':extra,'rows':rows})
 (D/'raw-grid.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 lines=[]
 for p in out:
  lines.append(f"PAGE {p['key']} {p['page']} {p['title']}")
  for r in p['rows']:lines.append(str(r['row'])+' | '+' | '.join(r['left'])+' || '+' | '.join(r['right']))
 (D/'raw-grid.txt').write_text('\n'.join(lines),encoding='utf8')
 print(len(out),'tables',sum(len(x['rows']) for x in out),'rows')
if __name__=='__main__':extract()
