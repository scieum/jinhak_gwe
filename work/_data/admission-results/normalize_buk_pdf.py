"""Normalize verified official PDF tables without guessing unpublished cutoffs."""
from normalize_buk_office import *
import fitz

def header(raw,h):
 g=[[clean(z) for z in v] for v in raw[:h]]
 # Horizontal spans only inside groups; vertical spans retain the parent label.
 for i in range(h):
  for j in range(len(g[i])):
   if raw[i][j] is None:
    if i and raw[i-1][j] is not None and (j+1==len(g[i]) or raw[i-1][j+1] is not None):g[i][j]=g[i-1][j]
    elif j:g[i][j]=g[i][j-1]
 return hdr(g,0,h)

def above(doc,p,t):
 return doc[p-1].get_text(clip=(0,0,doc[p-1].rect.width,t['bbox'][1]),sort=True)

def rows(raw,h,cols=()):
 prev=['']*len(raw[0])
 for ri,z in enumerate(raw[h:],h+1):
  v=[clean(x) for x in z]
  for j in cols:
   if z[j] is None:v[j]=prev[j]
  prev=v[:]
  yield ri,v

def pusan():
 out=[]
 for y in [2024,2025,2026]:
  key=f'pusan-{y}'
  if not (CACHE/(key+'.tables.json')).exists():continue
  doc=fitz.open(CACHE/(key+'.pdf'));pg=''
  for p in tables(key):
   for ti,t in enumerate(p['tables'],1):
    raw=t['rows'];first=[compact(x) for x in raw[0]]
    if len(first)<8 or first[0]!='대학' or first[1]!='모집단위' or '전형' in first:continue
    matches=re.findall(r'^\s*\d+(?:[- ]\d+)?\s+((?:학생부교과|학생부종합|논술|실기/실적|수능)[^\n]*)',above(doc,p['page'],t),re.M)
    if matches:pg=clean(matches[-1])
    if not pg:raise ValueError((key,p['page'],'no program'))
    h=2;labs=header(raw,h);reg='수능환산점수' in first;rd='정시' if reg else '수시';metric='환산점수' if reg else '교과등급'
    typ='수능' if reg else '종합' if '종합' in pg else '논술' if '논술' in pg else '실기' if '실기' in pg else '교과'
    q=first.index('모집인원');ap=first.index('지원인원');co=first.index('경쟁률') if '경쟁률' in first else None
    sc=first.index('수능환산점수' if reg else '교과종합등급')
    cuts={n:next((j for j in range(sc,min(sc+4,len(first))) if str(n)+'%' in compact(raw[1][j])),None) for n in [50,70]}
    for ri,v in rows(raw,h,range(2)):
     if not number(v[q]) or not v[1]:continue
     program=pg+(' '+v[first.index('모집군')] if '모집군' in first else '')
     put(out,make(key,'부산대학교',y,rd,program,v[1],f'PDF p{p["page"]} 표{ti} 행{ri}',labs,v,typ=typ,metric=metric,q=v[q],ap=v[ap],co=v[co] if co is not None else '',c50=v[cuts[50]] if cuts[50] is not None else '',c70=v[cuts[70]] if cuts[70] is not None else '',note='최종추합번호는 인원 아님; 모집단위별 재편집 요약표 중복 제외; 70% 순위 산식은 해당 연도 원문 기준'))
 save('pusan',out)

def kyungnam():
 out=[]
 for y,idx in [(2024,6),(2025,5),(2026,4)]:
  for rd,no in [('수시',33),('정시',41)]:
   key=f'kyungnam-results-list-{no}-post-{idx}-file-0'
   for p in tables(key):
    for ti,t in enumerate(p['tables'],1):
     raw=t['rows'];first=[compact(x) for x in raw[0]]
     if '모집인원' not in first or '모집단위' not in first or len(first)<10:continue
     labs=header(raw,2)
     for ri,v in rows(raw,2,[0,1]):
      if not number(v[2]):continue
      typ='수능' if rd=='정시' else typ_from_adiga('kyungnam',y,v[0]);typ='실기' if '실기' in v[0] or '체육특기' in v[0] else typ
      r=make(key,'경남대학교',y,rd,v[0],v[1],f'PDF p{p["page"]} 표{ti} 행{ri}',labs,v,typ=typ,metric='교과등급' if rd=='수시' else '환산점수',q=v[2],co=v[3],basis='최종합격자(충원 포함) 상위 90%',note='평균·최저는 최종합격자 상위90% 집단 기준; 70%컷 아님')
      if r:r['fill_count']=number(v[4]);out.append(r)
 save('kyungnam',out)

def cup():
 out=[];seen=set()
 for f in sorted(CACHE.glob('cup*.pdf')):
  if not f.with_suffix('.tables.json').exists():continue
  key=f.stem;doc=fitz.open(f);text=''.join(p.get_text() for p in doc);m=re.search(r'(202[456])학년도',text)
  if not m:continue
  sha=__import__('hashlib').sha256(f.read_bytes()).hexdigest()
  if sha in seen:continue
  seen.add(sha);y=int(m[1]);rd='정시' if '정시모집' in text else '수시';pg=''
  for p in tables(key):
   for ti,t in enumerate(p['tables'],1):
    raw=t['rows'];first=[compact(x) for x in raw[0]]
    if '모집단위' not in first or len(first)<8:continue
    matches=re.findall(r'(?:\d+\.\s*)?([^\n]*전형[^\n]*:\s*정원[내외])',above(doc,p['page'],t))
    if matches:pg=clean(matches[-1]);pg=re.sub(r'^\d+\.\s*','',pg)
    if not pg:raise ValueError((key,p['page'],'no title'))
    h=3 if rd=='정시' else 2;uc=first.index('모집단위');labs=header(raw,h)
    for ri,v in rows(raw,h,range(uc+1)):
     if not number(v[uc+1]):continue
     put(out,make(key,'부산가톨릭대학교',y,rd,(v[0]+' ' if rd=='정시' else '')+pg,v[uc],f'PDF p{p["page"]} 표{ti} 행{ri}',labs,v,typ='수능' if rd=='정시' else '교과',metric='환산점수' if rd=='정시' else '교과등급',q=v[uc+1],ap=v[uc+2],co=v[uc+3],note='평균·80%컷 원문 보존; 합격현황과 등록현황 구분; 후보순위는 인원 아님'))
 save('cup',out)

def deu():
 out=[]
 for y in [2024,2025,2026]:
  for rd,part in [('수시','susi'),('정시','jeongsi')]:
   for no in ([98,99] if rd=='수시' else [98]):
    key=f'deu-{y}-{part}-page-file-{no}';doc=fitz.open(CACHE/(key+'.pdf'));pg='';group=''
    whole=''.join(p.get_text() for p in doc)
    default='종합' if rd=='수시' and ('학생부종합' in whole[:1500] or (no==98 if y==2025 else no==99)) else '교과'
    for p in tables(key):
     for ti,t in enumerate(p['tables'],1):
      raw=t['rows'];first=[compact(re.sub(r'[\x00-\x1f]',' ',x or '')) for x in raw[0]]
      if len(first)<6 or not any('지원인원'==x for x in first):continue
      title=above(doc,p['page'],t)
      titles=re.findall(r'^\s*(?:[가-하]\.\s*|\d+\s+)([^\n]*전형[^\n]*)',title,re.M)
      if titles:pg=clean(titles[-1]);pg=re.split(r'\(모집인원|\(전체통합선발',pg)[0]
      ap=first.index('지원인원');co=first.index('경쟁률') if '경쟁률' in first else None
      q=next((j for j,x in enumerate(first) if x in ['모집인원','최종모집인원','최대선발가능인원'] and j>1),None)
      uc=next((j for j,x in enumerate(first) if x=='모집단위' or (x=='최종모집인원' and j<2) or (j==2 and x=='최종모집인원' and first[1]=='전형')),None)
      dated=next((j for j,x in enumerate(first) if str(y) in x and '모집단위' in x),None)
      if dated is not None:uc=dated
      unit_end=next((j for j in range(uc+1,len(first)) if first[j]),uc+1) if uc is not None else None
      h=next((i for i,v in enumerate(raw) if i and number(v[ap])),None)
      if h is None:continue
      labs=header(raw,h);cl=[compact(x) for x in labs]
      # Explicit result header is more reliable than a preceding section title.
      head=next((clean(x) for x in raw[0][ap+2:] if x and '전형' in x),None)
      if head:pg=re.sub(r'\s*(최종등록자|최초합격자|전체합격자).*','',head)
      if not pg:raise ValueError((key,p['page'],'no program'))
      if rd=='정시' and any('최초합격자' in x for x in first):continue # Same program's final-registration table follows.
      typ='종합' if default=='종합' or '학습자' in pg else '실기' if any(z in pg for z in ['실기','특기','경기실적']) else '수능' if '수능' in pg else '교과'
      metric='환산점수' if typ=='수능' else '교과등급'
      c70=None
      if metric=='교과등급':
       cs=[j for j,x in enumerate(cl) if '70%' in x and '최초' not in x and ('최종등록자' in x or '석차등급' in x)]
       if cs:c70=cs[-1]
      # Numeric limits on integrated recruitment are not department quotas.
      note='최초합격자·전체합격자·최종등록자 구분; 후보순위는 인원 아님'
      if q is not None and first[q]=='최대선발가능인원':note+='; 학과별 최대선발 가능인원은 quota에 넣지 않음'
      for ri,v in rows(raw,h,range(uc+1) if uc is not None else []):
       if not number(v[ap]):continue
       unit='전체 모집단위(전형별 공개)' if uc is None else ' '.join(dict.fromkeys(z for z in v[uc:unit_end] if z)) if dated is not None else ' '.join(dict.fromkeys(z for z in v[uc:q] if z)) if q is not None else v[uc]
       program=v[1] if first[1]=='전형' else pg
       put(out,make(key,'동의대학교',y,rd,program,unit,f'PDF p{p["page"]} 표{ti} 행{ri}',labs,v,typ=typ,metric=metric,q=v[q] if q is not None and first[q]!='최대선발가능인원' else '',ap=v[ap],co=v[co] if co is not None else '',c70=v[c70] if c70 is not None else '',note=note,basis='최종등록자' if any('최종등록자' in x for x in cl) else '원문 표 기준(전체합격자 등)'))
 save('deu',out)

def tu_extra():
 f=ROOT/'tu.csv';out=list(csv.DictReader(f.open(encoding='utf-8-sig')));key='tu-2025-jeongsi-pdf'
 out=[r for r in out if key not in r['source_page']]
 for p in tables(key):
  for ti,t in enumerate(p['tables'],1):
   for ri,v in rows(t['rows'],2):
    if not number(v[1]):continue
    put(out,make(key,'동명대학교',2025,'정시','가, 나, 다군 일반전형',v[0],f'PDF p{p["page"]} 표{ti} 행{ri}',header(t['rows'],2),v,typ='수능',metric='환산점수',co=v[1],c70=v[3],note='충원발표는 인원으로 해석하지 않음'))
 save('tu',out)

if __name__=='__main__':
 for fn in [pusan,kyungnam,cup,deu,tu_extra]:
  if not sys.argv[1:] or fn.__name__ in sys.argv[1:]:fn()
 (CACHE/'buk-pdf-review.json').write_text(json.dumps(REVIEW,ensure_ascii=False,indent=2),encoding='utf8')
