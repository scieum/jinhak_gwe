from kongju_count_grid import *
from collections import defaultdict,Counter
from PIL import ImageDraw,ImageFont

def segments(a):
 b=a<130;xx=np.where(b.any(axis=0))[0];groups=[]
 for x in xx:
  if not groups or x>groups[-1][-1]+1:groups.append([x])
  else:groups[-1].append(x)
 out=[]
 for g in groups:
  z=b[:,g[0]:g[-1]+1];yy=np.where(z.any(axis=1))[0]
  if len(yy):out.append(z[yy[0]:yy[-1]+1])
 return out
def norm(g):
 return np.array(Image.fromarray(g.astype('uint8')*255).resize((20,32))).astype('float32').reshape(-1)/255
def main():
 data=json.loads((D/'raw-grid.json').read_text(encoding='utf8'));ts=[];allcells=[]
 bounds=[(718,849),(849,972),(972,1040),(1040,1133),(1133,1207),(1207,1272)]
 for p in data:
  im=np.array(Image.open(D/f"p{p['page']}.png").convert('L'))
  for r in p['rows']:
   for ci,(a,b) in enumerate(bounds):
    y=round(r['y']);gs=segments(im[y-17:y+18,a+3:b-3]);s=r['values'][ci]
    if r['program'].startswith(('종','조')):allcells.append((p,r,ci,gs))
    if re.fullmatch(r'\d+(?:\.\d+)?(?::1|\(\d+\))?',s) and len(s)==len(gs):
     for ch,g in zip(s,gs):
      if max(g.shape)<40:ts.append((ch,norm(g),g.shape))
 unique={}
 for t in ts:unique[(t[0],t[1].tobytes(),t[2])]=t
 ts=list(unique.values())
 chars=[t[0] for t in ts];vectors=np.array([t[1] for t in ts]);shapes=np.array([t[2] for t in ts]);review=[]
 for p,r,ci,gs in allcells:
  pred=[];dist=[]
  for g in gs:
   if g.shape[0]<=4 and g.shape[1]>=6:pred.append('-');dist.append(0);continue
   loss=np.mean(abs(vectors-norm(g)),axis=1)+np.sum(abs(shapes-np.array(g.shape)),axis=1)*.015
   ix=int(loss.argmin());v=float(loss[ix]);pred.append(chars[ix] if v<.2 else '?');dist.append(v)
  s=''.join(pred)
  if 'numeric' not in r:r['numeric']=['']*6
  r['numeric'][ci]=s
  review.append({'page':p['page'],'unit':r['unit'],'year':r['year'],'y':r['y'],'column':ci,'ocr':r['values'][ci],'numeric':s,'distance':max(dist,default=0)})
 (D/'numeric-grid.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
 (D/'numeric-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf8')
 selected=[x for x in review if x['numeric']!=x['ocr'] and (x['column'] in [0,1,4,5])]
 print('cells',len(allcells),'templates',len(ts),'disagree',len(selected))
 print('candidates',sum(len([r for r in p['rows'] if r['program'].startswith(('종','조'))]) for p in data))
if __name__=='__main__':main()
