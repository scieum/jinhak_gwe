"""University-supplied official Adiga results; retain original fields and scales."""
from normalize_daegu_adiga import *
import normalize_daegu_adiga as base
ROSTER=json.loads((CACHE/'buk-roster.json').read_text(encoding='utf8'))
AUDIT=[];REVIEW=[];ABSENT=[];DUPLICATES=[];QUARANTINE=[]

def numeric(x):return number(compact(x).removesuffix('명'))

def legacy(slug,u,y):
 key=f'{slug}-adiga-{y}';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');out=[]
 for ti,t in enumerate(s.find_all('table')):
  tx=compact(t.get_text())
  if '70%' not in tx or not ('경쟁률' in tx or '충원' in tx):continue
  g=htmlgrid(t)
  if compact(g[0][0]) not in ['모집단위','구분','전형명']:continue
  h=next((i for i,v in enumerate(g) if compact(v[0]) not in ['모집단위','구분','전형명','']),len(g))
  if h==len(g):continue
  labs=labels(g,h);cl=[compact(x) for x in labs]
  qcols=[j for j,x in enumerate(cl) if '모집인원' in x]
  if not qcols:continue
  section=next((p.get('id') for p in t.parents if re.fullmatch(r'con_[234][12]',p.get('id',''))),'')
  assert section,(key,ti)
  rd='정시' if section.startswith('con_4') else '수시';reg=g[0][0]=='구분';uc=1 if reg else 0
  q=next((j for j in qcols if '최종' in cl[j]),qcols[0]);co=next((j for j,x in enumerate(cl) if '경쟁률' in x),None)
  pg=g[0][2 if reg else 1]
  ctx=[]
  for e in t.previous_elements:
   if getattr(e,'name',None)=='table':break
   if isinstance(e,str) and e.strip() and not e.find_parent(['table','style','script']):ctx.append(e.strip())
   if len(ctx)>20:break
  note='50%·70% 원문 열 구분; 충원합격순위는 인원에 넣지 않음'
  if reg:
   title=next((z for z in ctx if '전형' in z and not any(w in z for w in ['결과','학년도 전형','산출']) and len(z)<80),'')
   pg=re.sub(r'^.*?학년도\s*','',title).strip('[] ') if title else '수능위주(원문 세부 전형명 미표기)'
  if compact(pg) in ['000전형','○○○전형']:
   title=next((z for z in ctx if '전형' in z and '결과' not in z and '000' not in z and len(z)<80),'')
   if not title and len(ctx)>1 and re.fullmatch(r'\d+\)',ctx[1]) and len(ctx[0])<40:title=ctx[0]
   pg=title or '학생부종합(원문 세부 전형명 미표기)';note+='; 원문 표 머리말 전형명 미기재'
  grade=[j for j,x in enumerate(cl) if '학생부등급' in x]
  conv=[j for j,x in enumerate(cl) if '환산' in x and ('50%' in x or '70%' in x)]
  chosen=grade if grade else conv;metric='교과등급' if grade else '환산점수'
  cuts={n:next((j for j in chosen if str(n)+'%' in cl[j]),None) for n in [50,70]}
  if any(sum(str(n)+'%' in cl[j] for j in chosen)>1 for n in [50,70]):cuts={50:None,70:None};note+='; 복수 성적 열은 원문에 보존'
  nrows=0
  for ri,v in enumerate(g[h:],h+1):
   if compact(v[0]) in ['모집단위','전형명']:
    if v[1] and '모집' not in compact(v[1]):pg=v[1]
    continue
   if not v[uc] or any(z in v[uc] for z in ['합계','소계']) or not any(positive(numeric(v[j])) for j in range(len(v)) if j!=uc):continue
   if not numeric(v[q]) and not any(positive(v[j]) for j in range(q+1,len(v))):continue
   program=pg;unit=v[uc];nt=note
   if slug=='cnue' or g[0][0]=='전형명' or (reg and g[0][1]=='전형명'):
    program=unit;unit='초등교육과' if slug=='cnue' else '전체 모집단위(전형별 공개)';nt+='; 전형별 통합 공개 행; 학과별 복제 안 함'
    if slug=='cnue':program=re.sub(r'^초등교육과\s*','',program)
   if reg:program=clean(v[0])+('' if '전형' in v[0] else ' '+program)
   typ='수능' if rd=='정시' else '종합' if section.startswith('con_2') else '교과'
   if '실기' in program or '특기자' in program or '예체능' in program:typ='실기'
   if rd=='정시' and grade:typ='교과'
   kw={'admission_type':typ,'quota':numeric(v[q]),'competition_rate':numeric(v[co]) if co is not None else ''}
   for n,j in cuts.items():kw[f'cut_{n}']=v[j] if j is not None else ''
   rowmetric=metric
   if reg and not grade and not any(positive(kw.get(z,'')) for z in ['cut_50','cut_70']):
    pc=next((j for j,x in enumerate(cl) if '백분위' in x and '70%' in x and ('평균' in x or '합계' in x)),None)
    if pc is not None and positive(v[pc]) and float(number(v[pc]))<=100:kw['cut_70']=v[pc];rowmetric='백분위'
   if slug.startswith('ysu-'):nt+='; 2024·2025 두 캠퍼스 공통 공개표를 1회만 수록; 캠퍼스 임의 배분 안 함'
   r=base.emit(key,slug,u,y,rd,program,unit,f'HTML 표{ti+1} 행{ri}',labs,v,kw,rowmetric,nt)
   if r:
    if slug=='cup' and y==2024 and ti+1==24:
     r['note']+='; 사용 보류: 앞 표와 농어촌 전형명 반복, 모집인원은 입학처 사회배려대상자 표와 같아 원문 전형명 확인 필요';QUARANTINE.append(r)
    else:out.append(r);nrows+=1
  AUDIT.append(dict(key=key,table=ti+1,section=section,program=pg,source_rows=len(g)-h,emitted=nrows,columns=labs))
 return out

def main():
 for d in ROSTER:
  sl=d['slug'];u=re.sub(r'\[.*?\]','',d['unvNm'])
  if sys.argv[1:] and sl not in sys.argv[1:]:continue
  out=[]
  if sl!='ysu-busan':
   for y in [2024,2025]:out+=legacy(sl,'영산대학교' if sl.startswith('ysu-') else u,y)
  out+=base.newer(sl,u)
  for r in out:
   if any(z in r['program'] for z in ['실기/실적','실기우수','체육특기','체육실기','경기실적']):r['admission_type']='실기'
  out=base.supplements(sl,out)
  save(sl+'-adiga',out)
 for nm,data in [('legacy-audit',AUDIT),('new-audit',base.AUDIT),('unavailable',base.ABSENT),('source-review',base.REVIEW),('office-precedence',base.DUPLICATES)]:
  (CACHE/f'buk-adiga-{nm}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
 (CACHE/'buk-adiga-quarantine.json').write_text(json.dumps(QUARANTINE,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':main()
