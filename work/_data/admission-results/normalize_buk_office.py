"""Official admission-office tables; original statistics remain in cut_other."""
from normalize_national import *
from normalize_daegu import grid
from normalize_daegu_adiga import number,positive,labels,htmlgrid,BeautifulSoup
REVIEW=[];AUDIT=[];TYPE_CACHE={}
def grade(v):
 n=number(v);return n if n and 1<=float(n)<=9 else ''
def score(v):return number(v) if positive(v) else ''
def make(key,u,y,rd,pg,unit,loc,labs,v,typ='교과',metric='교과등급',c50='',c70='',q='',ap='',co='',note='',basis='최종등록자; 원문 기준'):
 pg=re.sub(r'[\x00-\x1f]',' ',pg);unit=re.sub(r'[\x00-\x1f]',' ',unit)
 if not unit or any(z in compact(unit) for z in ['합계','소계']):return None
 r=row(key,u,y,rd,clean(pg),compact(unit),loc,admission_type=typ,quota=number(q),applicants=number(ap),competition_rate=number(co),cut_50=grade(c50) if metric=='교과등급' else score(c50),cut_70=grade(c70) if metric=='교과등급' else score(c70),cut_other=pairs(labs,v),metric=metric,basis=basis,grade_system='9' if metric=='교과등급' else '',note='draft; 입학처 공식 원문; '+note)
 for col,x in [('cut_50',c50),('cut_70',c70)]:
  if val(x) and not r[col]:
   r['note']+='; 비수치·0·범위 밖 컷은 공란, 원문 보존'
   REVIEW.append(dict(source=key,location=loc,unit=unit,issue=f'{col}: {x}',source_url=r['source_url']))
 return r
def put(out,r):
 if r:out.append(r)
def hdr(g,start,end,width=None):
 width=width or len(g[start]);return [' / '.join(dict.fromkeys(clean(g[i][j]) for i in range(start,end) if clean(g[i][j]))) for j in range(width)]
def typ_from_adiga(slug,y,pg,default='교과'):
 from normalize_buk_adiga import base,legacy,ROSTER
 if slug not in TYPE_CACHE:
  d=next(d for d in ROSTER if d['slug']==slug);u=re.sub(r'\[.*?\]','',d['unvNm'])
  TYPE_CACHE[slug]=legacy(slug,u,2024)+legacy(slug,u,2025)+base.newer(slug,u)
 rs=TYPE_CACHE[slug]
 ts={r['admission_type'] for r in rs if r['result_year']==str(y) and base.canon(r['program'])==base.canon(pg)}
 return next(iter(ts)) if len(ts)==1 else default

def ulsan():
 out=[]
 keys={2026:['ulsan-2026-susi-file-220','ulsan-2026-susi-file-221','ulsan-2026-susi-file-222'],2025:['ulsan-2025-susi-page-file-220','ulsan-2025-susi-page-file-221','ulsan-2025-jeongsi-page-file-202']}
 for y,ks in keys.items():
  for key in ks:
   w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
   for s in w:
    g=grid(s);labs=g[3];rd='정시' if '정시' in s.title else '수시';typ='수능' if rd=='정시' else '종합' if '종합' in s.title else '실기' if '예체능' in s.title else '교과'
    for i,v in enumerate(g[4:],5):
     if not number(v[2]) or not v[1]:continue
     put(out,make(key,'울산대학교',y,rd,v[0],v[1],f'{s.title} 행{i}',labs,v,typ=typ,metric='수능등급' if rd=='정시' else '교과등급',q=v[2],ap=v[3],co=v[4],c70=v[7] if len(v)>7 else '',note='후보순위는 인원 아님; '+g[2][0]))
 # The 2026 regular result is a full official HTML table, without attachment.
 key='ulsan-2026-jeongsi-page';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
 for ti,t in enumerate(s.find_all('table'),1):
  g=htmlgrid(t)
  if '모집단위' not in ''.join(g[0]) or len(g[0])!=8:continue
  for i,v in enumerate(g[1:],2):
   if number(v[2]):put(out,make(key,'울산대학교',2026,'정시',v[0],v[1],f'HTML 표{ti} 행{i}',g[0],v,typ='수능',metric='수능등급',q=v[2],ap=v[3],co=v[4],c70=v[7],note='수능 국수영탐 단순 평균등급; 실제 전형 환산점수와 다름; 후보순위는 인원 아님'))
 save('ulsan',out)

def ks():
 out=[]
 for y,idx in [(2024,2),(2025,1),(2026,0)]:
  key=f'ks-results-list-6-post-{idx}-file-0';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True);s=w.worksheets[0];g=grid(s);h=3 if y==2024 else 5;labs=hdr(g,h-2,h)
  for i,v in enumerate(g[h:],h+1):
   if not number(v[3]) or not v[2]:continue
   typ='종합' if any(z in v[0] for z in ['학교생활우수자','지역인재II','지역인재Ⅱ']) else '실기' if '실기' in v[0] or '특기' in v[0] else '교과'
   put(out,make(key,'경성대학교',y,'수시',v[0],v[2],f'{s.title} 행{i}',labs,v,typ=typ,q=v[3],co=v[4],c50=v[15] if y>2024 else '',c70=v[16] if y>2024 else '',note='충원합격 표기는 원문에 보존; 숨김 보조 시트는 중복 수록하지 않음',basis='최종합격자' if y==2024 else '최종등록자'))
 save('ks',out)

def inje():
 out=[]
 for y,idx in [(2024,6),(2025,5),(2026,4)]:
  for rd,part in [('수시',3),('정시',8)]:
   key=f'inje-results-list-{part}-post-{idx}-file-0';f=CACHE/(key+'.xlsx')
   if not f.exists():continue
   w=openpyxl.load_workbook(f,data_only=True)
   for s in w:
    g=grid(s);h=next((i for i,v in enumerate(g) if v[0] in [str(y)]),None)
    if h is None:continue
    labs=hdr(g,h-3,h);cl=[compact(x) for x in labs]
    for i,v in enumerate(g[h:],h+1):
     if v[0]!=str(y) or not v[2]:continue
     metric='교과등급' if rd=='수시' else '환산점수';cut=''
     if rd=='수시':
      idxs=[j for j,x in enumerate(cl) if '최종등록자' in x and '평균등급기준' in x and '70%' in x]
      if len(idxs)==1:cut=v[idxs[0]]
     else:
      idxs=[j for j,x in enumerate(cl) if '4개영역' in x and '70%' in x]
      if len(idxs)==1:cut=v[idxs[0]]
     typ='실기' if '실기' in v[1] or '특기자' in v[1] else '수능' if rd=='정시' else '교과'
     put(out,make(key,'인제대학교',y,rd,v[1],v[2],f'{s.title} 행{i}',labs,v,typ=typ,metric=metric,c70=cut,q=v[3],ap=v[4],co=v[5],note='1단계 합격자와 최종등록자 성적 구분; 예비번호는 인원 아님'))
 save('inje',out)

def pknu():
 out=[]
 for y in [2024,2025,2026]:
  for rd,en in [('수시','susi'),('정시','jeongsi')]:
   key=f'pknu-{y}-{en}';f=CACHE/(key+'.xlsx')
   if not f.exists():continue
   w=openpyxl.load_workbook(f,data_only=True)
   for s in w:
    g=grid(s);labs=hdr(g,0,3,23 if rd=='수시' else 18)
    for i,v in enumerate(g[3:],4):
     if not number(v[3]) or not v[2]:continue
     typ=typ_from_adiga('pknu',y,v[0],'수능' if rd=='정시' else '교과')
     if '실기' in v[0]:typ='실기'
     put(out,make(key,'국립부경대학교',y,rd,v[0],v[2],f'{s.title} 행{i}',labs,v[:len(labs)],typ=typ,metric='교과등급' if rd=='수시' else '환산점수',q=v[3],ap=v[4],co=v[5],c50=v[9] if rd=='수시' else v[14],note='50%·80% 원문 기준; 80%를 70%로 사용하지 않음; 후보순위는 인원 아님'))
 save('pknu',out)

def tu():
 out=[]
 for y in [2024,2025,2026]:
  for rd,en in [('수시','susi'),('정시','jeongsi')]:
   key=f'tu-{y}-{en}-xlsx';f=CACHE/(key+'.xlsx')
   if not f.exists():continue
   w=openpyxl.load_workbook(f,data_only=True)
   for s in w:
    g=grid(s)
    for i,v in enumerate(g[4:],5):
     if not v[0] or any(z in v[0] for z in ['※','주)','합계']):continue
     for j in range(1,17 if rd=='수시' else 5,4):
      if j+3>=len(v) or not any(positive(z) for z in v[j:j+4]):continue
      pg=g[2][j];typ='수능' if rd=='정시' else '종합' if '창의' in pg else '기타'
      put(out,make(key,'동명대학교',y,rd,pg,v[0],f'{s.title} 행{i} 열{j+1}',g[3][j:j+4],v[j:j+4],typ=typ,metric='환산점수' if rd=='정시' else '교과등급',co=v[j],c70=v[j+2],note='원문 복수 전형 묶음 그대로 보존; 충원발표는 인원으로 해석하지 않음'))
 save('tu',out)

def gnu():
 out=[]
 jobs=[(2024,'수시','gnu-2024-susi'),(2025,'수시','gnu-2025-susi'),(2026,'수시','gnu-2026-susi'),(2024,'정시','gnu-2024-jeongsi-page-file-0'),(2025,'정시','gnu-menu-32-file-86'),(2026,'정시','gnu-2026-jeongsi')]
 for y,rd,key in jobs:
  f=CACHE/(key+'.tables.json')
  if not f.exists():continue
  groups={};carry={}
  for p in tables(key):
   for ti,t in enumerate(p['tables'],1):
    raw=t['rows'];g=[[clean(z) for z in v] for v in raw]
    if not g:continue
    first=[compact(x) for x in g[0]]
    if '모집단위' not in first:continue
    uc=first.index('모집단위');pc=first.index('전형구분') if '전형구분' in first else first.index('전형');mc=first.index('모집구분') if '모집구분' in first else first.index('모집')
    q=first.index('모집인원') if '모집인원' in first else None
    h=2 if rd=='수시' or q is None else 1
    for i in range(h):
     for j in range(1,len(g[i])):
      if raw[i][j] is None:g[i][j]=g[i][j-1]
    labs=hdr(g,0,h);prev=['']*len(g[0])
    for ri,v in enumerate(g[h:],h+1):
     if compact(v[uc])=='모집단위':continue
     for j in range(uc+1):
      if raw[ri-1][j] is None:v[j]=prev[j]
     for j in [mc,pc]:
      if not v[j]:v[j]=carry.get(j,'')
      else:carry[j]=v[j]
     prev=v[:]
     if not v[uc] or (q is not None and not number(v[q])):continue
     if q is None and not any(positive(z) for z in v[pc+1:]):continue
     pg=v[mc]+'('+v[pc]+')'+(' '+v[first.index('정원구분')] if '정원구분' in first else '')
     typ='종합' if '종합' in v[mc] else '실기' if '실기' in v[mc] else '교과' if rd=='수시' else '수능'
     co=first.index('경쟁률') if '경쟁률' in first else None;ap=first.index('지원인원') if '지원인원' in first else None
     r=make(key,'경상국립대학교',y,rd,pg,v[uc],f'PDF p{p["page"]} 표{ti} 행{ri}',labs,v,typ=typ,metric='교과등급' if rd=='수시' else '환산점수',q=v[q] if q is not None else '',ap=v[ap] if ap is not None else '',co=v[co] if co is not None else '',note='80컷·평균·과목별 통계를 원문 지표로 보존; 예비순위는 인원 아님')
     if not r:continue
     ident=(pg,compact(v[uc]))
     if ident in groups:
      prevrow=groups[ident]
      prevrow['cut_other']+=' / 별도 성적표: '+r['cut_other'];prevrow['source_page']+='; '+r['source_page'].split(' / ',1)[1]
      for col in ['quota','applicants','competition_rate']:
       if r[col] and not prevrow[col]:prevrow[col]=r[col]
     else:groups[ident]=r
  out+=list(groups.values())
 save('gnu',out)

if __name__=='__main__':
 for fn in [ulsan,ks,inje,pknu,tu,gnu]:
  if not sys.argv[1:] or fn.__name__ in sys.argv[1:]:fn()
 (CACHE/'buk-office-review.json').write_text(json.dumps(REVIEW,ensure_ascii=False,indent=2),encoding='utf8')
