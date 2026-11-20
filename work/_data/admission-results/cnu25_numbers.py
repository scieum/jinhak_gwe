"""Supplement Windows OCR with exact raster glyph matching for numeric cells.
Templates are learned only from OCR tokens with one segment per printed glyph.
Every match has a score and retained template provenance for review.
"""
from cnu25_grid import *
from PIL import Image
import numpy as np
from collections import defaultdict,Counter

def glyphs(a):
 # Exclude table borders, then segment on empty vertical columns.
 b=a[2:-2,2:-4]<110
 cols=np.where(b.any(axis=0))[0];groups=[]
 for x in cols:
  if not groups or x>groups[-1][-1]+1:groups.append([x])
  else:groups[-1].append(x)
 out=[]
 for g in groups:
  sub=b[:,g[0]:g[-1]+1];ys=np.where(sub.any(axis=1))[0]
  if len(ys):out.append((sub[ys[0]:ys[-1]+1],int(ys[0])+2))
 return out

def main():
 data=json.loads((D/'raw-grid.json').read_text(encoding='utf8'));images={};templates=defaultdict(list);cells=[]
 for p in data:
  im=np.array(Image.open(D/f"{p['key']}-p{p['page']}.png").convert('L'));left,right,extra=geometry(p['width'])
  for r in p['rows']:
   for side,bounds,start in [('left',left,4 if extra else 3),('right',right,1)]:
    for ci in range(start,len(bounds)-1):
     a=im[r['y'][0]:r['y'][1],bounds[ci]:bounds[ci+1]];gs=glyphs(a);txt=r[side][ci]
     loc=[p['key'],p['page'],r['row'],side,ci]
     cells.append((r,side,ci,gs,loc))
     if re.fullmatch(r'\d+(?:\.\d+)?(?::1)?',txt) and len(txt)==len(gs):
      for ch,(g,y) in zip(txt,gs):
       # Skip huge/hatched components and reject implausibly-sized numeric glyphs.
       if g.shape[0]<=22 and g.shape[1]<=13:
        templates[ch].append((g,y,loc))
 # Collapse exact masks; majority labels remove occasional OCR mistakes.
 masks=defaultdict(list)
 for ch,ts in templates.items():
  for g,y,loc in ts:masks[(g.shape,g.tobytes())].append((ch,g,y,loc))
 ts=[]
 for vals in masks.values():
  counts=Counter(v[0] for v in vals);ch,n=counts.most_common(1)[0]
  if n<2 or n/len(vals)<.85:continue
  item=next(v for v in vals if v[0]==ch);ts.append((*item,n))
 # Touching 04/44/64 glyphs: anchors are explicitly reviewed source cells.
 anchors={(4,5,'left',6):(0,'44'),(4,13,'left',6):(0,'64'),(5,9,'right',11):(-1,'04')}
 for r,side,ci,gs,loc in cells:
  a=anchors.get(tuple(loc[1:])) if loc[0]=='cnu-scan06-16' else None
  if a:
   g,y=gs[a[0]];ts.append((a[1],g,y,loc,100))
 # Hand-reviewed punctuation (hyphen) is deterministic from its shape.
 def match(g,y):
  h,w=g.shape
  if h<=2 and w>=3:return ('-',0,None)
  cand=[]
  for ch,t,ty,loc,n in ts:
   if t.shape!=g.shape:continue
   dist=float(np.mean(g!=t))
   cand.append((dist,-n,ch,loc))
  if not cand:return ('?',1,None)
  v=min(cand)
  return (v[2],v[0],v[3]) if v[0]<=.16 else ('?',v[0],v[3])
 results=[]
 for r,side,ci,gs,loc in cells:
  pred=[match(g,y) for g,y in gs]
  s=''.join(v[0] for v in pred);score=max((v[1] for v in pred),default=0)
  valid=bool(re.fullmatch(r'\d+(?:\.\d+)?(?::1)?|-|',s))
  if side+'num' not in r:r[side+'num']=r[side].copy()
  r[side+'num'][ci]=s if valid else '?'
  results.append({'loc':loc,'ocr':r[side][ci],'raster':s,'valid':valid,'max_distance':score})
 (D/'numeric-grid.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
 (D/'numeric-review.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
 print('Templates',len(ts),'cells',len(cells),'unresolved',sum(not x['valid'] for x in results),'disagreement',sum(x['valid'] and x['raster']!=x['ocr'] for x in results))
 print(Counter(x['max_distance'] for x in results).most_common(5))
if __name__=='__main__':main()
