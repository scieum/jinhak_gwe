from pathlib import Path
import json,re
import numpy as np
from PIL import Image
D=Path(__file__).parent/'chungcheong-expansion'/'kongju-counts'
def edges(a,x0,x1):
 v=a[:,x0:x1];ys=np.where((v.mean(axis=1)<235)&(v.std(axis=1)<6))[0];groups=[]
 for y in ys:
  if not groups or y>groups[-1][-1]+2:groups.append([int(y)])
  else:groups[-1].append(int(y))
 return [sum(g)/len(g) for g in groups if 125<=sum(g)/len(g)<1300]
def main():
 out=[]
 for pn in range(20,58):
  im=np.array(Image.open(D/f'p{pn}.png').convert('L'));raw=json.loads((D/f'p{pn}.png.ocr.json').read_text(encoding='utf-8-sig'))
  words=[(w['text'],w['x']+w['width']/2,w['y']+w['height']/2) for l in raw['lines'] for w in l['words']]
  ub=edges(im,30,270);pb=edges(im,415,590)
  def band(yy,ee):return next(((a,b) for a,b in zip(ee,ee[1:]) if a<yy<b),None)
  def txt(x0,x1,y0,y1):return ''.join(w[0] for w in sorted([w for w in words if x0<w[1]<x1 and y0<w[2]<y1],key=lambda w:(round(w[2]/10),w[1])))
  rows=[]
  for ytext,x,y in words:
   if not(598<x<718 and y>135 and ytext in ['2024','2025','2026']):continue
   uu=band(y,ub);pp=band(y,pb)
   if not uu or not pp:print('NO BAND',pn,y,ub,pb);continue
   vals=[txt(a,b,y-15,y+15) for a,b in zip([718,849,972,1040,1133,1207],[849,972,1040,1133,1207,1272])]
   rows.append({'year':ytext,'y':y,'unit':txt(27,282,*uu),'program':txt(407,598,*pp),'unit_bounds':uu,'program_bounds':pp,'values':vals})
  out.append({'page':pn,'rows':sorted(rows,key=lambda r:r['y'])})
 (D/'raw-grid.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 print('rows',sum(len(p['rows']) for p in out))
 print(*[(p['page'],list(dict.fromkeys((r['unit'],r['program']) for r in p['rows']))) for p in out],sep='\n')
if __name__=='__main__':main()
