"""Parse public university-supplied Adiga result tables, with explicit header checks.
Older source-format discrepancies remain in raw columns and a review ledger.
"""
from normalize_incheon_adiga import htmlgrid
from normalize_national import *
from bs4 import BeautifulSoup

ROSTER=json.loads((CACHE/'daegu-roster.json').read_text(encoding='utf8'))
REVIEW=[];ABSENT=[];AUDIT=[];DUPLICATES=[];EXCLUDED=[]
# These legacy titles are split into bare text nodes, outside the usual paragraphs.
REGULAR_TITLES={('kumoh',2024,36):'일반학생전형',('kumoh',2024,37):'농어촌학생전형',
 ('yu',2024,50):'일반학생전형',('yu',2024,51):'지역인재전형',('yu',2024,52):'군사학특별전형',
 ('yu',2025,60):'일반학생전형',('yu',2025,61):'지역인재전형',('yu',2025,62):'군사학특별전형'}
def number(x):
 x=compact(x).replace(',','').replace(':1','')
 return x if re.fullmatch(r'\d+(?:\.\d+)?',x) else ''
def positive(x):return bool(number(x)) and float(number(x))>0
def labels(g,h):return [' / '.join(dict.fromkeys(v[j] for v in g[:h] if v[j])) for j in range(len(g[0]))]
def prevtext(t):
 out=[]
 for e in t.previous_elements:
  if getattr(e,'name',None) in ['p','h3','h4','h5','strong'] and not e.find_parent('table') and not e.find('table'):
   z=clean(e.get_text(' ',strip=True))
   if z and len(z)<160:out.append(z)
   if len(out)==12:break
 return out

def campus(slug,unit):
 if slug!='dyu-yeongju':return True
 # Explicit Yeongju departments, checked against the admission-office campus tables.
 return any(z in compact(unit) for z in ['철도운전','철도차량','철도건설','철도자율','스마트건축','스마트기계','간호','디지털콘텐츠'])

def emit(key,slug,u,y,rd,pg,unit,loc,labs,v,kwargs,metric,notes):
 if not campus(slug,unit):return None
 if slug=='dyu-yeongju':u='동양대학교(영주)';notes+='; 영주 모집단위만 수록; 동두천 별도'
 if slug=='gknu':notes+='; 2024·2025 결과의 당시 교명은 국립안동대학교; 통합 후 현 교명으로 묶음'
 if slug=='knu':
  notes+='; 대구·상주 통합 공개표; 원문에서 캠퍼스 구분이 없는 행은 임의 지정하지 않음'
 for k in ['cut_50','cut_70']:
  x=kwargs.get(k,'');n=number(x)
  if n and ((metric=='교과등급' and not 1<=float(n)<=9) or (metric=='백분위' and not 0<float(n)<=100)):
   if float(n)>0:REVIEW.append({'source':key,'location':loc,'program':pg,'unit':unit,'issue':f'{k} 범위 외 원문 {x}; 표준 컷 공란','source_url':json.loads((CACHE/(key+'.meta.json')).read_text(encoding='utf8'))['url']})
   n='';notes+='; 범위 밖 컷은 원문 열에만 보존'
  if n and float(n)==0:n=''
  kwargs[k]=n
 for k in ['quota','applicants','competition_rate','fill_count']:
  if k in kwargs:kwargs[k]=number(kwargs[k])
 return row(key,u,y,rd,pg,compact(unit),loc,**kwargs,cut_other=pairs(labs,v),metric=metric,basis='최종등록자; 대학별 공개표 기준',grade_system='9' if metric=='교과등급' else '',note='draft; 대학 제공 어디가 공식 공개자료; '+notes)

def older(slug,u,y):
 key=f'{slug}-adiga-{y}';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');out=[]
 for ti,t in enumerate(s.find_all('table')):
  tx=compact(t.get_text())
  if '70%' not in tx or not ('경쟁률' in tx or '충원' in tx):continue
  g=htmlgrid(t)
  if compact(g[0][0]) not in ['모집단위','구분','전형명']:continue
  h=next((i for i,v in enumerate(g) if compact(v[0]) not in ['모집단위','구분','전형명','']),len(g))
  if h==len(g):continue
  labs=labels(g,h);cl=[compact(x) for x in labs];reg=g[0][0]=='구분';uc=1 if reg else 0
  qcols=[j for j,x in enumerate(cl) if '모집인원' in x]
  if not qcols:continue
  q=next((j for j in qcols if '최종' in cl[j]),qcols[0])
  co=next((j for j,x in enumerate(cl) if '경쟁률' in x),None)
  ap=next((j for j,x in enumerate(cl) if '지원인원' in x),None)
  pg=g[0][2 if reg else 1];ctx=prevtext(t)
  if reg and '전형' not in pg:
   pg=next((re.sub(r'^\[.*?\]\s*','',z) for z in ctx if '전형' in z and ('수능위주' in z or '성인학습자전형' in z or '특성화고졸재직자전형' in z) and len(z)<95),'수능위주(원문 전형명 미표기)')
  # Source copied the previous table header; the immediately preceding title gives the correct route.
  note='50%·70% 원문 열 구분; 충원합격순위는 인원에 넣지 않음'
  if (slug,y,ti) in REGULAR_TITLES:
   pg=REGULAR_TITLES[slug,y,ti];note+='; 표 바로 앞 본문 제목으로 전형명 확인'
  if slug=='gimcheon':
   title=next((z for z in ctx if re.search(r'\[\s*202[45]\s*학년도\s*\]',z)),None)
   if title and '전형' in title:
    title=re.sub(r'^\[.*?\]\s*','',title)
    if title!=pg:note+='; 본문 제목으로 전형명 보정(표 머리말 '+pg+')';pg=title
  if '○' in pg:pg='교과(원문 전형명 미기재)';note+='; 원문 ○○○ 전형으로 세부 전형 확정 불가'
  typ='수능' if reg else '종합' if (len(g[0]) in [6,7] and '환산' not in ''.join(cl)) or '종합' in pg else '실기' if '실기' in pg or '특기자' in pg else '교과'
  if slug=='gimcheon' and not reg:typ='교과'
  if slug=='dongguk-wise' and y==2025 and not reg:typ='종합' if ti<20 else '교과'
  grade=[j for j,x in enumerate(cl) if '학생부등급' in x]
  conv=[j for j,x in enumerate(cl) if ('환산' in x and ('50%' in x or '70%' in x))]
  chosen=grade if grade else conv;metric='교과등급' if grade else '환산점수'
  cuts={n:next((j for j in chosen if str(n)+'%' in cl[j]),None) for n in [50,70]}
  # Two different component scores (document/interview) are never collapsed into one cut.
  if any(sum(str(n)+'%' in cl[j] for j in chosen)>1 for n in [50,70]):cuts={50:None,70:None};note+='; 서류·면접 등 복수 점수는 원문 열에만 보존'
  nrows=0
  for ri,v in enumerate(g[h:],h+1):
   if slug=='yu' and y==2024 and ti==50 and ri in [34,35]:
    assert v[1] in ['의예과','약학부'] and v[q]=='15',(ri,v)
    EXCLUDED.append({'university':u,'result_year':str(y),'program':pg,'recruit_unit':v[1],
     'issue':'일반학생 표에 지역인재 수치가 반복됨; 별도 지역인재 표만 수록. 원문 총점 810/800 불일치(입학처 총점 810)',
     'source_url':json.loads((CACHE/(key+'.meta.json')).read_text(encoding='utf8'))['url'],
     'source_page':f'{key} / HTML 표{ti+1} 행{ri}','raw_columns':labs,'raw_values':v})
    continue
   if not v[uc] or '합계' in v[uc] or not any(positive(v[j]) for j in range(len(v)) if j!=uc):continue
   if not number(v[q]) and not any(positive(v[j]) for j in range(q+1,len(v))):continue
   program=pg;unit=v[uc];nt=note
   if g[0][0]=='전형명' or slug=='handong':program=unit;unit='전체 모집단위(전형별 공개)';nt+='; 모집단위 칸에 기재된 전형명을 전형으로 이동; 학과별 복제 안 함'
   if reg:program=clean(v[0])+' '+program
   if slug=='gknu' and compact(v[0])=="(‘25)":continue # repeated year annotation, not a recruitment unit
   if reg and (grade or '학생부90%' in compact(pg)):typ='교과'
   if slug=='dongguk-wise' and y==2025 and ti==12:nt+='; 별도 의예과 표의 전형명이 앞 표와 같아 원문 표 번호로 구분; 세부 지역 확정 보류'
   if slug=='yu' and y==2024 and ti==51:nt+='; 원문 총점 800과 입학처 총점 810 불일치 확인 필요; 70% 원문 값 유지'
   kw={'admission_type':typ,'quota':v[q],'competition_rate':v[co] if co is not None else '', 'applicants':v[ap] if ap is not None else ''}
   for n,j in cuts.items():kw[f'cut_{n}']=v[j] if j is not None else ''
   # A per-program summary explicitly labels this as a count, not a last-admit rank.
   fc=next((j for j,x in enumerate(cl) if '충원합격인원' in x),None)
   if fc is not None:kw['fill_count']=v[fc]
   if any('참고' in z or '비공개' in z for z in v):nt+='; 원문 일부 통계 비공개/전형별 공개 참고'
   rowmetric=metric
   if reg and not grade and not any(positive(kw.get(z,'')) for z in ['cut_50','cut_70']):
    pc=next((j for j,x in enumerate(cl) if '백분위' in x and '70%' in x),None)
    if pc is not None and positive(v[pc]) and float(number(v[pc]))<=100:kw['cut_70']=v[pc];rowmetric='백분위'
   if slug=='dhu' and not reg:
    kw.update(cut_50='',cut_70='');nt+='; 입학처는 평균·90%컷으로 공개한 값이 어디가 50%·70% 열에 반복되어 표준 컷 사용 보류; 원문은 cut_other 보존'
   r=emit(key,slug,u,y,'정시' if reg else '수시',program,unit,f'HTML 표{ti+1} 행{ri}',labs,v,kw,rowmetric,nt)
   if r:out.append(r);nrows+=1
  AUDIT.append({'key':key,'table':ti+1,'header_rows':h,'rows_in_source':len(g)-h,'emitted_rows':nrows,'program':pg,'columns':labs})
 return out

def canon(x):
 x=compact(x)
 for z in ['학생부','수능위주','교과','종합','전형','일반학생','일반전형','(정원외)','정원외']:
  x=x.replace(z,'일반' if z=='일반학생' else '')
 return re.sub(r'[^가-힣A-Za-z0-9ⅠⅡⅢ]','',x)

def supplements(slug,rows):
 p=ROOT/(slug+'.csv')
 if not p.exists():
  for r in rows:r['note']+='; 입학처 미확보/미수록 자료 보충'
  return rows
 existing=list(csv.DictReader(p.open(encoding='utf-8-sig')));out=[]
 for r in rows:
  unit=compact(r['recruit_unit']);pg=canon(r['program'])
  matches=[o for o in existing if o['result_year']==r['result_year'] and o['round']==r['round'] and (compact(o['recruit_unit'])==unit or slug=='handong') and o['admission_type']==r['admission_type'] and canon(o['program'])==pg]
  if matches and not any(r[c] and not any(o[c] and o['metric']==r['metric'] for o in matches) for c in ['cut_50','cut_70']):
   DUPLICATES.append({'slug':slug,'reason':'입학처 행 존재; 새 50%·70%컷 없음','row':r});continue
  r['note']+='; 입학처 행 보완(미수록 컷)' if matches else '; 입학처 미수록 전형·모집단위 보충(명칭이 다른 행은 출처별 확인)'
  out.append(r)
 return out

def newer(slug,u):
 out=[]
 for suffix in ['20','30','40']:
  key=f'{slug}-adiga-2026-{suffix}';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(s.find_all('table'),1):
   pg=clean(t.find_previous(['h3','h4','h5','strong','p']).get_text(' ',strip=True));g=htmlgrid(t);labs=labels(g,3);reg=suffix=='40';assert len(g[0])==(31 if reg else 12),(key,ti,len(g[0]))
   nrows=0
   for ri,v in enumerate(g[3:],4):
    sup='; '.join(dict.fromkeys(z for z in v if '미제출 사유' in z))
    stats=v[7:9]+v[9:11] if not reg else v[7:9]+v[17:18]+v[28:29]
    if not positive(v[4]) and not positive(v[5]) and not any(positive(z) for z in stats):
     ABSENT.append({'source':key,'table':ti,'row':ri,'round':v[0],'program':pg,'unit':v[1],'reason':sup or '모집·경쟁률·성적 유효수치 없음'});continue
    rd='정시' if '정시' in v[0] else '수시' if '수시' in v[0] else clean(v[0]);assert rd,(key,v)
    metric='환산점수' if reg else '교과등급';c50,c70=v[7:9] if reg else v[9:11]
    kw=dict(admission_type='수능' if reg else '종합' if suffix=='20' else '교과',quota=v[4],competition_rate=v[5],fill_count=v[6],cut_50=c50,cut_70=c70)
    # Where only percentiles are published, retain that explicit scale instead.
    if reg and not any(positive(z) for z in [c50,c70]) and any(positive(v[j]) for j in [17,28]):kw.update(cut_50=v[17],cut_70=v[28]);metric='백분위'
    note='2027 안내의 2026 결과; 모집시기는 각 행 구분을 따름; 충원인원은 원문 표제 그대로; '+sup
    if number(v[4])=='0' and any(positive(z) for z in stats):note+='; 모집인원 0과 성적 병기 원문 확인 필요'
    rawlabs=[];rawvalues=[]
    for lab,z in zip(labs,v):
     if '미제출 사유' not in z:rawlabs.append(lab);rawvalues.append(z)
    r=emit(key,slug,u,2026,rd,(v[0]+' ' if rd=='정시' else '')+pg,v[1],f'HTML 표{ti} 행{ri}',rawlabs,rawvalues,kw,metric,note)
    if r:out.append(r);nrows+=1
   AUDIT.append({'key':key,'table':ti,'header_rows':3,'rows_in_source':len(g)-3,'emitted_rows':nrows,'program':pg,'columns':labs})
 return out

def main():
 for d in ROSTER:
  slug=d['slug'];u=re.sub(r'\[.*?\]','',d['unvNm'])
  if slug=='dnue':continue # complete, visually checked official PDF tables take precedence
  if sys.argv[1:] and slug not in sys.argv[1:]:continue
  out=[]
  for y in [2024,2025]:
   if slug=='knu' and y==2025:continue # original workbook contains more detailed result tables
   out+=older(slug,u,y)
  out+=newer(slug,u)
  save(slug+'-adiga',supplements(slug,out))
 for name,data in [('table-audit',AUDIT),('unavailable',ABSENT),('source-review',REVIEW),('office-precedence',DUPLICATES),('excluded-source-duplicates',EXCLUDED)]:
  (CACHE/f'daegu-adiga-{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
 print('audit',len(AUDIT),'unavailable',len(ABSENT),'review',len(REVIEW))
if __name__=='__main__':main()
